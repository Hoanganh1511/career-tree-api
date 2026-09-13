import { IsIn, IsOptional } from 'class-validator';

export class CompleteOnboardingDto {
  @IsOptional()
  @IsIn(['self', 'learn', 'career', 'community'])
  goal?: string;
}
