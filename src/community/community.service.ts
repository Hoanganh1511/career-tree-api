import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommunityAccessService } from 'src/common/community-access.service';
// import { CreateCommunityDto } from './dto/create-community.dto';
import { Prisma } from 'generated/prisma/client';
import { CreateCommunityDto } from './dto/create-community.dto';

const memberUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  email: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    private access: CommunityAccessService,
  ) {}

  // Danh sach community cho trang "Đi cùng mọi người" - tra ve CA community
  // rieng tu (khong chi cong khai): community rieng tu van phai kham pha
  // duoc, chi khac o cho tham gia se thanh yeu cau PENDING cho quan tri
  // duyet thay vi vao ngay (xem CommunityMemberService.requestJoin) - "rieng
  // tu" nghia la rieng tu VE NOI DUNG BEN TRONG, khong phai an ca su ton tai
  // cua community. Kem "isMember" TINH RIENG cho tung user dang goi.
  async listPublic(userId: string) {
    const communities = await this.prisma.community.findMany({
      include: {
        channels: { where: { status: 'APPROVED' }, select: { id: true } },
        // 3 thanh vien APPROVED gan nhat - dung ve avatar stack o card danh
        // sach (giong tinh than "members" cua Series cu, nhung la du lieu
        // that thay vi mock).
        members: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'asc' },
          take: 3,
          include: { user: { select: { avatarUrl: true } } },
        },
        owner: {
          select: {
            name: true,
            username: true,
            avatarUrl: true,
            verified: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const communityIds = communities.map((c) => c.id);
    // Lay CA membership PENDING lan APPROVED - de phan biet 3 trang thai
    // nguoi xem tren tung card: "none" (chua co gi), "pending" (da xin vao
    // cong dong rieng tu, cho duyet), "member" (da la thanh vien). Frontend
    // dua vao day de quyet dinh nut (Tham gia / Xin tham gia / Đang chờ
    // duyệt / Vào cộng đồng) - viec vao cong dong CHI qua nut, khong cho
    // click thang vao card.
    const memberships = await this.prisma.communityMember.findMany({
      where: {
        userId,
        communityId: { in: communityIds },
        status: { in: ['PENDING', 'APPROVED'] },
      },
      select: { communityId: true, status: true },
    });
    const statusByCommunity = new Map(
      memberships.map((m) => [m.communityId, m.status]),
    );

    return communities.map((c) => {
      const memberStatus = statusByCommunity.get(c.id);
      const viewerStatus =
        memberStatus === 'APPROVED'
          ? 'member'
          : memberStatus === 'PENDING'
            ? 'pending'
            : 'none';
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        isPublic: c.isPublic,
        memberCount: c.memberCount,
        channelCount: c.channels.length,
        viewerStatus,
        memberAvatars: c.members
          .map((m) => m.user.avatarUrl)
          .filter((url): url is string => !!url),
        owner: c.owner
          ? {
              name: c.owner.name,
              username: c.owner.username,
              avatarUrl: c.owner.avatarUrl,
              verified: c.owner.verified,
            }
          : null,
      };
    });
  }

  async findBySlug(userId: string, slug: string) {
    const community = await this.prisma.community.findUnique({
      where: { slug },
      include: {
        channels: {
          where: { status: 'APPROVED' },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!community) return null;

    const membership = await this.access.getMembership(community.id, userId);
    const isApprovedMember = membership?.status === 'APPROVED';
    if (!community.isPublic && !isApprovedMember) return null;

    const isModerator =
      isApprovedMember &&
      (membership.role === 'OWNER' || membership.role === 'ADMIN');
    return {
      id: community.id,
      slug: community.slug,
      name: community.name,
      description: community.description,
      isPublic: community.isPublic,
      memberCount: community.memberCount,
      channels: community.channels,
      viewer: {
        isMember: isApprovedMember,
        role: isApprovedMember ? membership.role : null,
        status: membership?.status ?? null,
      },
      joinRequests: isModerator
        ? await this.prisma.communityMember.findMany({
            where: { communityId: community.id, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: memberUserSelect } },
          })
        : [],
      // Kenh do thanh vien thuong de xuat, cho quan tri duyet - chi tra ve
      // cho moderator (giong joinRequests o tren), nguoi thuong khong thay.
      channelRequests: isModerator
        ? await this.prisma.channel.findMany({
            where: { communityId: community.id, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            include: {
              requestedBy: {
                select: { name: true, username: true, avatarUrl: true },
              },
            },
          })
        : [],
      adminStats: [] as { label: string; value: string }[],
    };
  }

  async create(userId: string, dto: CreateCommunityDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const community = await tx.community.create({
          data: {
            slug: dto.slug,
            name: dto.name,
            description: dto.description,
            isPublic: dto.isPublic ?? true,
            ownerId: userId,
            memberCount: 1,
          },
        });

        await tx.communityMember.create({
          data: {
            communityId: community.id,
            userId,
            role: 'OWNER',
            status: 'APPROVED',
          },
        });

        // Cong dong moi tao luon co san 1 kenh "Sảnh" - tranh trang thai
        // rong "chua co kenh nao" ngay sau khi tao xong.
        await tx.channel.create({
          data: {
            communityId: community.id,
            slug: 'sanh',
            name: 'Sảnh',
            group: 'KNOWLEDGE',
            description: 'Kênh trò chuyện chung của cộng đồng.',
            status: 'APPROVED',
            requestedById: userId,
          },
        });

        return community;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Slug này đã được sử dụng, hãy chọn slug khác',
        );
      }
      throw e;
    }
  }
}
