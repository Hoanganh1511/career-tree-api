import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { NodeKind, Difficulty } from '../../../generated/prisma/client';
export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsOptional()
  @IsBoolean()
  hiddenFromShare?: boolean;

  @IsOptional()
  @IsBoolean()
  isCollapsed?: boolean;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  x?: number;

  @IsOptional()
  @IsNumber()
  y?: number;

  @IsOptional()
  @IsEnum(NodeKind)
  kind?: NodeKind;
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @IsOptional()
  @IsString()
  estimatedTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningOutcomes?: string[];

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
