import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MessageType } from '../../../generated/prisma/client';

export type MessageSearchSort = 'relevance' | 'recent';

// Query cho GET /conversations/messages/search (tim toan bo hoi thoai nguoi
// dung tham gia, hoac 1 hoi thoai neu truyen conversationId) - xem
// ChatSearchService.search(). Global ValidationPipe (main.ts, transform:
// true) tu chuyen query string sang dung kieu khai bao o day.
export class SearchMessagesQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  q!: string;

  // Bo trong = tim trong TAT CA hoi thoai dang tham gia. LUU Y: quyen truy
  // cap KHONG phu thuoc field nay - ChatSearchService luon loc lai theo
  // ConversationParticipant O TANG QUERY SQL, du co truyen conversationId
  // hay khong (xem comment trong service).
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  senderId?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['relevance', 'recent'])
  sort?: MessageSearchSort = 'relevance';

  // Cursor opaque (base64url cua {id, rank?}) - xem encodeCursor/decodeCursor
  // trong chat-search.service.ts.
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
