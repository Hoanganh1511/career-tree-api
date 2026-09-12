import {
  IsArray,
  IsBoolean,
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
}
