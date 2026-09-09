import { IsNotEmpty, IsString } from 'class-validator';

export class JoinTrackingGroupDto {
  @IsString()
  @IsNotEmpty()
  inviteCode!: string;
}
