import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostCommentDto } from './dto/create-post-comment.dto';
// Import THANG authorSelect tu post.service.ts (khong qua NestJS DI, giong
// cach post-collection.service.ts da lam) - tranh viet lai select mapper
// tac gia lan thu 3.
import { authorSelect } from '../post/post.service';

const commentAuthorSelect = authorSelect;

function toApiComment(
  c: {
    id: string;
    postId: string;
    parentId: string | null;
    content: string;
    likesCount: number;
    createdAt: Date;
    authorId: string;
    author: {
      id: string;
      username: string | null;
      name: string;
      avatarUrl: string | null;
      verified: boolean;
    };
  },
  viewerId: string,
  likedCommentIds: Set<string>,
) {
  return {
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    content: c.content,
    likesCount: c.likesCount,
    createdAt: c.createdAt.toISOString(),
    author: {
      username: c.author.username ?? c.author.id,
      name: c.author.name,
      avatarUrl: c.author.avatarUrl ?? '',
      verified: c.author.verified,
    },
    isOwner: c.authorId === viewerId,
    likedByMe: likedCommentIds.has(c.id),
  };
}

@Injectable()
export class PostCommentService {
  constructor(private prisma: PrismaService) {}

  // 404 (khong phai 403) neu khong ton tai HOAC khong phai chu - dung
  // convention repo (xem document.service.ts/post-collection.service.ts).
  private async assertOwner(commentId: string, userId: string) {
    const c = await this.prisma.postComment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });
    if (!c || c.authorId !== userId) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }
  }

  // Lay TOAN BO comment (phang, khong cursor) - UI tu cat "Xem them" phia
  // client, khong can phan trang that cho quy mo hien tai.
  async findAllForPost(viewerId: string, postId: string) {
    const rows = await this.prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: commentAuthorSelect } },
    });
    const likedRows = await this.prisma.postCommentLike.findMany({
      where: { userId: viewerId, commentId: { in: rows.map((r) => r.id) } },
      select: { commentId: true },
    });
    const likedCommentIds = new Set(likedRows.map((r) => r.commentId));
    return rows.map((r) => toApiComment(r, viewerId, likedCommentIds));
  }

  async create(userId: string, postId: string, dto: CreatePostCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException(`Post ${postId} not found`);

    if (dto.parentId) {
      // Chan reply "nhay bai" - comment cha phai THUOC DUNG postId nay.
      const parent = await this.prisma.postComment.findUnique({
        where: { id: dto.parentId },
        select: { postId: true },
      });
      if (!parent || parent.postId !== postId) {
        throw new NotFoundException(`Comment ${dto.parentId} not found`);
      }
    }

    const [comment] = await this.prisma.$transaction([
      this.prisma.postComment.create({
        data: {
          postId,
          authorId: userId,
          content: dto.content,
          parentId: dto.parentId,
        },
        include: { author: { select: commentAuthorSelect } },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);
    return toApiComment(comment, userId, new Set());
  }

  async remove(userId: string, commentId: string) {
    await this.assertOwner(commentId, userId);
    // Dem so reply TRUC TIEP truoc khi xoa (DB cascade se xoa luon) de tru
    // Post.commentsCount dung (1 + so reply) - UI chi cho reply sau 1 cap
    // nen khong can dem de quy sau hon.
    const comment = await this.prisma.postComment.findUniqueOrThrow({
      where: { id: commentId },
      select: {
        postId: true,
        _count: { select: { replies: true } },
      },
    });
    const totalRemoved = 1 + comment._count.replies;
    await this.prisma.$transaction([
      this.prisma.postComment.delete({ where: { id: commentId } }),
      this.prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: totalRemoved } },
      }),
    ]);
    return { ok: true };
  }

  async toggleLike(userId: string, commentId: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException(`Comment ${commentId} not found`);

    const existing = await this.prisma.postCommentLike.findUnique({
      where: { userId_commentId: { userId, commentId } },
    });
    if (existing) {
      const [, updated] = await this.prisma.$transaction([
        this.prisma.postCommentLike.delete({
          where: { userId_commentId: { userId, commentId } },
        }),
        this.prisma.postComment.update({
          where: { id: commentId },
          data: { likesCount: { decrement: 1 } },
          select: { likesCount: true },
        }),
      ]);
      return { liked: false, likesCount: updated.likesCount };
    }
    const [, updated] = await this.prisma.$transaction([
      this.prisma.postCommentLike.create({ data: { userId, commentId } }),
      this.prisma.postComment.update({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } },
        select: { likesCount: true },
      }),
    ]);
    return { liked: true, likesCount: updated.likesCount };
  }
}
