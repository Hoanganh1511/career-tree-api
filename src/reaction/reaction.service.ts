import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityAccessService } from '../common/community-access.service';

@Injectable()
export class ReactionService {
  constructor(
    private prisma: PrismaService,
    private access: CommunityAccessService,
  ) {}

  async togglePostReaction(userId: string, postId: string, emoji: string) {
    await this.access.assertPostMember(postId, userId);
    const existing = await this.prisma.reaction.findUnique({
      where: { userId_postId_emoji: { userId, postId, emoji } },
    });
    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.reaction.delete({ where: { id: existing.id } });
        await tx.communityPost.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        });
      } else {
        await tx.reaction.create({ data: { userId, postId, emoji } });
        await tx.communityPost.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        });
      }
    });
    return this.aggregate({ postId });
  }

  async toggleCommentReaction(
    userId: string,
    commentId: string,
    emoji: string,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { postId: true },
    });
    if (!comment) throw new NotFoundException(`Comment ${commentId} not found`);
    await this.access.assertPostMember(comment.postId, userId);

    const existing = await this.prisma.reaction.findUnique({
      where: { userId_commentId_emoji: { userId, commentId, emoji } },
    });
    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.reaction.create({ data: { userId, commentId, emoji } });
    }
    return this.aggregate({ commentId });
  }

  private async aggregate(target: { postId: string } | { commentId: string }) {
    const rows = await this.prisma.reaction.groupBy({
      by: ['emoji'],
      where: target,
      _count: true,
    });
    return rows.map((r) => ({ emoji: r.emoji, count: r._count }));
  }
}
