import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  @IsString()
  selectedOptionId!: string;

  @IsInt()
  @Min(0)
  timeSpentSeconds!: number;

  // Client bao co phai cau retention khong (server van tu xac dinh lai qua
  // session.retentionQuestionIds - field nay chi dung de doi chieu/debug).
  @IsOptional()
  @IsBoolean()
  isRetentionQuestion?: boolean;
}
