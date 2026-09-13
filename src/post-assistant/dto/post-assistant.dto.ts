import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

// Truoc day import tu ai-assistant/dto/ask-ai-assistant.dto.ts (module do
// da bi xoa cung tinh nang Workspace, 2026-09-14) - chuyen dinh nghia ve day
// vi post-assistant la noi tieu thu DUY NHAT con lai.
export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content!: string;
}

// Composer.tsx "AI hỗ trợ" - doan dang viet (content) + 1 yeu cau tu do
// (instruction, vd "Viết tiếp"/"Rút gọn" hoặc nguoi dung tu go) -> tra ve 1
// doan goi y de chen/thay vao editor.
export class ImprovePostDraftDto {
  @IsString()
  content!: string;

  @IsString()
  @IsNotEmpty()
  instruction!: string;
}

// Composer.tsx tab "Trợ lý AI" - chat nhieu luot VE doan dang viet (content
// gui lai MOI request, khong luu lich su phia backend - Composer tu giu
// state `chatMessages` cuc bo, giong WorkspaceAiAssistant.tsx).
export class ChatAboutPostDraftDto {
  @IsString()
  content!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];
}
