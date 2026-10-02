import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const KINDS = ['SIMPLE', 'BIG'] as const;

export class CreatePlannerItemDto {
  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  // Chi top-level item (khong co parentId) moi can chon kind - item con LUON
  // la SIMPLE o PlannerService (xem comment do), bo qua field nay neu co
  // truyen parentId.
  @IsOptional()
  @IsIn(KINDS)
  kind?: (typeof KINDS)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  scheduledMinute?: number;

  // Chen 1 dau viec CON vao duoi 1 planner "lớn" da co san (phai la top-level
  // item, PlannerService tu kiem tra chu so huu + khong cho long qua 1 cap).
  @IsOptional()
  @IsString()
  parentId?: string;
}
