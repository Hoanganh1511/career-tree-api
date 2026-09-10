import {
  IsBoolean,
  IsIn,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { POST_KINDS, type PostKindApi } from '../post-kind.util';
import { POST_VISIBILITIES, type PostVisibilityApi } from '../post-visibility.util';
import { PostCategory } from '../../../generated/prisma/client';

const POST_CATEGORIES = Object.values(PostCategory);

export class CreatePostDto {
  @IsIn(POST_KINDS)
  kind!: PostKindApi;

  // Linh vuc bai dang thuoc ve - optional, gui dung 1 trong cac gia tri enum
  // PostCategory (vd "FRONTEND") tu HomeCategoryBar/PostComposer o frontend.
  @IsOptional()
  @IsIn(POST_CATEGORIES)
  category?: PostCategory;

  // Field rieng tung kind (content/title/image/poll options/...) - shape khac
  // nhau tuy `kind`, validate chi tiet tung field la viec cua frontend
  // (PostComposer.tsx buildPostData()) vi day la 24 shape khac nhau; backend
  // chi dam bao no la 1 object khong rong truoc khi luu vao cot Json.
  @IsObject()
  @IsNotEmptyObject()
  data!: Record<string, unknown>;

  // Compose Giai doan 2 - cot THAT (khac `data` o tren), khong phai shape
  // rieng tung kind. Optional: khong gui thi Prisma tu ap @default cua cot
  // (PUBLIC/true/true/true) - xem post.service.ts create().
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

  // Redesign Compose mobile - nguoi dung tu viet tom tat. Optional: khong
  // gui thi PostService fallback tu cat content nhu cu (xem post.service.ts).
  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;
}
