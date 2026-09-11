import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import {
  toApiCollectionVisibility,
  toDbCollectionVisibility,
} from './post-collection-visibility.util';
import { toApiTopic, toDbTopic } from './post-collection-topic.util';
// Import THANG ham/const export tu post.service.ts (khong qua NestJS DI) -
// tai dung mapper toApiPost + authorSelect cho danh sach bai trong 1 bo suu
// tap, tranh viet lai mapper thu 2. Day la import TS thuong, khong tao vong
// phu thuoc module (PostCollectionModule khong can import PostModule).
import { toApiPost, authorSelect } from '../post/post.service';
import type { PostCollection } from '../../generated/prisma/client';

function toApiCollection(c: PostCollection) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    coverImageUrl: c.coverImageUrl,
    visibility: toApiCollectionVisibility(c.visibility),
    topic: c.topic ? toApiTopic(c.topic) : null,
    postCount: c.postCount,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// Trang kham pha "Bo suu tap cua moi nguoi" (/collections) - can them chu so
// huu + trang thai da theo doi hay chua, khac ban toApiCollection tran cho
// "bo suu tap cua toi"/"bo suu tap 1 nguoi cu the".
function toApiCollectionWithOwner(
  c: PostCollection & {
    user: { id: string; username: string | null; name: string; avatarUrl: string | null; verified: boolean };
  },
  followingOwnerIds: Set<string>,
) {
  return {
    ...toApiCollection(c),
    owner: {
      username: c.user.username ?? c.user.id,
      name: c.user.name,
      avatarUrl: c.user.avatarUrl ?? '',
      verified: c.user.verified,
    },
    isFollowingOwner: followingOwnerIds.has(c.userId),
  };
}

@Injectable()
export class PostCollectionService {
  constructor(private prisma: PrismaService) {}

  // 404 (khong phai 403) neu khong ton tai HOAC khong phai chu - dung
  // convention repo (xem document.service.ts/post.service.ts).
  private async assertOwner(collectionId: string, userId: string) {
    const c = await this.prisma.postCollection.findUnique({
      where: { id: collectionId },
      select: { userId: true },
    });
    if (!c || c.userId !== userId) {
      throw new NotFoundException(`Collection ${collectionId} not found`);
    }
  }

