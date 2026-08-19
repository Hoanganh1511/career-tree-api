import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChecklistGroup } from '../../../generated/prisma/client';

export class CreateChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  // Section trong "Ke hoach hoc tap" (xem enum ChecklistGroup trong schema) -
  // khong truyen -> Prisma dung default OBJECTIVE.
  @IsOptional()
  @IsEnum(ChecklistGroup)
  group?: ChecklistGroup;
}
