import { IsString } from 'class-validator';

// Chuyen 1 category CON (nhom con/accordion) sang lam con cua 1 category GOC
// KHAC trong cung Series (yeu cau nguoi dung: "dịch chuyển cả cục accordion
// Architecture Map từ Explore kéo xuống Security") - khac MoveItemDto
// (chi doi thu tu len/xuong trong CUNG cha), day la doi HAN sang cha khac.
export class MoveCategoryToParentDto {
  @IsString()
  parentId!: string;
}
