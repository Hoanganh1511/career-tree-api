import { IsString } from 'class-validator';

export class AddItemDto {
  @IsString()
  postId!: string;
}
