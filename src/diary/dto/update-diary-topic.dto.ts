import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateDiaryTopicDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
