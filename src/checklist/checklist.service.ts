import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeGroupAccessService } from '../common/knowledge-group-access.service';
import { ChecklistItem, ChecklistItemLog } from '../../generated/prisma/client';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { UpdateChecklistStatusDto } from './dto/update-checklist-status.dto';

@Injectable()
export class ChecklistService {
  constructor(
    private prisma: PrismaService,
    private groupAccess: KnowledgeGroupAccessService,
  ) {}

  // Cung dieu kien xem duoc voi DocumentService.findBySlug (ban nhap chi tac
  // gia thay, nhom PRIVATE chi tac gia/collaborator APPROVED) - checklist
  // khong the xem duoc rong hon chinh bai viet no gan vao.
  private async assertDocumentViewable(viewerId: string, documentId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        authorId: true,
        isPublished: true,
        knowledgeGroupId: true,
        checklistLogPublic: true,
      },
    });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);
    const isSelf = doc.authorId === viewerId;
    if (!doc.isPublished && !isSelf) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    await this.groupAccess.assertGroupViewable(doc.knowledgeGroupId, viewerId);
    return { ...doc, isSelf };
  }

  private async assertItemAuthor(itemId: string, userId: string) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
      select: { documentId: true, document: { select: { authorId: true } } },
    });
    if (!item || item.document.authorId !== userId) {
      throw new NotFoundException(`Checklist item ${itemId} not found`);
    }
    return item;
  }

  async list(viewerId: string, documentId: string) {
    await this.assertDocumentViewable(viewerId, documentId);
    const items = await this.prisma.checklistItem.findMany({
      where: { documentId },
      orderBy: { orderIndex: 'asc' },
    });
    return items.map((i) => this.toApi(i));
  }

  async create(
    userId: string,
    documentId: string,
    dto: CreateChecklistItemDto,
  ) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { authorId: true },
    });
    if (!doc || doc.authorId !== userId) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    const last = await this.prisma.checklistItem.findFirst({
      where: { documentId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const item = await this.prisma.checklistItem.create({
      data: {
        documentId,
        label: dto.label,
        note: dto.note,
        orderIndex: (last?.orderIndex ?? -1) + 1,
      },
    });
    return this.toApi(item);
  }

  async updateItem(userId: string, id: string, dto: UpdateChecklistItemDto) {
    await this.assertItemAuthor(id, userId);
    const item = await this.prisma.checklistItem.update({
      where: { id },
      data: { label: dto.label, note: dto.note, orderIndex: dto.orderIndex },
    });
    return this.toApi(item);
  }

  // Doi trang thai - LUON tu sinh 1 dong ChecklistItemLog voi note SNAPSHOT
  // tai thoi diem nay (khong phai lay lai luc doc), giu dung y nghia "nhat
  // ky", khong phai field tu nhap.
  async updateStatus(
    userId: string,
    id: string,
    dto: UpdateChecklistStatusDto,
  ) {
    await this.assertItemAuthor(id, userId);
    const item = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.checklistItem.update({
        where: { id },
        data: { status: dto.status },
      });
      await tx.checklistItemLog.create({
        data: {
          checklistItemId: id,
          toStatus: dto.status,
          note: updated.note,
        },
      });
      // ChecklistItem khong co knowledgeGroupId truc tiep - phai lookup qua
      // Document de ghi nhan "ngay hoc" cho dung nhom.
      const doc = await tx.document.findUniqueOrThrow({
        where: { id: updated.documentId },
        select: { knowledgeGroupId: true },
      });
      await this.groupAccess.recordStudyDay(tx, doc.knowledgeGroupId);
      return updated;
    });
    return this.toApi(item);
  }

  async remove(userId: string, id: string) {
    await this.assertItemAuthor(id, userId);
    await this.prisma.checklistItem.delete({ where: { id } });
  }

  // Log CHI tra ve that neu viewer la tac gia HOAC Document.checklistLogPublic
  // = true - nguoc lai tra mang rong (khong throw, tranh lo thong tin "co
  // log hay khong" qua status code khac nhau).
  async listLogs(viewerId: string, itemId: string) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
      select: {
        document: {
          select: { id: true, authorId: true, checklistLogPublic: true },
        },
      },
    });
    if (!item)
      throw new NotFoundException(`Checklist item ${itemId} not found`);
    await this.assertDocumentViewable(viewerId, item.document.id);

    const isSelf = item.document.authorId === viewerId;
    if (!isSelf && !item.document.checklistLogPublic) return [];

    const logs = await this.prisma.checklistItemLog.findMany({
      where: { checklistItemId: itemId },
      orderBy: { createdAt: 'desc' },
    });
    return logs.map((l) => this.toApiLog(l));
  }

  private toApi(item: ChecklistItem) {
    return {
      id: item.id,
      documentId: item.documentId,
      label: item.label,
      status: item.status,
      note: item.note,
      orderIndex: item.orderIndex,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private toApiLog(log: ChecklistItemLog) {
    return {
      id: log.id,
      toStatus: log.toStatus,
      note: log.note,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
