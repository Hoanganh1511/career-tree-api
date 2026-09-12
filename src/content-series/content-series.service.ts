import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Danh sach entry tra ve o overview/sidebar - KHONG kem contentMarkdown/faq
// (payload rieng cua 1 bai) de trang tong quan + nav khong phai tai toan bo
// noi dung moi Entry trong Series cung luc.
const entrySummarySelect = {
  id: true,
  slug: true,
  orderIndex: true,
  title: true,
  subtitle: true,
  icon: true,
  categoryId: true,
  readTimeMinutes: true,
};

@Injectable()
export class ContentSeriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.contentSeries.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { entries: true } } },
    });
  }

  // Trang tong quan (Overview): thong tin Series + toan bo category/entry
  // (FLAT, kem parentId/categoryId) - frontend tu dung de dung cay nav +
  // "Where this fits", giong pattern buildCommentTree o enggo (dung cay tu
  // danh sach phang thay vi server tra san cay long nhau).
  async findOverview(slug: string) {
    const series = await this.prisma.contentSeries.findUnique({
      where: { slug },
      include: {
        categories: { orderBy: { orderIndex: 'asc' } },
        entries: { select: entrySummarySelect, orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!series) throw new NotFoundException(`Series ${slug} khong ton tai`);
    return series;
  }

  // Trang 1 Entry: noi dung day du + Prev/Next (tinh tu orderIndex, ranh
  // buoc #6 "thu tu Entry duy nhat trong Series" dam bao khong trung) +
  // placement (danh sach category cua Series de FE tu highlight category
  // chua entry nay - xem "Where this fits" trong dac ta).
  async findEntry(seriesSlug: string, entrySlug: string) {
    // Kem theo `entries` (summary) giong findOverview - trang 1 Entry VAN
    // phai render duoc sidebar nav day du cay category/entry (xem dac ta muc
    // 3: "Hien thi tren TAT CA cac trang cua Series"), khong chi rieng trang
    // Overview.
    const series = await this.prisma.contentSeries.findUnique({
      where: { slug: seriesSlug },
      include: {
        categories: { orderBy: { orderIndex: 'asc' } },
        entries: { select: entrySummarySelect, orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!series) throw new NotFoundException(`Series ${seriesSlug} khong ton tai`);

    const entry = await this.prisma.contentSeriesEntry.findUnique({
      where: { seriesId_slug: { seriesId: series.id, slug: entrySlug } },
    });
    if (!entry) throw new NotFoundException(`Entry ${entrySlug} khong ton tai`);

    const [prev, next, totalCount] = await Promise.all([
      this.prisma.contentSeriesEntry.findFirst({
        where: { seriesId: series.id, orderIndex: { lt: entry.orderIndex } },
        orderBy: { orderIndex: 'desc' },
        select: entrySummarySelect,
      }),
      this.prisma.contentSeriesEntry.findFirst({
        where: { seriesId: series.id, orderIndex: { gt: entry.orderIndex } },
        orderBy: { orderIndex: 'asc' },
        select: entrySummarySelect,
      }),
      this.prisma.contentSeriesEntry.count({ where: { seriesId: series.id } }),
    ]);

    return { series, entry, prev, next, totalCount };
  }
}
