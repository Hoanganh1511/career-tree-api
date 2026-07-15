import { IsNotEmpty, IsObject } from 'class-validator';

export class CreateCardDto {
  @IsObject()
  @IsNotEmpty()
  content!: Record<string, unknown>;
}
