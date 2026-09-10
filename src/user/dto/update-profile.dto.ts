import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// Redesign trang Settings - PATCH /users/me. Tat ca optional (chi gui field
// nao muon doi) - displayName/username nam tren User, con lai nam tren
// UserProfile (upsert, xem UserService.updateProfile).
export class UpdateProfileDto {
  @IsOptional()
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

  @IsOptional()
  @IsString()
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
}
