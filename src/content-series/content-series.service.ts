import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentSeriesDto } from './dto/create-content-series.dto';
import { UpdateContentSeriesDto } from './dto/update-content-series.dto';
import { CreateContentSeriesCategoryDto } from './dto/create-content-series-category.dto';
import { UpdateContentSeriesCategoryDto } from './dto/update-content-series-category.dto';
import { CreateContentSeriesEntryDto } from './dto/create-content-series-entry.dto';
import { UpdateContentSeriesEntryDto } from './dto/update-content-series-entry.dto';

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

// Cung cong thuc voi document.service.ts (slugify) - KHONG import chung vi
// 2 module doc lap, tranh dependency cheo chi vi 1 ham thuan tuy nho.
function slugify(input: string): string {
  const base = input
    .replace(/đ/gi, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'muc';
}

// Toc do doc trung binh 200 tu/phut, lam tron len, toi thieu 1 phut - dung
// khi form soan KHONG tu nhap readTimeMinutes (xem CreateContentSeriesEntryDto).
function estimateReadTimeMinutes(markdown: string): number {
  const wordCount = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

// Dich chuyen 1 phan tu len/xuong trong 1 mang (thay the drag-and-drop cho
// MVP soan Series) - tra ve cap [currentId, neighborId] can hoan doi
// orderIndex, hoac null neu da o dau/cuoi (khong lam gi).
function findMoveNeighbor<T extends { id: string; orderIndex: number }>(
  items: T[],
  currentId: string,
  direction: 'up' | 'down',
): T | null {
  const sorted = [...items].sort((a, b) => a.orderIndex - b.orderIndex);
  const index = sorted.findIndex((i) => i.id === currentId);
  if (index === -1) return null;
  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  return sorted[neighborIndex] ?? null;
}

@Injectable()
export class ContentSeriesService {
  constructor(private prisma: PrismaService) {}

  // Kem categories/entries (summary) - trang danh sach FE hien preview vai
  // entry dau tien cua moi Series (dac ta the Series kieu "matt pocock
  // skills": 1 category + vai bai lien quan ben canh), khong chi ten/mo ta
  // suong nhu truoc.
  findAll() {
    return this.prisma.contentSeries.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { entries: true } },
        categories: { orderBy: { orderIndex: 'asc' } },
        entries: { select: entrySummarySelect, orderBy: { orderIndex: 'asc' } },
      },
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
    if (!series)
      throw new NotFoundException(`Series ${seriesSlug} khong ton tai`);

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

  // ------------------------- Cap 1: Series -------------------------

  private async uniqueSeriesSlug(base: string): Promise<string> {
    const slugBase = slugify(base);
    const taken = await this.prisma.contentSeries.findMany({
      where: { slug: { startsWith: slugBase } },
      select: { slug: true },
    });
    const set = new Set(taken.map((s) => s.slug));
    if (!set.has(slugBase)) return slugBase;
    let i = 2;
    while (set.has(`${slugBase}-${i}`)) i++;
    return `${slugBase}-${i}`;
  }

  async createSeries(dto: CreateContentSeriesDto) {
    const slug = dto.slug
      ? slugify(dto.slug)
      : await this.uniqueSeriesSlug(dto.title);
    return this.prisma.contentSeries.create({
      data: {
        slug,
        title: dto.title,
        description: dto.description,
        authorName: dto.authorName,
        authorAvatarUrl: dto.authorAvatarUrl,
        emailCourseEnabled: dto.emailCourseEnabled ?? false,
        emailCourseTitle: dto.emailCourseTitle,
        emailCourseDescription: dto.emailCourseDescription,
        stats: (dto.stats ?? []) as Prisma.InputJsonValue,
        installTabs: (dto.installTabs ?? []) as Prisma.InputJsonValue,
        externalLinks: (dto.externalLinks ?? []) as Prisma.InputJsonValue,
        shareChannels: dto.shareChannels ?? [
          'x',
          'bluesky',
          'linkedin',
          'copy',
        ],
      },
    });
  }

  async updateSeries(slug: string, dto: UpdateContentSeriesDto) {
    const series = await this.prisma.contentSeries.findUnique({
      where: { slug },
    });
    if (!series) throw new NotFoundException(`Series ${slug} khong ton tai`);
    // Prisma bo qua field co gia tri `undefined` trong `data` - field nao FE
    // khong gui se giu nguyen gia tri cu. `slug` (neu co) duoc tin nguyen,
    // KHONG tu re-slugify lai - day la sua tay co chu dich, khac luc tao moi.
    return this.prisma.contentSeries.update({
      where: { slug },
      data: {
        ...dto,
        stats: dto.stats as Prisma.InputJsonValue | undefined,
        installTabs: dto.installTabs as Prisma.InputJsonValue | undefined,
        externalLinks: dto.externalLinks as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async deleteSeries(slug: string) {
    const series = await this.prisma.contentSeries.findUnique({
      where: { slug },
    });
    if (!series) throw new NotFoundException(`Series ${slug} khong ton tai`);
    await this.prisma.contentSeries.delete({ where: { slug } });
  }

  // ------------------------- Cap 2: Category -------------------------

  private async requireSeriesId(slug: string): Promise<string> {
    const series = await this.prisma.contentSeries.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!series) throw new NotFoundException(`Series ${slug} khong ton tai`);
    return series.id;
  }

  private async uniqueCategorySlug(
    seriesId: string,
    base: string,
  ): Promise<string> {
    const slugBase = slugify(base);
    const taken = await this.prisma.contentSeriesCategory.findMany({
      where: { seriesId, slug: { startsWith: slugBase } },
      select: { slug: true },
    });
    const set = new Set(taken.map((c) => c.slug));
    if (!set.has(slugBase)) return slugBase;
    let i = 2;
    while (set.has(`${slugBase}-${i}`)) i++;
    return `${slugBase}-${i}`;
  }

  async createCategory(
    seriesSlug: string,
    dto: CreateContentSeriesCategoryDto,
  ) {
    const seriesId = await this.requireSeriesId(seriesSlug);
    const slug = dto.slug
      ? slugify(dto.slug)
      : await this.uniqueCategorySlug(seriesId, dto.title);
    const maxOrder = await this.prisma.contentSeriesCategory.aggregate({
      where: { seriesId, parentId: null },
      _max: { orderIndex: true },
    });
    return this.prisma.contentSeriesCategory.create({
      data: {
        seriesId,
        slug,
        title: dto.title,
        colorHex: dto.colorHex,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
    });
  }

  async updateCategory(
    seriesSlug: string,
    categoryId: string,
    dto: UpdateContentSeriesCategoryDto,
  ) {
    const seriesId = await this.requireSeriesId(seriesSlug);
    const category = await this.prisma.contentSeriesCategory.findFirst({
      where: { id: categoryId, seriesId },
    });
    if (!category)
      throw new NotFoundException(`Category ${categoryId} khong ton tai`);
    return this.prisma.contentSeriesCategory.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  // Chan xoa neu con Entry ben trong - tranh mat trang lien ket ngam (Prisma
  // se Cascade xoa that neu bo qua buoc nay), buoc nguoi soan chuyen/xoa het
  // Entry truoc, an toan hon la am tham xoa hang loat.
  async deleteCategory(seriesSlug: string, categoryId: string) {
    const seriesId = await this.requireSeriesId(seriesSlug);
    const category = await this.prisma.contentSeriesCategory.findFirst({
      where: { id: categoryId, seriesId },
      include: { _count: { select: { entries: true, children: true } } },
    });
    if (!category)
      throw new NotFoundException(`Category ${categoryId} khong ton tai`);
    if (category._count.entries > 0 || category._count.children > 0) {
      throw new BadRequestException(
        'Category còn Entry/nhóm con bên trong - chuyển hoặc xoá hết trước khi xoá category.',
      );
    }
    await this.prisma.contentSeriesCategory.delete({
      where: { id: categoryId },
    });
  }

  async moveCategory(
    seriesSlug: string,
    categoryId: string,
    direction: 'up' | 'down',
  ) {
    const seriesId = await this.requireSeriesId(seriesSlug);
    const category = await this.prisma.contentSeriesCategory.findFirst({
      where: { id: categoryId, seriesId },
    });
    if (!category)
      throw new NotFoundException(`Category ${categoryId} khong ton tai`);
    const siblings = await this.prisma.contentSeriesCategory.findMany({
      where: { seriesId, parentId: category.parentId },
    });
    const neighbor = findMoveNeighbor(siblings, categoryId, direction);
    if (!neighbor) return category;
    // Category khong co unique constraint tren orderIndex - hoan doi truc
    // tiep, khong can gia tri tam nhu Entry ben duoi.
    await this.prisma.$transaction([
      this.prisma.contentSeriesCategory.update({
        where: { id: category.id },
        data: { orderIndex: neighbor.orderIndex },
      }),
      this.prisma.contentSeriesCategory.update({
        where: { id: neighbor.id },
        data: { orderIndex: category.orderIndex },
      }),
    ]);
    return this.prisma.contentSeriesCategory.findUniqueOrThrow({
      where: { id: categoryId },
    });
  }

  // ------------------------- Cap 3: Entry -------------------------

  private async uniqueEntrySlug(
    seriesId: string,
    base: string,
  ): Promise<string> {
    const slugBase = slugify(base);
    const taken = await this.prisma.contentSeriesEntry.findMany({
      where: { seriesId, slug: { startsWith: slugBase } },
      select: { slug: true },
    });
    const set = new Set(taken.map((e) => e.slug));
    if (!set.has(slugBase)) return slugBase;
    let i = 2;
    while (set.has(`${slugBase}-${i}`)) i++;
    return `${slugBase}-${i}`;
  }

  async createEntry(seriesSlug: string, dto: CreateContentSeriesEntryDto) {
    const seriesId = await this.requireSeriesId(seriesSlug);
    const category = await this.prisma.contentSeriesCategory.findFirst({
      where: { id: dto.categoryId, seriesId },
    });
    if (!category)
      throw new NotFoundException(`Category ${dto.categoryId} khong ton tai`);

    const slug = dto.slug
      ? slugify(dto.slug)
      : await this.uniqueEntrySlug(seriesId, dto.title);
    const maxOrder = await this.prisma.contentSeriesEntry.aggregate({
      where: { seriesId },
      _max: { orderIndex: true },
    });
    return this.prisma.contentSeriesEntry.create({
      data: {
        seriesId,
        categoryId: dto.categoryId,
        slug,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
        title: dto.title,
        subtitle: dto.subtitle,
        icon: dto.icon,
        source: dto.source,
        contentMarkdown: dto.contentMarkdown,
        installTabs: dto.installTabs as Prisma.InputJsonValue | undefined,
        faq: dto.faq as Prisma.InputJsonValue | undefined,
        readTimeMinutes:
          dto.readTimeMinutes ?? estimateReadTimeMinutes(dto.contentMarkdown),
      },
    });
  }

  async updateEntry(
    seriesSlug: string,
    entryId: string,
    dto: UpdateContentSeriesEntryDto,
  ) {
    const seriesId = await this.requireSeriesId(seriesSlug);
    const entry = await this.prisma.contentSeriesEntry.findFirst({
      where: { id: entryId, seriesId },
    });
    if (!entry) throw new NotFoundException(`Entry ${entryId} khong ton tai`);

    if (dto.categoryId) {
      const category = await this.prisma.contentSeriesCategory.findFirst({
        where: { id: dto.categoryId, seriesId },
      });
      if (!category)
        throw new NotFoundException(`Category ${dto.categoryId} khong ton tai`);
    }

    return this.prisma.contentSeriesEntry.update({
      where: { id: entryId },
      data: {
        categoryId: dto.categoryId,
        title: dto.title,
        subtitle: dto.subtitle,
        icon: dto.icon,
        source: dto.source,
        contentMarkdown: dto.contentMarkdown,
        installTabs: dto.installTabs as Prisma.InputJsonValue | undefined,
        faq: dto.faq as Prisma.InputJsonValue | undefined,
        // readTimeMinutes tu tinh lai NEU sua noi dung ma khong tu ghi de tay
        // trong CUNG request nay - tranh so phut "dinh" sai sau khi sua nhieu.
        readTimeMinutes:
          dto.readTimeMinutes ??
          (dto.contentMarkdown
            ? estimateReadTimeMinutes(dto.contentMarkdown)
            : undefined),
      },
    });
  }

  async deleteEntry(seriesSlug: string, entryId: string) {
    const seriesId = await this.requireSeriesId(seriesSlug);
    const entry = await this.prisma.contentSeriesEntry.findFirst({
      where: { id: entryId, seriesId },
    });
    if (!entry) throw new NotFoundException(`Entry ${entryId} khong ton tai`);
    await this.prisma.contentSeriesEntry.delete({ where: { id: entryId } });
  }

  // Doi cho VOI 1 Entry KHAC lien ke trong TOAN BO thu tu doc cua Series
  // (khong chi trong cung category) - khop voi cach Prev/Next/counter "01/25"
  // tinh theo orderIndex toan cuc (xem findEntry). Dung gia tri tam (-1) vi
  // @@unique([seriesId, orderIndex]) khong cho 2 dong trung orderIndex ke ca
  // tam thoi giua chung 1 transaction.
  async moveEntry(
    seriesSlug: string,
    entryId: string,
    direction: 'up' | 'down',
  ) {
    const seriesId = await this.requireSeriesId(seriesSlug);
    const entry = await this.prisma.contentSeriesEntry.findFirst({
      where: { id: entryId, seriesId },
    });
    if (!entry) throw new NotFoundException(`Entry ${entryId} khong ton tai`);
    const all = await this.prisma.contentSeriesEntry.findMany({
      where: { seriesId },
      select: { id: true, orderIndex: true },
    });
    const neighbor = findMoveNeighbor(all, entryId, direction);
    if (!neighbor) return entry;

    await this.prisma.$transaction([
      this.prisma.contentSeriesEntry.update({
        where: { id: entry.id },
        data: { orderIndex: -1 },
      }),
      this.prisma.contentSeriesEntry.update({
        where: { id: neighbor.id },
        data: { orderIndex: entry.orderIndex },
      }),
      this.prisma.contentSeriesEntry.update({
        where: { id: entry.id },
        data: { orderIndex: neighbor.orderIndex },
      }),
    ]);
    return this.prisma.contentSeriesEntry.findUniqueOrThrow({
      where: { id: entryId },
    });
  }

  // Keo tha (thay the goi move up/down nhieu lan) - FE tu tinh THU TU CUOI
  // CUNG (vd bang arrayMove) roi gui nguyen 1 mang id. Category khong co
  // @@unique tren orderIndex nen chi can 1 luot gan lai 0..n-1.
  async reorderCategories(seriesSlug: string, orderedIds: string[]) {
    const seriesId = await this.requireSeriesId(seriesSlug);
    const categories = await this.prisma.contentSeriesCategory.findMany({
      where: { seriesId, parentId: null },
      select: { id: true },
    });
    const validIds = new Set(categories.map((c) => c.id));
    if (
      orderedIds.length !== categories.length ||
      !orderedIds.every((id) => validIds.has(id))
    ) {
      throw new BadRequestException(
        'Danh sách category không khớp với Series này',
      );
    }
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.contentSeriesCategory.update({
          where: { id },
          data: { orderIndex: index },
        }),
      ),
    );
    return this.prisma.contentSeriesCategory.findMany({
      where: { seriesId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // Keo tha entry TRONG CUNG 1 category - CHI hoan doi orderIndex GIUA CHINH
  // cac entry cua category nay (giu nguyen tap "cho" orderIndex ma category
  // nay dang chiem trong thu tu toan cuc cua Series), KHONG dung lai toan bo
  // day so 0..n-1 nhu category - vi orderIndex Entry la KHOA TOAN CUC ca
  // Series (dung cho Prev/Next/counter "01/25" xuyen category, xem
  // findEntry), doi het se lam xao tron thu tu cac category khac. 2 luot
  // (gan am roi gan that) de tranh dam @@unique([seriesId, orderIndex]) khi
  // hoan doi cheo nhieu entry cung luc trong 1 transaction.
  async reorderEntriesInCategory(
    seriesSlug: string,
    categoryId: string,
    orderedIds: string[],
  ) {
    const seriesId = await this.requireSeriesId(seriesSlug);
    const categoryEntries = await this.prisma.contentSeriesEntry.findMany({
      where: { seriesId, categoryId },
      select: { id: true, orderIndex: true },
      orderBy: { orderIndex: 'asc' },
    });
    const validIds = new Set(categoryEntries.map((e) => e.id));
    if (
      orderedIds.length !== categoryEntries.length ||
      !orderedIds.every((id) => validIds.has(id))
    ) {
      throw new BadRequestException(
        'Danh sách entry không khớp với category này',
      );
    }
    const slots = categoryEntries
      .map((e) => e.orderIndex)
      .sort((a, b) => a - b);

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.contentSeriesEntry.update({
          where: { id },
          data: { orderIndex: -(index + 1) },
        }),
      ),
    );
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.contentSeriesEntry.update({
          where: { id },
          data: { orderIndex: slots[index] },
        }),
      ),
    );
    return this.prisma.contentSeriesEntry.findMany({
      where: { seriesId, categoryId },
      orderBy: { orderIndex: 'asc' },
    });
  }
}
