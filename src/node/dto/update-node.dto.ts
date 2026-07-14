import { IsBoolean, IsOptional, IsString } from 'class-validator';
export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  hiddenFromShare?: boolean;

  @IsOptional()
  @IsBoolean()
  isCollapsed?: boolean;
}
