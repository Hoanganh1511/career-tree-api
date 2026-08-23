import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PageDto } from './page.dto';

// Autosave PATCH nhan FULL state cua book (title/coverConfig/pages/blocks) -
// BooksService.update() lam FULL-REPLACE cho pages+blocks (upsert cai co
// trong payload, XOA cai khong con trong payload) - xem comment trong
// books.service.ts de biet ly do chon huong nay thay vi chi upsert.
export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsObject()
  coverConfig?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageDto)
  pages?: PageDto[];
}
