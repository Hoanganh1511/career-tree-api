import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { authorSelect, toApiPost } from '../post/post.service';

export type ContestTab = 'popular' | 'trending' | 'latest';

const TRENDING_WINDOW_DAYS = 7;

@Injectable()
export class ContestService {
  constructor(private prisma: PrismaService) {}

  // Danh sach chu de/cuoc thi. Sap theo status truoc (dang nhan bai -> dang
  // cham -> da ket thuc, dung thu tu enum ContestStatus) roi den moi nhat.
  findAll() {
    return this.prisma.contest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findBySlug(slug: string) {
    const contest = await this.prisma.contest.findUnique({ where: { slug } });
    if (!contest) throw new NotFoundException(`Contest ${slug} khong ton tai`);
    return contest;
  }

  // Bai viet thuoc 1 contest, sap xep theo tab dang chon.
  // - popular: nhieu like nhat moi thoi diem.
  // - trending: chi xet bai trong 7 ngay gan nhay, sap theo tuong tac
  //   (like + comment). Day la sap xep CUC BO trong 1 contest, KHONG phai
  //   "thuat toan Trending" cua feed dang duoc thiet ke rieng.
  // - latest: moi nhat truoc.
  async findPosts(slug: string, tab: ContestTab = 'popular', limit = 30) {
    const contest = await this.findBySlug(slug);
    const since = new Date(
      Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const links = await this.prisma.postContest.findMany({
      where: {
        contestId: contest.id,
        ...(tab === 'trending' ? { post: { createdAt: { gte: since } } } : {}),
      },
      include: { post: { include: { author: { select: authorSelect } } } },
      // Prisma khong sap duoc theo bieu thuc (like + comment) nen tab
      // "trending" lay ve roi sap trong bo nho - tap da bi gioi han san boi
      // dieu kien 7 ngay + 1 contest nen khong lo tai nang.
      ...(tab === 'popular'
        ? { orderBy: { post: { likesCount: 'desc' } }, take: limit }
        : {}),
      ...(tab === 'latest'
        ? { orderBy: { post: { createdAt: 'desc' } }, take: limit }
        : {}),
    });

    const posts = links.map((link) => link.post);
    if (tab === 'trending') {
      posts.sort(
        (a, b) =>
          b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount),
      );
      return posts.slice(0, limit).map(toApiPost);
    }
    return posts.map(toApiPost);
  }

  // Cot "Bai viet lien quan" (25% ben phai trang chi tiet): lay bai CUNG
  // nganh nghe pho bien nhat cua contest nhung CHUA thuoc contest do.
  async findRelated(slug: string, limit = 6) {
    const contest = await this.findBySlug(slug);

    const links = await this.prisma.postContest.findMany({
      where: { contestId: contest.id },
      select: { postId: true, post: { select: { careerCategoryId: true } } },
    });
    const postIds = links.map((l) => l.postId);

    // Nganh nghe xuat hien nhieu nhat trong cac bai cua contest nay.
    const countByCategory = new Map<string, number>();
    for (const link of links) {
      const id = link.post.careerCategoryId;
      if (id) countByCategory.set(id, (countByCategory.get(id) ?? 0) + 1);
    }
    const topCategoryId = [...countByCategory.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    const posts = await this.prisma.post.findMany({
      where: {
        id: { notIn: postIds },
        ...(topCategoryId ? { careerCategoryId: topCategoryId } : {}),
      },
      orderBy: { likesCount: 'desc' },
      take: limit,
      include: { author: { select: authorSelect } },
    });
    return posts.map(toApiPost);
  }
}
