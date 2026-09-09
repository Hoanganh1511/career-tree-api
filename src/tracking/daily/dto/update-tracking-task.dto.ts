import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const SKIP_REASONS = ['AVOIDANCE', 'OUT_OF_TIME', 'INTERRUPTED', 'MISESTIMATED'] as const;

export class UpdateTrackingTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsIn(SKIP_REASONS)
  skipReason?: (typeof SKIP_REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}
