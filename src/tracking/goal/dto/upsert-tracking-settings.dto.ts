import { IsNumber, Max, Min } from 'class-validator';

export class UpsertTrackingSettingsDto {
  @IsNumber()
  @Min(0)
  @Max(168)
  weeklyAvailableHours!: number;
}
