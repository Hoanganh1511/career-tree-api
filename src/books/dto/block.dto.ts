import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// 1 khoi tren luoi 10x14 (vo hinh) cua 1 trang - id LUON co san (FE tu sinh
// bang nanoid ngay khi tao block trong zustand store, xem useBookStore),
// server chi upsert theo id nay, KHONG tu sinh id cho Block/Page (chi Book
// moi dung Prisma @default(uuid())).
export class BlockDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsInt()
  @Min(0)
  @Max(9)
  gridX!: number;

  @IsInt()
  @Min(0)
  @Max(13)
  gridY!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  gridW!: number;

  @IsInt()
  @Min(1)
  @Max(14)
  gridH!: number;

  // Konva scene JSON (stage.toJSON(), xem Phase 3) - hinh dang tu do, khong
  // rang buoc schema cu the (giong Document.content Tiptap JSON dang lam).
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
