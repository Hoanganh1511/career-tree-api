import { IsInt, Min } from 'class-validator';

export class CompleteSessionDto {
  @IsInt()
  @Min(0)
  totalTimeSeconds!: number;
}
