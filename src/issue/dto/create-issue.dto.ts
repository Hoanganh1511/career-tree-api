import { IsNotEmpty, IsString } from 'class-validator';

export class CreateIssueDto {
  @IsString()
  @IsNotEmpty()
  question!: string;
}
