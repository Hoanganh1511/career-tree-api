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
  @MaxLength(200, { message: 'Tiêu đề tối đa 200 ký tự (đang dài hơn) - rút gọn lại rồi lưu lại.' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'Tên hiển thị trong sidebar tối đa 200 ký tự (đang dài hơn) - rút gọn lại rồi lưu lại.',
  })
  navTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Slug tối đa 200 ký tự (đang dài hơn) - rút gọn lại rồi lưu lại.' })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Subtitle tối đa 500 ký tự (đang dài hơn) - rút gọn lại rồi lưu lại.' })
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Icon tối đa 20 ký tự - đây là tên icon (vd "book-open"), không phải mô tả dài.' })
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Source tối đa 150 ký tự (đang dài hơn) - rút gọn lại rồi lưu lại.' })
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
  @IsInt({ message: 'Read time phải là số nguyên phút (vd 3, không phải 3.5).' })
  @Min(1, { message: 'Read time tối thiểu 1 phút.' })
  readTimeMinutes?: number;
}
