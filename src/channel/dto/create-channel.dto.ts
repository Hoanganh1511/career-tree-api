import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateChannelDto {
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(['knowledge', 'tools'])
  group!: 'knowledge' | 'tools';

  @IsString()
  @IsNotEmpty()
  description!: string;
}
