import { IsNotEmpty, IsString } from 'class-validator';

export class VotePollDto {
  @IsString()
  @IsNotEmpty()
  optionId!: string;
}
