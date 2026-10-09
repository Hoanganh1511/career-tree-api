import { IsString, Matches } from 'class-validator';

// [2026-10-09] Thay SetTypeColorDto cu (ghi de mau theo itemType, da bo) -
// gio ghi de theo CATEGORY, va luu thang bo 3 hex thay vi 1 `paletteId`
// tham chieu bang palette ben FE (tu mo ta, khong phu thuoc FE registry).
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class SetCategoryColorDto {
  @IsString()
  @Matches(HEX, { message: 'main phải là mã hex, ví dụ #8B5CF6' })
  main!: string;

  @IsString()
  @Matches(HEX, { message: 'light phải là mã hex, ví dụ #F3E8FF' })
  light!: string;

  @IsString()
  @Matches(HEX, { message: 'border phải là mã hex, ví dụ #C4B5FD' })
  border!: string;
}
