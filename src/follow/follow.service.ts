import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class FollowService {
  constructor(private prisma: PrismaService) {}

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

    try {
      return await this.prisma.$transaction(async (tx) => {
        const follow = await tx.userFollow.create({
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
        return follow;
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
  }

  async unfollowUser(followerId: string, followeeUsername: string) {}
  async blockUser(blockerId: string, blockedUsername: string) {}
  async unblockUser(blockerId: string, blockedUsername: string) {}
}
