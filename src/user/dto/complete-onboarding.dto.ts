import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteOnboardingDto {
  @IsOptional()
  @IsIn(['self', 'learn', 'career', 'community'])
  goal?: string;

  // Co gia tri -> tao that 1 Workspace + 1 KnowledgeGroup dau tien (xem
  // UserService.completeOnboarding). Rong/khong gui -> chi danh dau da
  // onboard (dong som o buoc 1/2), khong tao gi ca.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstChapterTitle?: string;
}
