import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class SyncUserDto {
  @IsString()
  @IsNotEmpty()
  googleId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  // Tu claim "picture" cua Google ID token - dung lam avatar mac dinh cho
  // Post.author/profile (xem username/avatarUrl trong User model). Optional
  // vi khong phai provider OIDC nao cung tra claim nay.
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
