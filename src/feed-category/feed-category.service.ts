import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

// Muc co dinh o CUOI danh sach nhom cha, gom nhung bai KHONG gan nganh nghe
// nao (vd story chia se hanh trinh hoc). KHONG phai record that trong DB -
// xu ly hoan toan o tang service nay va o PostService.findAll (client chon
// muc nay thi loc careerCategoryId: null).
export const UNCATEGORIZED_SLUG = 'chia-se-chung';
const UNCATEGORIZED_NAME = 'Chia sẻ chung';

// Cua so tinh "nhom con dang hoat dong" - nhom khong co bai nao trong khoang
// nay se bi an khoi cay filter.
const ACTIVE_WINDOW_DAYS = 7;

export type FeedCategoryNode = {
  slug: string;
  name: string;
  postCount: number;
};

export type FeedCategoryGroupNode = FeedCategoryNode & {
  icon: string | null;
  categories: FeedCategoryNode[];
};

@Injectable()
export class FeedCategoryService {
  constructor(private prisma: PrismaService) {}

  // Cay 2 tang dung cho bo loc feed. CHI tra nhom con co it nhat 1 bai trong
  // 7 ngay gan nhat (an nhom rong), va nhom cha bi an luon neu moi con deu
  // rong. Thu tu nhom cha do TONG so bai 7 ngay quyet dinh (nhom soi dong
  // nhat len dau), `orderIndex` chi la tie-breaker khi bang nhau.
  async findTree(): Promise<FeedCategoryGroupNode[]> {
    const since = new Date(
      Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const [groups, grouped, uncategorizedCount] = await Promise.all([
      this.prisma.careerCategoryGroup.findMany({
        include: { categories: { orderBy: { orderIndex: 'asc' } } },
      }),
      this.prisma.post.groupBy({
        by: ['careerCategoryId'],
        where: { createdAt: { gte: since }, careerCategoryId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.post.count({
        where: { createdAt: { gte: since }, careerCategoryId: null },
      }),
    ]);

    const countByCategoryId = new Map<string, number>();
    for (const row of grouped) {
      if (row.careerCategoryId) {
        countByCategoryId.set(row.careerCategoryId, row._count._all);
      }
    }

    const sorted = groups
      .map((group) => {
        const categories = group.categories
          .map((category) => ({
            slug: category.slug,
            name: category.name,
            postCount: countByCategoryId.get(category.id) ?? 0,
            orderIndex: category.orderIndex,
          }))
          .filter((category) => category.postCount > 0);

        return {
          slug: group.slug,
          name: group.name,
          icon: group.icon,
          orderIndex: group.orderIndex,
          postCount: categories.reduce((sum, c) => sum + c.postCount, 0),
          categories: categories.map(({ slug, name, postCount }) => ({
            slug,
            name,
            postCount,
          })),
        };
      })
      .filter((group) => group.categories.length > 0)
      .sort((a, b) => b.postCount - a.postCount || a.orderIndex - b.orderIndex);

    // `orderIndex` chi phuc vu buoc sort o tren, khong tra ra ngoai API.
    const tree: FeedCategoryGroupNode[] = sorted.map((group) => ({
      slug: group.slug,
      name: group.name,
      icon: group.icon,
      postCount: group.postCount,
      categories: group.categories,
    }));

    if (uncategorizedCount > 0) {
      tree.push({
        slug: UNCATEGORIZED_SLUG,
        name: UNCATEGORIZED_NAME,
        icon: null,
        postCount: uncategorizedCount,
        categories: [],
      });
    }

    return tree;
  }
}
