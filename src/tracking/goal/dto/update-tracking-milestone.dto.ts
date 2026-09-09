import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpdateTrackingMilestoneDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  weeklyGoalNote?: string;
}
