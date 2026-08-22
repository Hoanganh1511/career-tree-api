import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { SyncUserDto } from './dto/sync-user.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
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
      const user = await tx.user.upsert({
        where: { googleId: dto.googleId },
        // avatarUrl luon dong bo lai theo Google (nguon duy nhat hien tai) -
        // username thi KHONG, chi sinh 1 LAN duy nhat khi con null (xem duoi),
        // tranh ghi de neu sau nay them tinh nang tu doi username rieng.
        update: { email: dto.email, name: dto.name, avatarUrl: dto.avatarUrl },
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
      postCount: target.profile?.postCount ?? 0,
      isSelf: viewerId === target.id,
      isFollowing: isFollowing !== null,
    };
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

  // Gate cho modal chao mung 3 buoc tren /home (WelcomeOnboardingModal.tsx) -
  // ban gon chi can 1 field, khong dung lai userSelect day du.
  async getSelf(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { onboardedAt: true },
    });
    return { onboardedAt: user.onboardedAt?.toISOString() ?? null };
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
