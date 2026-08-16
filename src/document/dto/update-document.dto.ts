import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  summary?: string;

  @IsOptional()
  @IsObject()
  overview?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  // Bat/tat hien thi LICH SU checklist (ChecklistItemLog) cho nguoi doc khac
  // - xem comment Document.checklistLogPublic trong schema.prisma.
  @IsOptional()
  @IsBoolean()
  checklistLogPublic?: boolean;
}
