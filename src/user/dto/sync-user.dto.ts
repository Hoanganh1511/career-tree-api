import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SyncUserDto {
  @IsString()
  @IsNotEmpty()
  googleId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}
