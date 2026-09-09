import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTrackingGroupSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  goalText!: string;
}
