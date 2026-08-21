import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateConversationSettingsDto {
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @IsBoolean()
  @IsOptional()
  isMuted?: boolean;

  @IsBoolean()
  @IsOptional()
  isRestricted?: boolean;
}
