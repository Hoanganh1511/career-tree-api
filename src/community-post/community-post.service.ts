import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityAccessService } from '../common/community-access.service';
import { Prisma } from '../../generated/prisma/client';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { UpdateCommunityPostDto } from './dto/update-community-post.dto';
import { toApiCategory, toDbCategory } from './category.util';

export const postAuthorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  verified: true,
} satisfies Prisma.UserSelect;

type PostWithAuthor = Prisma.CommunityPostGetPayload<{
  include: { author: { select: typeof postAuthorSelect } };
}>;

type TopReplyRow = {
  content: string;
  createdAt: Date;
  author: { name: string; avatarUrl: string | null };
};

@Injectable()
export class CommunityPostService {
  constructor(
    private prisma: PrismaService,
    private access: CommunityAccessService,
  ) {}

  async findAllForChannel(
    userId: string,
    channelId: string,
    params: { cursor?: string; limit?: number },
  ) {
    await this.access.assertChannelViewable(channelId, userId);
    const { cursor, limit = 20 } = params;

    const posts = await this.prisma.communityPost.findMany({
      where: { channelId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: { author: { select: postAuthorSelect } },
    });
    const postIds = posts.map((p) => p.id);

    const reactionRows = await this.prisma.reaction.groupBy({
      by: ['postId', 'emoji'],
      where: { postId: { in: postIds } },
      _count: true,
    });
    const reactionsByPost = new Map<
      string,
      { emoji: string; count: number }[]
    >();
    for (const row of reactionRows) {
      if (!row.postId) continue;
      const list = reactionsByPost.get(row.postId) ?? [];
      list.push({ emoji: row.emoji, count: row._count });
      reactionsByPost.set(row.postId, list);
    }

    const topLevelComments = await this.prisma.comment.findMany({
      where: { postId: { in: postIds }, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: postAuthorSelect } },
    });
    const topReplyByPost = new Map<string, TopReplyRow>();
    for (const c of topLevelComments) {
      if (!topReplyByPost.has(c.postId)) topReplyByPost.set(c.postId, c);
    }

    return posts.map((post) =>
      this.toApiPost(
        post,
        reactionsByPost.get(post.id) ?? [],
        topReplyByPost.get(post.id),
      ),
    );
  }

  async create(userId: string, channelId: string, dto: CreateCommunityPostDto) {
    const { communityId } = await this.access.assertChannelMember(
      channelId,
      userId,
    );
    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.communityPost.create({
        data: {
          communityId,
          channelId,
          authorId: userId,
          title: dto.title,
          content: dto.content,
          category: dto.category ? toDbCategory(dto.category) : undefined,
          data: dto.data as Prisma.InputJsonValue,
        },
        include: { author: { select: postAuthorSelect } },
      });
      await tx.channel.update({
        where: { id: channelId },
        data: { messageCount: { increment: 1 } },
      });
      return created;
    });
    return this.toApiPost(post, [], undefined);
  }

  async update(userId: string, postId: string, dto: UpdateCommunityPostDto) {
    await this.access.assertPostOwner(postId, userId);
    const post = await this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category ? toDbCategory(dto.category) : undefined,
        data: dto.data as Prisma.InputJsonValue,
      },
      include: { author: { select: postAuthorSelect } },
    });
    return this.toApiPost(post, [], undefined);
  }

  async remove(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { channelId: true, authorId: true, communityId: true },
    });
    if (!post) throw new NotFoundException(`Post ${postId} not found`);
    if (post.authorId !== userId) {
      await this.access.assertCommunityModerator(post.communityId, userId);
    }
    await this.prisma.$transaction([
      this.prisma.communityPost.delete({ where: { id: postId } }),
      this.prisma.channel.update({
        where: { id: post.channelId },
        data: { messageCount: { decrement: 1 } },
      }),
    ]);
  }

  async setPinned(userId: string, postId: string, isPinned: boolean) {
    await this.access.assertPostModerator(postId, userId);
    const post = await this.prisma.communityPost.update({
      where: { id: postId },
      data: { isPinned },
      include: { author: { select: postAuthorSelect } },
    });
    return this.toApiPost(post, [], undefined);
  }

  private toApiPost(
    post: PostWithAuthor,
    reactions: { emoji: string; count: number }[],
    topReply?: TopReplyRow,
  ) {
    const data = (post.data ?? {}) as Record<string, unknown>;
    return {
      id: post.id,
      channelId: post.channelId,
      author: {
        username: post.author.username ?? post.author.id,
        name: post.author.name,
        avatarUrl: post.author.avatarUrl ?? '',
        verified: post.author.verified,
      },
      title: post.title,
      content: post.content,
      category: post.category ? toApiCategory(post.category) : null,
      isPinned: post.isPinned,
      commentsCount: post.commentsCount,
      createdAt: post.createdAt.toISOString(),
      reactions,
      topReply: topReply
        ? {
            author: {
              name: topReply.author.name,
              avatarUrl: topReply.author.avatarUrl ?? '',
            },
            content: topReply.content,
            createdAt: topReply.createdAt.toISOString(),
          }
        : null,
      ...data,
    };
  }
}
