import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTrackingMilestoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
}
