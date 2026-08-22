import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  GROUP_AVATAR_COLORS,
  type GroupAvatarColor,
} from './create-group-conversation.dto';

export class UpdateGroupInfoDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsIn(GROUP_AVATAR_COLORS)
  @IsOptional()
  avatarColor?: GroupAvatarColor;
}
