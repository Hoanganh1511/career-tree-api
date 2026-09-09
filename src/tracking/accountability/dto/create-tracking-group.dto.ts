import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTrackingGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
