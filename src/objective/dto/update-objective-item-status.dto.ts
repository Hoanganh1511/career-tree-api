import { IsEnum } from 'class-validator';
import { ChecklistStatus } from '../../../generated/prisma/client';

export class UpdateObjectiveItemStatusDto {
  @IsEnum(ChecklistStatus)
  status!: ChecklistStatus;
}
