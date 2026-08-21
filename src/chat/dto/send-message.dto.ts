import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MessageType } from '../../../generated/prisma/client';

export class PollOptionInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  text!: string;
}

export class PollInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  question!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PollOptionInputDto)
  options!: PollOptionInputDto[];
}

// Cross-field validation (TEXT can content, IMAGE/FILE/VOICE/GIF can
// attachmentUrl, POLL can poll) nam trong ChatService.sendMessage - class-
// validator khong hop de dieu kien theo `type` o day.
export class SendMessageDto {
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  content?: string;

  @IsUrl()
  @IsOptional()
  attachmentUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  attachmentName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  attachmentMimeType?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  attachmentSize?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  durationSeconds?: number;

  @ValidateNested()
  @Type(() => PollInputDto)
  @IsOptional()
  poll?: PollInputDto;

  @IsString()
  @IsOptional()
  replyToId?: string;
}
