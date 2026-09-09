import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTrackingGoalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsBoolean()
  important?: boolean;

  @IsOptional()
  @IsBoolean()
  controllable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  why?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  estimatedHoursPerWeek?: number;
}
