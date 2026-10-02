import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePlannerItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  // Gio NULL de bo gio da dat - phan biet voi "khong truyen gi" (undefined =
  // giu nguyen) qua kiem tra `'scheduledMinute' in dto` o PlannerService.
  @IsOptional()
  @IsInt()
  @Min(0)
  scheduledMinute?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
