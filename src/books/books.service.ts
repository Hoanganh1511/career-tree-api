import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Book, Page, Block, Prisma } from '../../generated/prisma/client';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreatePageDto } from './dto/create-page.dto';

type PageWithBlocks = Page & { blocks: Block[] };
type BookWithPages = Book & { pages: PageWithBlocks[] };

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async findOne(userId: string, bookId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        pages: { orderBy: { order: 'asc' }, include: { blocks: true } },
      },
    });
    if (!book || book.userId !== userId) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }
    return this.toApi(book);
  }

  // Autosave PATCH - nhan FULL state cua book (title/coverConfig/pages/blocks
  // deu TUY CHON, chi field nao co mat trong body moi bi ghi de). Khi `pages`
  // co mat, day la FULL-REPLACE cho CA pages LAN blocks (page/block nao
  // khong con trong payload se bi XOA that) - don gian/nhat quan hon cach
  // "chi xoa block, giu nguyen page" (da can nhac them 1 huong khac giu
  // page qua DELETE /pages/:id rieng, nhung chon huong don gian nay theo yeu
  // cau nguoi dung). Toan bo nam trong 1 $transaction de khong bao gio de
  // book o trang thai nua cu nua moi neu co loi giua chung.
  async update(userId: string, bookId: string, dto: UpdateBookDto) {
    await this.assertOwner(userId, bookId);

    const fresh = await this.prisma.$transaction(async (tx) => {
      if (dto.title !== undefined || dto.coverConfig !== undefined) {
        await tx.book.update({
          where: { id: bookId },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.coverConfig !== undefined
              ? { coverConfig: dto.coverConfig as Prisma.InputJsonValue }
              : {}),
          },
        });
      }

      if (dto.pages) {
        const existingPages = await tx.page.findMany({
          where: { bookId },
          select: { id: true },
        });
        const incomingPageIds = new Set(dto.pages.map((p) => p.id));
        const pageIdsToDelete = existingPages
          .map((p) => p.id)
          .filter((id) => !incomingPageIds.has(id));
        if (pageIdsToDelete.length > 0) {
          // onDelete: Cascade tren Block.page tu xoa het block thuoc cac
          // trang nay theo.
          await tx.page.deleteMany({ where: { id: { in: pageIdsToDelete } } });
        }

        for (const pageDto of dto.pages) {
          await tx.page.upsert({
            where: { id: pageDto.id },
            create: { id: pageDto.id, bookId, order: pageDto.order },
            update: { order: pageDto.order },
          });

          const existingBlocks = await tx.block.findMany({
            where: { pageId: pageDto.id },
            select: { id: true },
          });
          const incomingBlockIds = new Set(pageDto.blocks.map((b) => b.id));
          const blockIdsToDelete = existingBlocks
            .map((b) => b.id)
            .filter((id) => !incomingBlockIds.has(id));
          if (blockIdsToDelete.length > 0) {
            await tx.block.deleteMany({
              where: { id: { in: blockIdsToDelete } },
            });
          }

          for (const blockDto of pageDto.blocks) {
            await tx.block.upsert({
              where: { id: blockDto.id },
              create: {
                id: blockDto.id,
                pageId: pageDto.id,
                gridX: blockDto.gridX,
                gridY: blockDto.gridY,
                gridW: blockDto.gridW,
                gridH: blockDto.gridH,
                content: blockDto.content as Prisma.InputJsonValue | undefined,
              },
              update: {
                gridX: blockDto.gridX,
                gridY: blockDto.gridY,
                gridW: blockDto.gridW,
                gridH: blockDto.gridH,
                content: blockDto.content as Prisma.InputJsonValue | undefined,
              },
            });
          }
        }
      }

      return tx.book.findUniqueOrThrow({
        where: { id: bookId },
        include: {
          pages: { orderBy: { order: 'asc' }, include: { blocks: true } },
        },
      });
    });

    return this.toApi(fresh);
  }

  async addPage(userId: string, bookId: string, dto: CreatePageDto) {
    await this.assertOwner(userId, bookId);

    let order = dto.order;
    if (order === undefined) {
      const last = await this.prisma.page.findFirst({
        where: { bookId },
        orderBy: { order: 'desc' },
      });
      order = (last?.order ?? -1) + 1;
    }

    const page = await this.prisma.page.create({
      data: { bookId, order },
      include: { blocks: true },
    });
    return this.toApiPage(page);
  }

  async removePage(userId: string, bookId: string, pageId: string) {
    await this.assertOwner(userId, bookId);

    const page = await this.prisma.page.findUnique({ where: { id: pageId } });
    if (!page || page.bookId !== bookId) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }
    await this.prisma.page.delete({ where: { id: pageId } });
  }

  private async assertOwner(userId: string, bookId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { userId: true },
    });
    if (!book || book.userId !== userId) {
      throw new NotFoundException(`Book ${bookId} not found`);
    }
  }

  private toApi(book: BookWithPages) {
    return {
      id: book.id,
      userId: book.userId,
      title: book.title,
      isOpen: book.isOpen,
      coverConfig: book.coverConfig,
      pages: book.pages.map((p) => this.toApiPage(p)),
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
    };
  }

  private toApiPage(page: PageWithBlocks) {
    return {
      id: page.id,
      bookId: page.bookId,
      order: page.order,
      blocks: page.blocks.map((b) => ({
        id: b.id,
        pageId: b.pageId,
        gridX: b.gridX,
        gridY: b.gridY,
        gridW: b.gridW,
        gridH: b.gridH,
        content: b.content,
      })),
    };
  }
}
