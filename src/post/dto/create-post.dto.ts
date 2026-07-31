import { IsIn, IsNotEmptyObject, IsObject, IsOptional } from 'class-validator';
import { POST_KINDS, type PostKindApi } from '../post-kind.util';
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
}
