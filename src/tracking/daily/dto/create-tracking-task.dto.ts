import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateTrackingTaskDto {
  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  timeBlockId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}
