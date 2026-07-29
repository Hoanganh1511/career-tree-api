import { IsIn, IsNotEmptyObject, IsObject } from 'class-validator';
import { POST_KINDS, type PostKindApi } from '../post-kind.util';

export class CreatePostDto {
  @IsIn(POST_KINDS)
  kind!: PostKindApi;

  // Field rieng tung kind (content/title/image/poll options/...) - shape khac
  // nhau tuy `kind`, validate chi tiet tung field la viec cua frontend
  // (PostComposer.tsx buildPostData()) vi day la 24 shape khac nhau; backend
  // chi dam bao no la 1 object khong rong truoc khi luu vao cot Json.
  @IsObject()
  @IsNotEmptyObject()
  data!: Record<string, unknown>;
}
