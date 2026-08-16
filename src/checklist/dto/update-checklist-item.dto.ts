import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateChecklistItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label?: string;

  // Cho phep xoa note bang chuoi rong ("") - IsOptional chi bo qua khi
  // undefined, khong bo qua chuoi rong nen van hop le.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
