import {
  IsBoolean,
  IsNotEmptyObject,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { POST_VISIBILITIES, type PostVisibilityApi } from '../post-visibility.util';
import { PostCategory } from '../../../generated/prisma/client';

const POST_CATEGORIES = Object.values(PostCategory);

// Sua bai da dang - KHONG cho doi `kind` (shape `data` gan chat voi kind luc
// tao, doi kind se lam `data` sai shape) - moi field con lai optional, chi
// cap nhat field nao FE gui (xem PostService.update()).
export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsIn(POST_CATEGORIES)
  category?: PostCategory;

  @IsOptional()
  @IsObject()
  @IsNotEmptyObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsIn(POST_VISIBILITIES)
  visibility?: PostVisibilityApi;

  @IsOptional()
  @IsBoolean()
  commentsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  likesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  searchable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;
}