  async create(userId: string, dto: CreateCollectionDto) {
    const c = await this.prisma.postCollection.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        visibility: dto.visibility
          ? toDbCollectionVisibility(dto.visibility)
          : undefined,
        topic: dto.topic ? toDbTopic(dto.topic) : undefined,
      },
    });
    return toApiCollection(c);
  }

  async update(userId: string, id: string, dto: UpdateCollectionDto) {
    await this.assertOwner(id, userId);
    const c = await this.prisma.postCollection.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        coverImageUrl: dto.coverImageUrl,
        visibility: dto.visibility
          ? toDbCollectionVisibility(dto.visibility)
          : undefined,
        topic: dto.topic ? toDbTopic(dto.topic) : undefined,
      },
    });
    return toApiCollection(c);
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(id, userId);
    await this.prisma.postCollection.delete({ where: { id } });
    return { ok: true };
  }

  async listMine(userId: string) {
    const rows = await this.prisma.postCollection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toApiCollection);
  }

  // Bo suu tap CONG KHAI cua 1 user - tru khi viewer chinh la chu (thay ca
  // Rieng tu), cung tinh than PostService.findOne xu ly DRAFT.
  async listByUsername(viewerId: string, username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(`User ${username} not found`);
    const isSelf = user.id === viewerId;
    const rows = await this.prisma.postCollection.findMany({
      where: { userId: user.id, ...(isSelf ? {} : { visibility: 'PUBLIC' }) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toApiCollection);
  }

  async getDetail(viewerId: string, id: string) {
    const c = await this.prisma.postCollection.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Collection ${id} not found`);
    const isOwner = c.userId === viewerId;
    if (c.visibility === 'PRIVATE' && !isOwner) {
      throw new NotFoundException(`Collection ${id} not found`);
    }
    const items = await this.prisma.postCollectionItem.findMany({
      where: { collectionId: id },
      orderBy: { addedAt: 'desc' },
      include: { post: { include: { author: { select: authorSelect } } } },
    });
    return {
      ...toApiCollection(c),
      isOwner,
      posts: items.map((i) => toApiPost(i.post)),
    };
  }

  // Idempotent - bam "Luu" 2 lan khong loi, chi im lang bo qua neu da co.
  async addItem(userId: string, collectionId: string, postId: string) {
    await this.assertOwner(collectionId, userId);
    const existing = await this.prisma.postCollectionItem.findUnique({
      where: { collectionId_postId: { collectionId, postId } },
    });
    if (existing) return { ok: true };
    await this.prisma.$transaction([
      this.prisma.postCollectionItem.create({ data: { collectionId, postId } }),
      this.prisma.postCollection.update({
        where: { id: collectionId },
        data: { postCount: { increment: 1 } },
      }),
    ]);
    return { ok: true };
  }

  async removeItem(userId: string, collectionId: string, postId: string) {
    await this.assertOwner(collectionId, userId);
    const existing = await this.prisma.postCollectionItem.findUnique({
      where: { collectionId_postId: { collectionId, postId } },
    });
    if (!existing) return { ok: true };
    await this.prisma.$transaction([
      this.prisma.postCollectionItem.delete({
        where: { collectionId_postId: { collectionId, postId } },
      }),
      this.prisma.postCollection.update({
        where: { id: collectionId },
        data: { postCount: { decrement: 1 } },
      }),
    ]);
    return { ok: true };
  }

  // Widget "Luu vao bo suu tap" (ArticleActionBar.tsx) - 1 lan goi tra ve
  // TOAN BO bo suu tap cua chinh minh + da chua postId nay chua, tranh N+1
  // (1 request/bo suu tap) tu frontend.
  async getMembership(userId: string, postId: string) {
    const collections = await this.prisma.postCollection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        items: { where: { postId }, select: { postId: true } },
      },
    });
    return collections.map((c) => ({
      collectionId: c.id,
      title: c.title,
      contains: c.items.length > 0,
    }));
  }

  // Trang kham pha /collections - luon PUBLIC (khong bao gio lo Rieng tu cua
  // ai), scope "following" loc theo danh sach dang follow that (UserFollow,
  // tai dung cach truy van cua FollowService.getFollowing thay vi goi qua
  // HTTP noi bo). facets tinh tren TOAN BO PUBLIC (khong phu thuoc filter
  // hien tai) de sidebar luon hien dung tong so, giong UX loc chuan.
  async listPublic(
    viewerId: string,
    params: {
      scope?: 'all' | 'following';
      topic?: string;
      sort?: 'newest' | 'most-posts' | 'az';
      search?: string;
      cursor?: string;
      limit?: number;
    },
  ) {
    const { scope = 'all', topic, sort = 'newest', search, cursor } = params;
    const limit = params.limit ?? 20;

    const followingRows = await this.prisma.userFollow.findMany({
      where: { followerId: viewerId },
      select: { followeeId: true },
    });
    const followingIds = followingRows.map((r) => r.followeeId);
    const followingSet = new Set(followingIds);

    const where: Prisma.PostCollectionWhereInput = {
      visibility: 'PUBLIC',
      ...(scope === 'following' ? { userId: { in: followingIds } } : {}),
      ...(topic ? { topic: toDbTopic(topic) } : {}),
      ...(search
        ? { title: { contains: search, mode: 'insensitive' } }
        : {}),
    };
    const orderBy: Prisma.PostCollectionOrderByWithRelationInput =
      sort === 'most-posts'
        ? { postCount: 'desc' }
        : sort === 'az'
          ? { title: 'asc' }
          : { createdAt: 'desc' };

    const rows = await this.prisma.postCollection.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
            verified: true,
          },
        },
      },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    const [topicGroups, allCount, followingCount] = await Promise.all([
      this.prisma.postCollection.groupBy({
        by: ['topic'],
        where: { visibility: 'PUBLIC' },
        _count: { _all: true },
      }),
      this.prisma.postCollection.count({ where: { visibility: 'PUBLIC' } }),
      this.prisma.postCollection.count({
        where: { visibility: 'PUBLIC', userId: { in: followingIds } },
      }),
    ]);
    // topic null (chua chon) gop chung vao bucket "other" - dung tinh than
    // "nullable = coi nhu Khac" da ghi trong schema.
    const topicCounts = new Map<string, number>();
    for (const g of topicGroups) {
      const key = g.topic ? toApiTopic(g.topic) : 'other';
      topicCounts.set(key, (topicCounts.get(key) ?? 0) + g._count._all);
    }

    return {
      items: page.map((c) => toApiCollectionWithOwner(c, followingSet)),
      nextCursor,
      facets: {
        topics: Array.from(topicCounts, ([topic, count]) => ({ topic, count })),
        allCount,
        followingCount,
      },
    };
  }
}
