import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
