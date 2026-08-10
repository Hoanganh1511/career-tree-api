import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateCommunityPostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(['learning', 'question', 'resource'])
  category?: 'learning' | 'question' | 'resource';

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
