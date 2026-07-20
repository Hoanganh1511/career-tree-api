import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsIn(['SYSTEM', 'CONNECTION'])
  type!: 'SYSTEM' | 'CONNECTION';

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;
}
