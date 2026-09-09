import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const KINDS = ['FOCUSED', 'GENERAL', 'LIFE', 'BUFFER'] as const;

export class UpdateTrackingTimeBlockDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsIn(KINDS)
  kind?: (typeof KINDS)[number];
}
