import { IsEnum } from 'class-validator';
import { ChecklistStatus } from '../../../generated/prisma/client';

export class UpdateChecklistStatusDto {
  @IsEnum(ChecklistStatus)
  status!: ChecklistStatus;
}
