import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateContentSeriesEntryDto {
  @IsString({ message: 'Thiếu categoryId - chọn 1 Category trước khi lưu.' })
  categoryId!: string;

  @IsString({ message: 'Tiêu đề là bắt buộc.' })
  @MaxLength(200, { message: 'Tiêu đề tối đa 200 ký tự (đang dài hơn) - rút gọn lại rồi lưu lại.' })
  title!: string;

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

  @IsString({ message: 'Nội dung (contentMarkdown) là bắt buộc.' })
  contentMarkdown!: string;

  // Ghi de Install Widget rieng cho entry nay - null/thieu = ke thua Series
  // (xem SeriesInstallWidget o frontend).
  @IsOptional()
  @IsArray()
  installTabs?: unknown[];

  @IsOptional()
  @IsArray()
  faq?: unknown[];

  // Khoi noi dung o dau bai (TOC box/install/buttonGroup/callout) - thu tu
  // trong mang = thu tu hien thi. Xem comment tren field cung ten trong
  // schema.prisma.
  @IsOptional()
  @IsArray()
  contentBlocks?: unknown[];

  // Layout "Dictionary" - xem comment ContentSeriesEntry.dictionarySections
  // trong schema.prisma.
  @IsOptional()
  @IsArray()
  dictionarySections?: unknown[];

  // Tuy chon - khong gui thi service tu tinh tu so tu trong contentMarkdown
  // (xem estimateReadTimeMinutes()).
  @IsOptional()
  @IsInt({ message: 'Read time phải là số nguyên phút (vd 3, không phải 3.5).' })
  @Min(1, { message: 'Read time tối thiểu 1 phút.' })
  readTimeMinutes?: number;
}
