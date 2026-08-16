import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeGroupAccessService } from '../common/knowledge-group-access.service';
import { DocumentSeries, Prisma } from '../../generated/prisma/client';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { AddSeriesDocumentsDto } from './dto/add-series-documents.dto';

@Injectable()
export class SeriesService {
  constructor(
    private prisma: PrismaService,
    private groupAccess: KnowledgeGroupAccessService,
  ) {}

  // Tao series (tuy chon gop san documentIds) - "seri" chi ton tai trong DUNG
  // 1 KnowledgeGroup, giong DocumentSeries.knowledgeGroupId trong schema.
  async create(userId: string, groupId: string, dto: CreateSeriesDto) {
    await this.groupAccess.assertGroupWriter(groupId, userId);
    const series = await this.prisma.$transaction(async (tx) => {
      const created = await tx.documentSeries.create({
        data: { knowledgeGroupId: groupId, name: dto.name },
      });
      if (dto.documentIds?.length) {
        await this.assignDocuments(tx, groupId, dto.documentIds, created.id);
      }
      return created;
    });
    return this.toApi(series);
  }

  async update(userId: string, id: string, dto: UpdateSeriesDto) {
    await this.assertOwnedSeries(id, userId);
    const updated = await this.prisma.documentSeries.update({
      where: { id },
      data: { name: dto.name, orderIndex: dto.orderIndex },
    });
    return this.toApi(updated);
  }

  // Giai tan nhom - Document.seriesId cua cac bai trong series nay tu dong
  // ve null qua onDelete: SetNull trong schema, KHONG xoa bai viet.
  async remove(userId: string, id: string) {
    await this.assertOwnedSeries(id, userId);
    await this.prisma.documentSeries.delete({ where: { id } });
  }

  async addDocuments(userId: string, id: string, dto: AddSeriesDocumentsDto) {
    const series = await this.assertOwnedSeries(id, userId);
    await this.prisma.$transaction((tx) =>
      this.assignDocuments(tx, series.knowledgeGroupId, dto.documentIds, id),
    );
    const updated = await this.prisma.documentSeries.findUniqueOrThrow({
      where: { id },
    });
    return this.toApi(updated);
  }

  // Go 1 bai khoi series (khong xoa bai, chi roi ve "khong nhom"). 404 neu
  // bai khong ton tai HOAC khong thuoc dung series nay - tranh 1 user go
  // nham/co y bai cua series khac qua sua thang documentId tren URL.
  async removeDocument(userId: string, id: string, documentId: string) {
    await this.assertOwnedSeries(id, userId);
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { seriesId: true },
    });
    if (!doc || doc.seriesId !== id) {
      throw new NotFoundException(
        `Document ${documentId} not found in series ${id}`,
      );
    }
    await this.prisma.document.update({
      where: { id: documentId },
      data: { seriesId: null },
    });
  }

  private async assertOwnedSeries(
    id: string,
    userId: string,
  ): Promise<DocumentSeries> {
    const series = await this.prisma.documentSeries.findUnique({
      where: { id },
    });
    if (!series) throw new NotFoundException(`Series ${id} not found`);
    await this.groupAccess.assertGroupWriter(series.knowledgeGroupId, userId);
    return series;
  }

  // Chi gan duoc bai THUOC DUNG knowledgeGroupId cua series (tranh 1 series
  // "nuot" nham bai cua nhom khac qua truyen id tuy y) - 404 neu thieu bai
  // nao khong khop dieu kien nay.
  private async assignDocuments(
    tx: Prisma.TransactionClient,
    groupId: string,
    documentIds: string[],
    seriesId: string,
  ) {
    const unique = [...new Set(documentIds)];
    const matched = await tx.document.findMany({
      where: { id: { in: unique }, knowledgeGroupId: groupId },
      select: { id: true },
    });
    if (matched.length !== unique.length) {
      throw new NotFoundException(
        'Một số bài viết không tồn tại trong nhóm này',
      );
    }
    await tx.document.updateMany({
      where: { id: { in: unique } },
      data: { seriesId },
    });
  }

  private toApi(series: DocumentSeries) {
    return {
      id: series.id,
      knowledgeGroupId: series.knowledgeGroupId,
      name: series.name,
      orderIndex: series.orderIndex,
      createdAt: series.createdAt.toISOString(),
      updatedAt: series.updatedAt.toISOString(),
    };
  }
}
