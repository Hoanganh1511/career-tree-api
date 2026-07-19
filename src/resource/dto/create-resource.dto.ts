import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ResourceType } from '../../../generated/prisma/client';

export class CreateResourceDto {
  @IsEnum(ResourceType)
  type!: ResourceType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsUrl()
  url!: string;
}
