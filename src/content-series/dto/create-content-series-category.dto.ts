import { IsOptional, IsString, MaxLength } from 'class-validator';

// parentId gio DA expose (truoc day MVP chua lam, xem git history) - yeu cau
// nguoi dung: "sau cái cate đó, tôi có thể thêm bài viết thẳng hoặc chọn tạo
// 1 accordian" - accordion chinh la 1 category CON (parentId tro toi category
// cha), hien accordion o SeriesSidebar.tsx (khac category goc, luon tinh).
export class CreateContentSeriesCategoryDto {
  @IsString()
  @MaxLength(100)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorHex?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
