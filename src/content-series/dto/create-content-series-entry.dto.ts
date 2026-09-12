import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateContentSeriesEntryDto {
  @IsString()
  categoryId!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

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

  @IsString()
  contentMarkdown!: string;

  // Ghi de Install Widget rieng cho entry nay - null/thieu = ke thua Series
  // (xem SeriesInstallWidget o frontend).
  @IsOptional()
  @IsArray()
  installTabs?: unknown[];

  @IsOptional()
  @IsArray()
  faq?: unknown[];

  // Tuy chon - khong gui thi service tu tinh tu so tu trong contentMarkdown
  // (xem estimateReadTimeMinutes()).
  @IsOptional()
  @IsInt()
  @Min(1)
  readTimeMinutes?: number;
}
