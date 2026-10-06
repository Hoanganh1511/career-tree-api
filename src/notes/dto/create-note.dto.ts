import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// Giu NGUYEN VAN gia tri camelCase khop 1-1 voi NoteType phia FE (xem
// src/lib/notes/note-types.ts) - xem comment day du o schema.prisma (model Note).
const NOTE_TYPES = [
  'keyPoint',
  'insight',
  'watchOut',
  'question',
  'connection',
  'personal',
] as const;

export class CreateNoteDto {
  // entrySlug/seriesSlug KHONG nhan tu client - NoteService tu tra cuu tu
  // chinh entryId (dam bao luon khop voi du lieu that, tranh truong hop FE
  // gui sai/cu).
  @IsString()
  @IsNotEmpty()
  entryId!: string;

  @IsIn(NOTE_TYPES)
  type!: (typeof NOTE_TYPES)[number];

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  // Doan trich goc (de dinh vi lai trong bai, xem text-anchor.ts ben FE) -
  // rong ca 3 truong = note thu cong (khong gan doan nao, nut "+ Add a note").
  @IsOptional()
  @IsString()
  quoteText?: string;

  @IsOptional()
  @IsString()
  quotePrefix?: string;

  @IsOptional()
  @IsString()
  quoteSuffix?: string;
}
