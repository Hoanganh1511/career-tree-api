import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
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

// [2026-10-09] Refactor Planner: Task/Event/Reminder. Rang buoc lich
// (scheduleKind <-> startAt/endAt/dueAt) KHONG kiem o day bang decorator
// (class-validator khong dien dat duoc "neu A thi B bat buoc" gon gang) ma
// o PlannerService.normalizeSchedule() - 1 cho DUY NHAT, dung chung cho ca
// create lan update, tranh lech luat giua 2 duong.

export class ChecklistItemDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsString()
  id?: string;
}

export class CreatePlannerItemDto {
  @IsEnum(PlannerItemType)
  type!: PlannerItemType;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

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

  // ISO 8601 day du (co gio) - khac han cot `date`/`deadline` @db.Date cu.
  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @IsOptional()
  @IsUrl({ require_protocol: false })
  @MaxLength(2000)
  meetingUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];

  // Luu nguyen van (chua co logic sinh instance) - xem comment schema.prisma.
  @IsOptional()
  recurrence?: Record<string, unknown>;
}
