import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
} from 'class-validator';

export class AddGroupMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(255)
  @ArrayUnique()
  @IsString({ each: true })
  memberIds!: string[];
}
