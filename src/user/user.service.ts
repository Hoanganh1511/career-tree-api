import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { SyncUserDto } from './dto/sync-user.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FollowService } from 'src/follow/follow.service';

@Injectable()
export class UserService {
  private readonly userSelect = {
    id: true,
    username: true,
    name: true,
    avatarUrl: true,
    verified: true,
    createdAt: true,
    followerCount: true,
    followingCount: true,
    profile: {
      select: {
        bio: true,
        coverImageUrl: true,
        location: true,
        websiteUrl: true,
        pronouns: true,
        role: true,
        postCount: true,
      },
    },
  } satisfies Prisma.UserSelect;

  // Ban gon cho ket qua tim kiem (dropdown header) - khong can profile/follow
  // count day du nhu userSelect, giong tinh than miniUserSelect trong
  // FollowService.
  private readonly searchUserSelect = {
    id: true,
    username: true,
    name: true,
    avatarUrl: true,
    verified: true,
  } satisfies Prisma.UserSelect;

  constructor(
    private prisma: PrismaService,
    private followService: FollowService,
  ) {}

  async syncUser(dto: SyncUserDto): Promise<{ id: string; username: string }> {
    return this.prisma.$transaction(async (tx) => {
      // avatarUrl CHI dat 1 LAN DUY NHAT luc TAO tai khoan (create) - moi lan
      // dang nhap sau do (update) KHONG bao gio dong toi avatarUrl nua, du
      // dang null hay khong. Truoc day co 1 nhanh "backfill" (dat lai tu
      // Google neu avatarUrl dang null) danh cho user cu tao truoc khi tinh
      // nang nay ton tai - nhung nhanh do vo tinh coi "null vi nguoi dung
      // CHU DICH bam Xóa ảnh" (xem ProfileImageViewer.tsx) giong het "null vi
      // chua tung co anh", nen lan dang nhap Google ke tiep se AM THAM dien
      // lai avatar cu ma nguoi dung vua xoa - sai voi nguyen tac "1 nguon
      // duy nhat, chi nguoi dung tu quyet dinh avatar cua minh qua app".
      const user = await tx.user.upsert({
        where: { googleId: dto.googleId },
        update: { email: dto.email, name: dto.name },
        create: {
          googleId: dto.googleId,
          email: dto.email,
          name: dto.name,
          avatarUrl: dto.avatarUrl,
        },
      });

      // User dong bo qua Google KHONG co san username (Google chi tra
      // googleId/email/name/picture) - can 1 gia tri de dung trong URL
      // profile (/u/:username) va Post.author. Chi sinh khi con null, khong
      // ghi de - dung slug tu phan truoc @ cua email, doi ky tu la/so, them
      // hau to so neu trung.
      let username = user.username;
      if (!username) {
        const base =
          dto.email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') || 'user';
        let candidate = base;
        let attempt = 0;
        while (
          await tx.user.findUnique({
            where: { username: candidate },
            select: { id: true },
          })
        ) {
          attempt += 1;
          candidate = `${base}${attempt}`;
        }
        await tx.user.update({
          where: { id: user.id },
          data: { username: candidate },
        });
        username = candidate;
      }

      // Tra ca username (khong chi id) - frontend can gia tri nay de dua vao
      // JWT session (xem auth.ts) roi dung xay cac link "/u/:username",
      // "/workspace/:username" tren header, thay vi phai goi them 1 API rieng
      // hoac (bug da xay ra truoc day) fallback nham sang du lieu demo tinh.
      return { id: user.id, username };
    });
  }

