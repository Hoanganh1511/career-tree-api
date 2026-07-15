import { IsObject, IsOptional } from 'class-validator';

export class UpdateCardDto {
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;
}
