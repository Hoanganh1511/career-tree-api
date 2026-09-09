import { IsBoolean } from 'class-validator';

export class EndTrackingGroupSessionDto {
  @IsBoolean()
  completed!: boolean;
}