  // "Dang xuat khoi moi thiet bi" - danh dau moc thoi gian, moi token noi bo
  // phat hanh truoc moc nay se bi JwtAuthGuard tu choi. Khong xoa session nao
  // ca (khong co session store de xoa), chi lam chung het hieu luc.
  async revokeAllSessions(userId: string): Promise<{ revokedAt: string }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { tokensValidAfter: new Date() },
      select: { tokensValidAfter: true },
    });
    return { revokedAt: user.tokensValidAfter!.toISOString() };
  }

  async canViewProfile(viewerId: string, targetId: string): Promise<boolean> {
    if (viewerId === targetId) return true;
    const blocked = await this.followService.isBlockedEitherDirection(
      viewerId,
      targetId,
    );
    return !blocked;
  }
  async getProfileByUsername(viewerId: string, username: string) {
    const target = await this.prisma.user.findUnique({
      where: { username },
      select: this.userSelect,
    });
    if (!target) throw new NotFoundException(`User ${username} not found`);

    const canView = await this.canViewProfile(viewerId, target.id);
    if (!canView) throw new NotFoundException(`User ${username} not found`);

    const isFollowing = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followeeId: { followerId: viewerId, followeeId: target.id },
      },
      select: { followerId: true },
    });

    return {
      id: target.id,
      username: target.username,
      displayName: target.name,
      avatarUrl: target.avatarUrl ?? '',
      isVerified: target.verified,
      createdAt: target.createdAt.toISOString(),
      followerCount: target.followerCount,
      followingCount: target.followingCount,
      bio: target.profile?.bio ?? null,
      coverImageUrl: target.profile?.coverImageUrl ?? null,
      location: target.profile?.location ?? null,
      websiteUrl: target.profile?.websiteUrl ?? null,
      pronouns: target.profile?.pronouns ?? null,
      role: target.profile?.role ?? null,
      postCount: target.profile?.postCount ?? 0,
      isSelf: viewerId === target.id,
      isFollowing: isFollowing !== null,
    };
  }

  // Redesign Settings - PATCH /users/me. displayName/username nam tren
  // User, con lai (bio/location/websiteUrl/pronouns/role) nam tren
  // UserProfile - upsert vi user cu co the chua tung co row UserProfile nao
  // (bang nay tao lazy, khong phai luc nao cung ton tai san cho moi User).
  // Bat loi trung username (P2002) roi ban ra ConflictException do frontend
  // hien thong bao ro rang, thay vi 500 chung chung.
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    try {
      await this.prisma.$transaction(async (tx) => {
        if (
          dto.displayName !== undefined ||
          dto.username !== undefined ||
          dto.avatarUrl !== undefined
        ) {
          await tx.user.update({
            where: { id: userId },
            data: {
              name: dto.displayName,
              username: dto.username,
              avatarUrl: dto.avatarUrl,
            },
          });
        }
        const hasProfileFields =
          dto.bio !== undefined ||
          dto.location !== undefined ||
          dto.websiteUrl !== undefined ||
          dto.pronouns !== undefined ||
          dto.role !== undefined ||
          dto.coverImageUrl !== undefined;
        if (hasProfileFields) {
          await tx.userProfile.upsert({
            where: { userId },
            create: {
              userId,
              bio: dto.bio,
              location: dto.location,
              websiteUrl: dto.websiteUrl,
              pronouns: dto.pronouns,
              role: dto.role,
              coverImageUrl: dto.coverImageUrl,
            },
            update: {
              bio: dto.bio,
              location: dto.location,
              websiteUrl: dto.websiteUrl,
              pronouns: dto.pronouns,
              role: dto.role,
              coverImageUrl: dto.coverImageUrl,
            },
          });
        }
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Tên người dùng đã được sử dụng');
      }
      throw err;
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { username: true },
    });
    return this.getProfileByUsername(userId, user.username!);
  }

  // Tim theo ten hien thi/username (mot phan, khong phan biet hoa thuong) VA
  // email/id (KHOP CHINH XAC, khong "contains") - email/id la thong tin
  // dinh danh chinh xac, cho phep do mot phan se ho tro do-doan (enumeration)
  // ai co tai khoan tu 1 mau email/id ngan. Ket qua LOAI TRU chinh viewer va
  // 2 chieu block (giong quy uoc canViewProfile o tren) - khong hien nguoi da
  // block/bi block trong ket qua tim kiem.
  async search(viewerId: string, q: string, cursor?: string, limit = 10) {
    const query = q.trim();
    if (query.length < 2) return { items: [], nextCursor: null };

    const blocks = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    });
    const excludedIds = new Set<string>([viewerId]);
    blocks.forEach((b) =>
      excludedIds.add(b.blockerId === viewerId ? b.blockedId : b.blockerId),
    );

    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: [...excludedIds] },
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { email: { equals: query, mode: 'insensitive' } },
          { id: query },
        ],
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: this.searchUserSelect,
    });

    const hasMore = users.length > limit;
    const page = hasMore ? users.slice(0, limit) : users;

    return {
      items: page.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.name,
        avatarUrl: u.avatarUrl ?? '',
        isVerified: u.verified,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  // Gate cho modal chao mung 3 buoc tren /home (WelcomeOnboardingModal.tsx),
  // gio kiem luon isAdmin - tai dung cho DailyDiaryAccessModal.tsx (FE) xac
  // thuc quyen truoc khi dieu huong sang /u/:username/daily-diary (AdminGuard
  // o BE van chan lai doc lap, day chi la buoc UX o FE).
  async getSelf(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { onboardedAt: true, isAdmin: true },
    });
    return {
      onboardedAt: user.onboardedAt?.toISOString() ?? null,
      isAdmin: user.isAdmin,
    };
  }

  // Hoan tat/bo qua modal chao mung. CO firstChapterTitle -> tao THAT 1
  // Workspace + 1 KnowledgeGroup dau tien (user moi toanh luon co 0
  // Workspace - xem syncUser(), khong tu tao) - viet thang qua tx thay vi
  // goi lai WorkspaceService/KnowledgeGroupService (chung khong nhan
  // Prisma.TransactionClient tu ngoai truyen vao), cung 1 tien le voi
  // ChatService.addGroupMembers. KHONG firstChapterTitle (dong modal som o
  // buoc 1/2) -> chi danh dau onboardedAt, khong tao gi ca.
  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    return this.prisma.$transaction(async (tx) => {
      let workspaceId: string | null = null;
      let groupId: string | null = null;
      if (dto.firstChapterTitle) {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { name: true },
        });
        const workspace = await tx.workspace.create({
          data: { ownerId: userId, name: `Không gian của ${user.name}` },
        });
        const group = await tx.knowledgeGroup.create({
          data: {
            workspaceId: workspace.id,
            name: dto.firstChapterTitle,
          },
        });
        workspaceId = workspace.id;
        groupId = group.id;
      }
      await tx.user.update({
        where: { id: userId },
        data: { onboardedAt: new Date(), onboardingGoal: dto.goal },
      });
      return { workspaceId, groupId };
    });
  }
}
