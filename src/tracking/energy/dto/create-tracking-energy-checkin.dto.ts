import { IsInt, Max, Min } from 'class-validator';

export class CreateTrackingEnergyCheckinDto {
  @IsInt()
  @Min(1)
  @Max(5)
  physical!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  emotional!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  mental!: number;
}
