import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

// Giu NGUYEN VAN gia tri khop 1-1 voi model PlannerSettings (schema.prisma)
// + PlannerSettingsModal.tsx phia FE.
const WEEK_STARTS_ON = ['MONDAY', 'SUNDAY'] as const;
const TIME_FORMATS = ['24H', '12H'] as const;
const DENSITIES = ['COMPACT', 'COMFORTABLE'] as const;
const TIME_SLOT_MINUTES = [15, 30, 60] as const;
const COMPLETED_TASK_DISPLAYS = ['KEEP_VISIBLE', 'COLLAPSE', 'HIDE'] as const;
const COMPLETED_TASK_STYLES = [
  'CHECK_ICON',
  'CHECK_COLOR',
  'DONE_BADGE',
  'PATTERN',
] as const;

// Moi field OPTIONAL - PATCH = cap nhat tung phan (chi gui field thay doi),
// khong bat buoc gui ca object. Khong co field nao tuong ung 1 Prisma model
// field = bo qua khi upsert (PlannerService.updateSettings spread thang dto).
export class UpdatePlannerSettingsDto {
  @IsOptional()
  @IsIn(WEEK_STARTS_ON)
  weekStartsOn?: (typeof WEEK_STARTS_ON)[number];

  @IsOptional()
  @IsIn(TIME_FORMATS)
  timeFormat?: (typeof TIME_FORMATS)[number];

  @IsOptional()
  @IsBoolean()
  showWeekends?: boolean;

  @IsOptional()
  @IsBoolean()
  showAllDaySection?: boolean;

  @IsOptional()
  @IsIn(DENSITIES)
  density?: (typeof DENSITIES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  workingHoursStart?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  workingHoursEnd?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  firstVisibleHour?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  lastVisibleHour?: number;

  @IsOptional()
  @IsIn(TIME_SLOT_MINUTES)
  timeSlotMinutes?: (typeof TIME_SLOT_MINUTES)[number];

  @IsOptional()
  @IsBoolean()
  showTaskType?: boolean;

  @IsOptional()
  @IsBoolean()
  showDuration?: boolean;

  @IsOptional()
  @IsBoolean()
  showArea?: boolean;

  @IsOptional()
  @IsBoolean()
  showProject?: boolean;

  @IsOptional()
  @IsBoolean()
  showPriority?: boolean;

  @IsOptional()
  @IsIn(COMPLETED_TASK_DISPLAYS)
  completedTaskDisplay?: (typeof COMPLETED_TASK_DISPLAYS)[number];

  @IsOptional()
  @IsIn(COMPLETED_TASK_STYLES)
  completedTaskStyle?: (typeof COMPLETED_TASK_STYLES)[number];
}
