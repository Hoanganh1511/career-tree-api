import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, PostCategory } from '../../generated/prisma/client';
import { CreatePostDto } from './dto/create-post.dto';
import { toApiKind, toDbKind } from './post-kind.util';
import { toApiVisibility, toDbVisibility } from './post-visibility.util';
import { UNCATEGORIZED_SLUG } from '../feed-category/feed-category.service';

// Export de ContestService tra ve post dung CUNG shape voi GET /posts (khong
// viet lai mapper thu 2 de roi lech field).
export const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  verified: true,
} satisfies Prisma.UserSelect;

type PostWithAuthor = Prisma.PostGetPayload<{
  include: { author: { select: typeof authorSelect } };
}>;

// Chuyen 1 row DB thanh dung shape Post['kind'-specific] o frontend - spread
// `data` (Json) RA NGOAI CUNG nen field rieng tung kind (content/title/...)
// nam ngang hang voi id/kind/author/createdAt/stats, dung format PostCommon
// & {kind, ...uniqueFields} ma frontend dang doc. Khong con `following`/
// `timeAgo`: `following` khong con noi nao doc (bo tab Following tu lau),
// `timeAgo` thay bang `createdAt` that - frontend tu tinh qua
// formatRelativeTime() thay vi nhan chuoi "2h" dung san.
export function toApiPost(post: PostWithAuthor) {
  return {
    id: post.id,
    kind: toApiKind(post.kind),
    createdAt: post.createdAt.toISOString(),
    author: {
      // username luon co gia tri sau khi UserService backfill luc sync (xem
      // user.service.ts) - fallback id o day chi la luoi an toan, khong ky
      // vong xay ra tren du lieu that.
      username: post.author.username ?? post.author.id,
      name: post.author.name,
      avatarUrl: post.author.avatarUrl ?? '',
      verified: post.author.verified,
    },
    stats: {
      likes: post.likesCount,
      comments: post.commentsCount,
      reposts: post.repostsCount,
    },
    category: post.category,
    // Compose Giai doan 2 - cot THAT (sibling voi cac field tren, KHONG nam
    // trong `data`) - xem CreatePostDto.
    visibility: toApiVisibility(post.visibility),
    commentsEnabled: post.commentsEnabled,
    likesEnabled: post.likesEnabled,
    searchable: post.searchable,
    ...(post.data as Record<string, unknown>),
  };
}

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  // Feed la CONG KHAI voi moi user da dang nhap (khong gan voi 1 workspace cu
  // the nhu Node/Card) nen khong co OwnershipService.assertXOwner nao o day -
  // guard toan cuc (JwtAuthGuard) da dam bao phai dang nhap la du.
  async findAll(params: {
    viewerId: string;
    cursor?: string;
    limit?: number;
    authorUsername?: string;
    category?: string[];
    kind?: string[];
    careerCategory?: string[];
    careerGroup?: string;
  }) {
    const {
      viewerId,
      cursor,
      limit = 30,
      authorUsername,
      category,
      kind,
      careerCategory,
      careerGroup,
    } = params;
    const posts = await this.prisma.post.findMany({
      where: {
        ...(authorUsername ? { author: { username: authorUsername } } : {}),
        ...(category?.length
          ? { category: { in: category as PostCategory[] } }
          : {}),
        ...(kind?.length ? { kind: { in: kind.map(toDbKind) } } : {}),
        // "chia-se-chung" khong phai category that trong DB (xem
        // FeedCategoryService) - no nghia la "bai khong gan nganh nghe nao".
        ...(careerCategory?.length
          ? careerCategory.includes(UNCATEGORIZED_SLUG)
            ? { careerCategoryId: null }
            : { careerCategory: { slug: { in: careerCategory } } }
          : {}),
        ...(careerGroup
          ? { careerCategory: { group: { slug: careerGroup } } }
          : {}),
        // Compose Giai doan 2 - mac dinh CHI PUBLIC (an DRAFT/LIMITED khoi
        // moi listing, dung Unlisted cho LIMITED), TRU bai cua CHINH nguoi
        // xem (vd tren trang ca nhan cua ho, thay ca draft/gioi han cua
        // minh) - khong can lookup username rieng, so authorId truc tiep.
        OR: [{ visibility: 'PUBLIC' }, { authorId: viewerId }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: { author: { select: authorSelect } },
    });
    return posts.map(toApiPost);
  }

  // Dung cho trang chi tiet 1 bai viet (enggo: /p/[id]) - tra ve null (khong
  // throw) khi khong tim thay, de controller tu quyet dinh ma HTTP status
  // (404) thay vi service gia dinh san. LIMITED van mo cho BAT KY ai co link
  // (dung Unlisted) - CHI chan DRAFT neu nguoi xem khong phai tac gia (tra
  // ve null giong het "khong tim thay", khong lo lieu bai draft co ton tai).
  async findOne(id: string, viewerId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { author: { select: authorSelect } },
    });
    if (!post) return null;
    if (post.visibility === 'DRAFT' && post.authorId !== viewerId) return null;
    return toApiPost(post);
  }

  async create(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        kind: toDbKind(dto.kind),
        category: dto.category,
        data: dto.data as Prisma.InputJsonValue,
        visibility: dto.visibility ? toDbVisibility(dto.visibility) : undefined,
        commentsEnabled: dto.commentsEnabled,
        likesEnabled: dto.likesEnabled,
        searchable: dto.searchable,
      },
      include: { author: { select: authorSelect } },
    });
    return toApiPost(post);
  }
}
