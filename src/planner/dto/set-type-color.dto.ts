import { IsNotEmpty, IsString } from 'class-validator';

// paletteId tham chieu toi LIFE_ITEM_PALETTES ben FE (life-item-types.ts) -
// backend KHONG validate gia tri nay khop 1 bang co dinh nao (FE tu quan ly
// danh sach palette hien thi, giong pattern `color` hex cua PlannerItem
// truoc day - xem comment create-planner-item.dto.ts).
export class SetTypeColorDto {
  @IsString()
  @IsNotEmpty()
  paletteId!: string;
}
