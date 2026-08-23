import { IsInt, IsOptional, Min } from 'class-validator';

// Spec Phase 1 khong chi tiet body cho endpoint nay - de `order` TUY CHON,
// bo trong thi BooksService tu tinh (max hien co + 1, tuc them vao CUOI
// sach). Truyen `order` neu FE can chen trang vao giua (chua dung o Phase 1).
export class CreatePageDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
