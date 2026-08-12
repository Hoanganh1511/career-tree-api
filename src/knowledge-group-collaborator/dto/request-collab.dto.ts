import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestCollabDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
