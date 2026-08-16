import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AddSeriesDocumentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  documentIds!: string[];
}
