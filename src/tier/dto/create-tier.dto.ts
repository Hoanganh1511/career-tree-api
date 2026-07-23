import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTierDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  sublabel!: string;
}
