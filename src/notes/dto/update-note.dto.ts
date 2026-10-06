import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

const NOTE_TYPES = [
  'keyPoint',
  'insight',
  'watchOut',
  'question',
  'connection',
  'personal',
] as const;

// Chi cho sua type/content/tags - quote/entry KHONG doi sau khi tao (immutable
// reference toi doan text goc, xem comment CreateNoteDto).
export class UpdateNoteDto {
  @IsOptional()
  @IsIn(NOTE_TYPES)
  type?: (typeof NOTE_TYPES)[number];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}
