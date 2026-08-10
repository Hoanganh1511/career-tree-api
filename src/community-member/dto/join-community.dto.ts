import { IsOptional, IsString } from 'class-validator';

export class JoinCommunityDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
