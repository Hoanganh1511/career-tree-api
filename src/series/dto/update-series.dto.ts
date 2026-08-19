import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateSeriesDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  // Xem comment DocumentSeries.category trong schema.prisma - truyen chuoi
  // rong ("") de xoa phan loai (ve "Chưa phân loại"), khac undefined (khong
  // doi gi, Prisma bo qua field undefined trong data update).
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
