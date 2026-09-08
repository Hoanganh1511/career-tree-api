import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDiaryEntryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsDateString()
  entryDate!: string;
}
