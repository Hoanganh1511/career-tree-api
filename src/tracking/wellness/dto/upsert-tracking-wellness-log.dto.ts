import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertTrackingWellnessLogDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  sleepHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  sleepQuality?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  napMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  exerciseMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  mealsLogged?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
