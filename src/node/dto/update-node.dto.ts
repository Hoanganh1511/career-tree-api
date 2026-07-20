import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsBoolean()
  hiddenFromShare?: boolean;

  @IsOptional()
  @IsBoolean()
  isCollapsed?: boolean;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
