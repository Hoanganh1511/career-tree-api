import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  knowledgeGroupId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  summary?: string;

  // Tiptap JSON, schema han che (bold/italic/bulletList/orderedList) - xem
  // comment tren cot `overview` trong schema.prisma.
  @IsOptional()
  @IsObject()
  overview?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  // Tiptap/ProseMirror JSON - shape do editor quyet dinh, backend chi luu
  // nguyen vao cot Json (giong Node.content / Card.content).
  @IsObject()
  content!: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  // Gan bai viet vao 1 DocumentSeries co san (nhom "cung chu de") - dung boi
  // luong "Thêm bài viết cùng chủ đề" o FE. Phai thuoc DUNG knowledgeGroupId
  // o tren, xem check trong DocumentService.create.
  @IsOptional()
  @IsString()
  seriesId?: string;
}
