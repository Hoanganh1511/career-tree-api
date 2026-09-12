import { IsOptional, IsString, MaxLength } from 'class-validator';

// MVP soan Series: chua ho tro nested sub-category tu UI (schema van cho
// phep qua parentId, chi khong expose o day) - xem comment SeriesTreeEditor
// ben frontend.
export class CreateContentSeriesCategoryDto {
  @IsString()
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorHex?: string;
}
