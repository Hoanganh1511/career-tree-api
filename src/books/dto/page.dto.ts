import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BlockDto } from './block.dto';

export class PageDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsInt()
  @Min(0)
  order!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks!: BlockDto[];
}
