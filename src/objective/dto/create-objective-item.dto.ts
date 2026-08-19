import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ObjectiveItemType } from '../../../generated/prisma/client';

export class CreateObjectiveItemDto {
  @IsEnum(ObjectiveItemType)
  type!: ObjectiveItemType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label!: string;
}
