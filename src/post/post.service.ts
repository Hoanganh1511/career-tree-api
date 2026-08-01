import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, PostCategory } from '../../generated/prisma/client';
import { CreatePostDto } from './dto/create-post.dto';
import { toApiKind, toDbKind } from './post-kind.util';

const authorSelect = {
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
function toApiPost(post: PostWithAuthor) {
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
    cursor?: string;
    limit?: number;
    authorUsername?: string;
    category?: string;
    kind?: string[];
  }) {
    const { cursor, limit = 30, authorUsername, category, kind } = params;
    const posts = await this.prisma.post.findMany({
      where: {
        ...(authorUsername ? { author: { username: authorUsername } } : {}),
        ...(category ? { category: category as PostCategory } : {}),
        ...(kind?.length ? { kind: { in: kind.map(toDbKind) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: { author: { select: authorSelect } },
    });
    return posts.map(toApiPost);
  }

  async create(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        kind: toDbKind(dto.kind),
        category: dto.category,
        data: dto.data as Prisma.InputJsonValue,
      },
      include: { author: { select: authorSelect } },
    });
    return toApiPost(post);
  }
}
