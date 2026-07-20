import { IsIn, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateCardDto {
  @IsObject()
  @IsNotEmpty()
  content!: Record<string, unknown>;

  @IsOptional()
  @IsIn(['NOTE', 'PRACTICE'])
  kind?: 'NOTE' | 'PRACTICE';
}
