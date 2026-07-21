import { IsOptional, IsString } from 'class-validator';

export class CreateWorkspaceDto {
  @IsOptional()
  @IsString()
  name?: string;
}
