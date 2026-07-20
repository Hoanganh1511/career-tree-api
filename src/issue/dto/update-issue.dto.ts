import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateIssueDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}
