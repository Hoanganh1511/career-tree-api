import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
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

  // Mau the (hex "#rrggbb") - nguoi dung tu chon luc tao, xem comment
  // schema.prisma. Khong gioi han IsIn 1 bang mau co dinh o backend (frontend
  // tu quan ly bang mau hien thi) - chi can dung dinh dang hex de tranh luu
  // rac (vd nguoi dung sua request thu cong).
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'Mã màu phải ở định dạng hex (vd "#ef4444").',
  })
  color?: string;

  // Chen 1 dau viec CON vao duoi 1 planner "lớn" da co san (phai la top-level
  // item, PlannerService tu kiem tra chu so huu + khong cho long qua 1 cap).
  @IsOptional()
  @IsString()
  parentId?: string;
}
