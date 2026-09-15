import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateContentSeriesDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  authorName?: string;

  @IsOptional()
  @IsString()
  authorAvatarUrl?: string;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  emailCourseEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  emailCourseTitle?: string;

  @IsOptional()
  @IsString()
  emailCourseDescription?: string;

  @IsOptional()
  @IsArray()
  stats?: unknown[];

  @IsOptional()
  @IsArray()
  installTabs?: unknown[];

  @IsOptional()
  @IsArray()
  externalLinks?: unknown[];

  @IsOptional()
  @IsArray()
  shareChannels?: string[];

  // --- "Campaign card" (xem comment CreateContentSeriesDto).
  @IsOptional()
  @IsString()
  @MaxLength(60)
  badgeText?: string;

  @IsOptional()
  @IsString()
  badgeVariant?: string;

  @IsOptional()
  @IsString()
  badgeColor?: string;

  @IsOptional()
  @IsString()
  badgeTextColor?: string;

  // Cho phep gui NULL de xoa deadline (khac cac field string o tren - FE gui
  // chuoi rong de xoa) - deadlineAt la DateTime nen "" khong hop le voi
  // IsDateString, phai dung rieng null.
  @IsOptional()
  @ValidateIf((o) => o.deadlineAt !== null)
  @IsDateString()
  deadlineAt?: string | null;

  @IsOptional()
  @IsString()
  imagePosition?: string;

  @IsOptional()
  @IsInt()
  imageWidthPercent?: number;

  @IsOptional()
  @IsString()
  imageFit?: string;

  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  textTheme?: string;

  @IsOptional()
  @IsString()
  cardStyle?: string;

  @IsOptional()
  @IsArray()
  actions?: unknown[];

  @IsOptional()
  @IsBoolean()
  showBadge?: boolean;

  @IsOptional()
  @IsBoolean()
  showDeadline?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
