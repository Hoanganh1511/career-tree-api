import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateContentSeriesDto {
  @IsString()
  @MaxLength(150)
  title!: string;

  // Tuy chon - khong gui thi service tu sinh tu title (xem uniqueSlug()).
  @IsOptional()
  @IsString()
  @MaxLength(150)
  slug?: string;

  @IsString()
  description!: string;

  @IsString()
  @MaxLength(150)
  authorName!: string;

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

  // Cac field JSON tu do (shape validate o FE, giong Post.data) - xem comment
  // schema.prisma ContentSeries.stats/installTabs/externalLinks.
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

  // --- "Campaign card" (yeu cau nguoi dung: redesign the Series thanh
  // banner co anh/badge/CTA, xem SeriesCampaignCard.tsx). Cac field JSON tu
  // do (actions) van theo tinh than stats/installTabs o tren - validate
  // shape chi tiet o FE.
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

  @IsOptional()
  @IsDateString()
  deadlineAt?: string;

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
