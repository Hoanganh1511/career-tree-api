import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateObjectiveDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
