import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityAccessService } from '../common/community-access.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { postAuthorSelect } from '../community-post/community-post.service';

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private access: CommunityAccessService,
  ) {}

  async findAllForPost(
    userId: string,
    postId: string,
    params: { cursor?: string; limit?: number },
  ) {
    await this.access.assertPostViewable(postId, userId);
    const { cursor, limit = 10 } = params;
    return this.prisma.comment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: { author: { select: postAuthorSelect } },
    });
  }

  async create(userId: string, postId: string, dto: CreateCommentDto) {
    await this.access.assertPostMember(postId, userId);
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          postId,
          authorId: userId,
          content: dto.content,
          parentId: dto.parentId,
        },
        include: { author: { select: postAuthorSelect } },
      });
      await tx.communityPost.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      });
      return comment;
    });
  }

  async remove(userId: string, commentId: string) {
    await this.access.assertCommentOwnerOrModerator(commentId, userId);
    const comment = await this.prisma.comment.findUniqueOrThrow({
      where: { id: commentId },
    });
    await this.prisma.$transaction([
      this.prisma.comment.delete({ where: { id: commentId } }),
      this.prisma.communityPost.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);
  }
}
