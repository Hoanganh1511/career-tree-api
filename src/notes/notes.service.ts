import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Note } from '../../generated/prisma/client';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

type NoteWithEntry = Note & { entry: { slug: string } };
const WITH_ENTRY_SLUG = { entry: { select: { slug: true as const } } };

export interface NoteApi {
  id: string;
  entryId: string;
  entrySlug: string;
  seriesSlug: string;
  type: string;
  content: string;
  tags: string[];
  quoteText: string;
  quotePrefix: string;
  quoteSuffix: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  private async assertOwner(userId: string, noteId: string): Promise<Note> {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }
    return note;
  }

  // Loc theo 1 trong 2: `entryId` (panel "Notes from this article") hoac
  // `seriesSlug` (panel "All notes" - gop note tu MOI Entry trong 1 Series,
  // xem comment NotesPanel.tsx ben FE) - bat buoc chon 1, tranh truy van
  // "toan bo note cua user" khong co pham vi (khong co man hinh nao can dieu
  // do, va se cham dan khi user tich luy nhieu note tren nhieu Series).
  async list(
    userId: string,
    entryId?: string,
    seriesSlug?: string,
  ): Promise<NoteApi[]> {
    if (!entryId && !seriesSlug) {
      throw new BadRequestException('Cần truyền entryId hoặc seriesSlug.');
    }
    const notes = await this.prisma.note.findMany({
      where: {
        userId,
        ...(entryId ? { entryId } : { seriesSlug }),
      },
      include: WITH_ENTRY_SLUG,
      orderBy: { createdAt: 'desc' },
    });
    return notes.map((n: NoteWithEntry) => this.toApi(n, n.entry.slug));
  }

  async create(userId: string, dto: CreateNoteDto): Promise<NoteApi> {
    // entrySlug/seriesSlug tu tra cuu tu DB (khong nhan tu client) - dam bao
    // luon khop dung voi entryId that, xem comment CreateNoteDto.
    const entry = await this.prisma.contentSeriesEntry.findUnique({
      where: { id: dto.entryId },
      select: { slug: true, series: { select: { slug: true } } },
    });
    if (!entry) {
      throw new NotFoundException(
        `ContentSeriesEntry ${dto.entryId} not found`,
      );
    }
    const note = await this.prisma.note.create({
      data: {
        userId,
        entryId: dto.entryId,
        seriesSlug: entry.series.slug,
        type: dto.type,
        content: dto.content,
        tags: dto.tags ?? [],
        quoteText: dto.quoteText,
        quotePrefix: dto.quotePrefix,
        quoteSuffix: dto.quoteSuffix,
      },
    });
    return this.toApi(note, entry.slug);
  }

  async update(
    userId: string,
    noteId: string,
    dto: UpdateNoteDto,
  ): Promise<NoteApi> {
    await this.assertOwner(userId, noteId);
    const note = await this.prisma.note.update({
      where: { id: noteId },
      data: { type: dto.type, content: dto.content, tags: dto.tags },
      include: WITH_ENTRY_SLUG,
    });
    return this.toApi(note, note.entry.slug);
  }

  async remove(userId: string, noteId: string): Promise<void> {
    await this.assertOwner(userId, noteId);
    await this.prisma.note.delete({ where: { id: noteId } });
  }

  // `entrySlug` truyen tay khi da co san (create - vua tra cuu entry xong,
  // tranh 1 query JOIN them) - list()/update() khong co san nen JOIN qua
  // Prisma `include` thay vi goi lai rieng.
  private toApi(note: Note, entrySlug?: string): NoteApi {
    return {
      id: note.id,
      entryId: note.entryId,
      entrySlug: entrySlug ?? '',
      seriesSlug: note.seriesSlug,
      type: note.type,
      content: note.content,
      tags: note.tags,
      quoteText: note.quoteText ?? '',
      quotePrefix: note.quotePrefix ?? '',
      quoteSuffix: note.quoteSuffix ?? '',
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }
}
