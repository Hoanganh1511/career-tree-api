import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateTierDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  sublabel?: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
