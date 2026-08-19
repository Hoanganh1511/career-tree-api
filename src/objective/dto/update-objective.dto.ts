import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateObjectiveDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  // Cho phep xoa description bang chuoi rong ("") - IsOptional chi bo qua
  // khi undefined, khong bo qua chuoi rong nen van hop le.
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
