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
  ValidateIf,
} from 'class-validator';

const ITEM_TYPES = ['ACTION', 'EVENT', 'HABIT', 'REFLECTION'] as const;
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;

export class UpdatePlannerItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsIn(ITEM_TYPES)
  itemType?: (typeof ITEM_TYPES)[number];

  // Gio NULL de bo gio da dat - phan biet voi "khong truyen gi" (undefined =
  // giu nguyen) qua kiem tra `'scheduledMinute' in dto` o PlannerService.
  @IsOptional()
  @IsInt()
  @Min(0)
  scheduledMinute?: number | null;

  // null = bo mau da dat (ve lai mac dinh), cung tinh than voi scheduledMinute
  // o tren - phan biet voi "khong truyen" (giu nguyen) qua `'color' in dto`.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'Mã màu phải ở định dạng hex (vd "#ef4444").',
  })
  color?: string | null;

  // [2026-10-07] null = bo mau RIENG da chon (quay lai mau theo itemType),
  // cung tinh than cac field nullable khac o day - yeu cau nguoi dung: "chọn
  // màu này sẽ là màu của card, không liên quan tới loại của card".
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  colorPaletteId?: string | null;

  // null = bo thoi luong da dat, cung tinh than voi scheduledMinute/color o
  // tren - phan biet voi "khong truyen" qua `'durationMinutes' in dto`.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  durationMinutes?: number | null;

  @IsOptional()
  @IsBoolean()
  isFocus?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  // --- Metadata moi - deu nullable (xoa gia tri da dat) cung tinh than
  // scheduledMinute/color/durationMinutes o tren, phan biet qua `'field' in dto`.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(PRIORITIES)
  priority?: (typeof PRIORITIES)[number] | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  status?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  area?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  project?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  deadline?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  metadata?: Record<string, unknown> | null;

  // null = xoa noi dung chi tiet da dat, cung tinh than cac field null-able
  // khac o tren (phan biet voi "khong truyen" qua `'description' in dto`).
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  description?: string | null;
}
