import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSeriesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  // Gop san mot vai bai luc tao - dung cho luong "chon nhieu bai roi gop".
  // Bo trong khi tao tu nut "Thêm bài viết cùng chủ đề" (series chi gan 1
  // bai dau tien qua chinh dto nay tu SeriesController, xem comment o do).
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];
}
