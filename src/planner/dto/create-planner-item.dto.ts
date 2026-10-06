import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const KINDS = ['SIMPLE', 'BIG'] as const;
// Giu NGUYEN VAN gia tri khop 1-1 voi LIFE_ITEM_TYPES phia FE (xem
// life-item-types.ts) - xem comment day du o schema.prisma (enum LifeItemType).
const ITEM_TYPES = ['ACTION', 'EVENT', 'HABIT', 'REFLECTION'] as const;
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;

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

  // [2026-10-06] "Good Life - Life Management System" - mac dinh ACTION
  // (khong truyen gi van la 1 viec can lam, tuong thich voi hanh vi CU).
  @IsOptional()
  @IsIn(ITEM_TYPES)
  itemType?: (typeof ITEM_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  scheduledMinute?: number;

  // Mau the (hex "#rrggbb") - TRUOC DAY nguoi dung tu chon luc tao, GIU LAI
  // field de tuong thich API cu nhung KHONG CON duoc FE doc de hien thi mau
  // (mau gio la semantic theo itemType - xem comment schema.prisma).
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'Mã màu phải ở định dạng hex (vd "#ef4444").',
  })
  color?: string;

  // Thoi luong (phut) - xem comment schema.prisma. Toi thieu 1 phut (0 vo
  // nghia cho 1 khoang thoi gian).
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  // Danh dau "việc trọng tâm hôm nay" - xem comment schema.prisma.
  @IsOptional()
  @IsBoolean()
  isFocus?: boolean;

  // Chen 1 dau viec CON vao duoi 1 planner "lớn" da co san (phai la top-level
  // item, PlannerService tu kiem tra chu so huu + khong cho long qua 1 cap).
  @IsOptional()
  @IsString()
  parentId?: string;

  // --- Metadata moi (spec "Good Life", section 8-16) - dung CHUNG cho moi
  // Type, hoan toan optional ("progressive disclosure").
  @IsOptional()
  @IsIn(PRIORITIES)
  priority?: (typeof PRIORITIES)[number];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  project?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsDateString()
  deadline?: string;

  // Field RIENG theo Type (Event: location/participants/meetingUrl; Habit:
  // frequencyPerWeek/preferredDays/preferredTime/target; Reflection:
  // prompts[]) - xem comment day du o schema.prisma (cot `metadata` Json).
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  // [2026-10-07] "Nội dung chi tiết" tu do - yeu cau nguoi dung: "task cần
  // phải có phần viết nội dung chi tiết của task nữa". Khac `title` (ngan,
  // bat buoc) - field nay optional, dai bao nhieu cung duoc.
  @IsOptional()
  @IsString()
  description?: string;
}
