import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCommunityPostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsIn(['learning', 'question', 'resource'])
  category?: 'learning' | 'question' | 'resource';

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
