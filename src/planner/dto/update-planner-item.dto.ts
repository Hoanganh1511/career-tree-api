import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PlannerCategory,
  PlannerItemType,
  PlannerPriority,
  PlannerScheduleKind,
  PlannerStatus,
} from '../../../generated/prisma/client';
import { ChecklistItemDto } from './create-planner-item.dto';

// [2026-10-09] PATCH - moi field deu optional. Cac field NULLABLE dung
// @ValidateIf(... !== null) de phan biet 3 truong hop:
//   khong truyen  -> giu nguyen
//   truyen null   -> XOA gia tri
//   truyen gia tri-> dat moi
export class UpdatePlannerItemDto {
  @IsOptional()
  @IsEnum(PlannerItemType)
  type?: PlannerItemType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(10000)
  description?: string | null;

  @IsOptional()
  @IsEnum(PlannerCategory)
  category?: PlannerCategory;

  @IsOptional()
  @IsEnum(PlannerStatus)
  status?: PlannerStatus;

  @IsOptional()
  @IsEnum(PlannerPriority)
  priority?: PlannerPriority;

  @IsOptional()
  @IsEnum(PlannerScheduleKind)
  scheduleKind?: PlannerScheduleKind;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsISO8601()
  startAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsISO8601()
  endAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsISO8601()
  dueAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(300)
  location?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUrl({ require_protocol: false })
  @MaxLength(2000)
  meetingUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[] | null;

  @IsOptional()
  recurrence?: Record<string, unknown> | null;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
