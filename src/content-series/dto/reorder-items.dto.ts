import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

// Dung chung cho "reorder categories"/"reorder entries" (keo tha, thay the
// hoan toan cach goi move up/down nhieu lan) - FE tu tinh THU TU CUOI CUNG
// sau khi keo (vd bang arrayMove) roi gui nguyen mang id day du 1 lan, thay
// vi goi API tung buoc mot.
export class ReorderItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedIds!: string[];
}
