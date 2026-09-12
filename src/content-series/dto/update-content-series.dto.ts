import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
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
}
