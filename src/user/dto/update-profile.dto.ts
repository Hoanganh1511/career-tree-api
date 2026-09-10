import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

// Redesign trang Settings - PATCH /users/me. Tat ca optional (chi gui field
// nao muon doi) - displayName/username nam tren User, con lai nam tren
// UserProfile (upsert, xem UserService.updateProfile).
export class UpdateProfileDto {
  @IsOptional()
  @IsNotEmpty({ message: 'Tên hiển thị không được để trống' })
  @IsString()
  @MaxLength(100)
  displayName?: string;

  // Khop dung quy uoc sinh username tu dong trong syncUser() (a-z0-9), them
  // dau cham/gach duoi cho nguoi tu doi.
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9._]{3,30}$/, {
    message: 'username chỉ gồm chữ thường, số, dấu chấm, gạch dưới (3-30 ký tự)',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  // FE luon gui kem tien to https:// (xem EditProfileModal.tsx) - chi bo qua
  // @IsUrl khi rong (nguoi dung xoa het, muon bo trong website).
  @IsOptional()
  @ValidateIf((o) => !!o.websiteUrl)
  @IsUrl()
  @MaxLength(200)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  pronouns?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  // "Đổi ảnh" that (Settings + ProfileSidebar) - URL tra ve tu POST /uploads
  // (kind=image, S3 that, xem UploadService) da upload SAN o client, DTO nay
  // chi luu lai URL, khong nhan file truc tiep. `null` = XOA anh (khac voi
  // undefined = khong gui field nay, giu nguyen - xem UserService.
  // updateProfile dung `!== undefined` de phan biet 2 truong hop). ValidateIf
  // bo qua @IsUrl khi gia tri la null, van bat buoc URL hop le khi la string.
  @IsOptional()
  @ValidateIf((o) => o.avatarUrl !== null)
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.coverImageUrl !== null)
  @IsUrl()
  @MaxLength(500)
  coverImageUrl?: string | null;
}
