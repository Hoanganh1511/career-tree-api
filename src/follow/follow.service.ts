import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class FollowService {
  private readonly miniUserSelect = {
    id: true,
    username: true,
    name: true,
    avatarUrl: true,
    verified: true,
  } satisfies Prisma.UserSelect;
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  //   Câu hỏi cần trả lời: "có block giữa 2 người này không ?"
  //   Cần biết ai block ai, hoặc cả 2 chiều trong 1 query thay vì 2 query riêng
  //

  async isBlockedEitherDirection(
    userA: string,
    userB: string,
  ): Promise<boolean> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
      select: { blockerId: true },
    });
    return block !== null;
  }

  async followUser(followerId: string, followeeUsername: string) {
    const followee = await this.prisma.user.findUnique({
      where: { username: followeeUsername },
      select: { id: true },
    });
    if (!followee)
      throw new NotFoundException(`User ${followeeUsername} not found`);
    if (followee.id === followerId) {
      throw new BadRequestException('Không thể tự follow chính mình');
    }

    if (await this.isBlockedEitherDirection(followerId, followee.id)) {
      throw new NotFoundException(`User ${followeeUsername} not found`);
    }

    let follow;
    try {
      follow = await this.prisma.$transaction(async (tx) => {
        const created = await tx.userFollow.create({
          data: { followerId, followeeId: followee.id, status: 'ACTIVE' },
        });
        await tx.user.update({
          where: { id: followerId },
          data: {
            followingCount: { increment: 1 },
          },
        });
        await tx.user.update({
          where: { id: followee.id },
          data: { followerCount: { increment: 1 } },
        });
        return created;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Đã follow người này rồi');
      }
      throw e;
    }

    // Best-effort - xem comment tuong tu trong
    // KnowledgeGroupCollaboratorService.requestCollab(): follow (da tao xong
    // o tren) khong duoc phep that bai chi vi buoc tao thong bao gap loi.
    try {
      await this.notifications.create({
        recipientId: followee.id,
        actorId: followerId,
        type: 'FOLLOW',
      });
    } catch {
      // best-effort
    }

    return follow;
  }

  async unfollowUser(followerId: string, followeeUsername: string) {
    const followee = await this.prisma.user.findUnique({
      where: {
        username: followeeUsername,
      },
      select: { id: true },
    });
    if (!followee)
      throw new NotFoundException(`User ${followeeUsername} not found`);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.userFollow.delete({
          where: {
            followerId_followeeId: { followerId, followeeId: followee.id },
          },
        });
        await tx.user.update({
          where: { id: followerId },
          data: { followingCount: { decrement: 1 } },
        });
        await tx.user.update({
          where: { id: followee.id },
          data: {
            followerCount: {
              decrement: 1,
            },
          },
        });
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Bạn chưa follow người này');
      }
    }
  }
  async blockUser(blockerId: string, blockedUsername: string) {
    const blocked = await this.prisma.user.findUnique({
      where: { username: blockedUsername },
      select: { id: true },
    });
    if (!blocked)
      throw new NotFoundException(`User ${blockedUsername} not foudn`);
    if (blocked.id === blockerId) {
      throw new BadRequestException('Không thể tự block chính mình');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.userBlock.create({
          data: {
            blockerId,
            blockedId: blocked.id,
          },
        });

        const removed = await tx.userFollow.findMany({
          where: {
            OR: [
              { followerId: blockerId, followeeId: blocked.id },
              { followerId: blocked.id, followeeId: blockerId },
            ],
          },
          select: {
            followerId: true,
            followeeId: true,
          },
        });

        if (removed.length > 0) {
          await tx.userFollow.deleteMany({
            where: {
              OR: [
                { followerId: blockerId, followeeId: blocked.id },
                {
                  followerId: blocked.id,
                  followeeId: blockerId,
                },
              ],
            },
          });
          for (const follow of removed) {
            await tx.user.update({
              where: {
                id: follow.followeeId,
              },
              data: { followingCount: { decrement: 1 } },
            });
            await tx.user.update({
              where: {
                id: follow.followeeId,
              },
              data: {
                followerCount: { decrement: 1 },
              },
            });
          }
        }
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Đã block người này rồi.');
      }
      throw e;
    }
  }
  async unblockUser(blockerId: string, blockedUsername: string) {
    const blocked = await this.prisma.user.findUnique({
      where: { username: blockedUsername },
      select: {
        id: true,
      },
    });
    if (!blocked)
      throw new NotFoundException(`User ${blockedUsername} not foudn`);

    try {
      await this.prisma.userBlock.delete({
        where: {
          blockerId_blockedId: { blockerId, blockedId: blocked.id },
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Bạn chưa block người này');
      }
    }
  }

  async getFollowing(
    viewerId: string,
    username: string,
    cursor?: string,
    limit = 30,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(`User ${username} not found`);

    const rows = await this.prisma.userFollow.findMany({
      where: { followerId: user.id },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: {
              followerId_followeeId: {
                followerId: user.id,
                followeeId: cursor,
              },
            },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: 'desc' },
      select: { followee: { select: this.miniUserSelect } },
    });

    return this.toMiniUserPage(
      viewerId,
      rows.map((r) => r.followee),
      limit,
    );
  }

  async getFollowers(
    viewerId: string,
    username: string,
    cursor?: string,
    limit = 30,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(`User ${username} not found`);

    const rows = await this.prisma.userFollow.findMany({
      where: { followeeId: user.id },
      take: limit + 1,
      ...(cursor
        ? {
            cursor: {
              followerId_followeeId: {
                followerId: cursor,
                followeeId: user.id,
              },
            },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: 'desc' },
      select: { follower: { select: this.miniUserSelect } },
    });

    return this.toMiniUserPage(
      viewerId,
      rows.map((r) => r.follower),
      limit,
    );
  }

  private async toMiniUserPage(
    viewerId: string,
    users: {
      id: string;
      username: string | null;
      name: string;
      avatarUrl: string | null;
      verified: boolean;
    }[],
    limit: number,
  ) {
    const hasMore = users.length > limit;
    const page = hasMore ? users.slice(0, limit) : users;
    const ids = page.map((u) => u.id);

    const viewerFollowing = await this.prisma.userFollow.findMany({
      where: { followerId: viewerId, followeeId: { in: ids } },
      select: { followeeId: true },
    });

    const followingSet = new Set(viewerFollowing.map((f) => f.followeeId));

    return {
      items: page.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.name,
        avatarUrl: u.avatarUrl ?? '',
        isVerified: u.verified,
        isFollowing: followingSet.has(u.id),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }
}
