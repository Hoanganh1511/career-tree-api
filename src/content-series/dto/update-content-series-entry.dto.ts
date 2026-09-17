import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateContentSeriesEntryDto {
  // Cho phep doi category (chuyen entry sang nhom khac) - thay the viec keo
  // tha giua cac category trong tree cho MVP.
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  navTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  source?: string;

  @IsOptional()
  @IsString()
  contentMarkdown?: string;

  @IsOptional()
  @IsArray()
  installTabs?: unknown[];

  @IsOptional()
  @IsArray()
  faq?: unknown[];

  @IsOptional()
  @IsArray()
  contentBlocks?: unknown[];

  // Layout "Dictionary" (search + sidebar Sections + luoi thuat ngu) - xem
  // comment ContentSeriesEntry.dictionarySections trong schema.prisma.
  // null/[] = Entry render nhu bai viet binh thuong.
  @IsOptional()
  @IsArray()
  dictionarySections?: unknown[];

  @IsOptional()
  @IsInt()
  @Min(1)
  readTimeMinutes?: number;
}
