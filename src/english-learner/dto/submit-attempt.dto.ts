import { IsIn, IsOptional, IsUUID, IsObject, IsInt, Min } from 'class-validator';

// [2026-10-15] 1 lan nop dap an cho 1 Exercise. `submittedAnswer` la Json -
// SHAPE khac nhau theo ElExerciseType cua chinh Exercise do (server tu doc
// exercise.type tu DB de biet cach dien giai, KHONG tin FE gui kem type) -
// xem contract day du trong english-learner.service.ts (ham scoreExercise).
export class SubmitAttemptDto {
  @IsUUID()
  exerciseId!: string;

  @IsObject()
  submittedAnswer!: Record<string, unknown>;

  @IsOptional()
  @IsIn(['PRACTICE', 'UNIT_TEST', 'REVIEW'])
  context?: 'PRACTICE' | 'UNIT_TEST' | 'REVIEW';

  @IsOptional()
  @IsUUID()
  reviewId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;
}
