import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateContentSeriesCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorHex?: string;
}
