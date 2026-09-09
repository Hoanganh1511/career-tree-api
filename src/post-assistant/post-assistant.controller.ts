import { Body, Controller, Post } from '@nestjs/common';
import { PostAssistantService } from './post-assistant.service';
import {
  ChatAboutPostDraftDto,
  ImprovePostDraftDto,
} from './dto/post-assistant.dto';

// Khong can @CurrentUserId() - JwtAuthGuard toan cuc da dam bao dang nhap la
// du, khong co truy van DB/quyen rieng nao can biet userId (khac
// ai-assistant/ - noi userId dung de loc KnowledgeGroup xem duoc).
@Controller('post-assistant')
export class PostAssistantController {
  constructor(private postAssistantService: PostAssistantService) {}

  @Post('improve')
  improve(@Body() dto: ImprovePostDraftDto) {
    return this.postAssistantService.improve(dto.content, dto.instruction);
  }

  @Post('chat')
  chat(@Body() dto: ChatAboutPostDraftDto) {
    return this.postAssistantService.chat(dto.content, dto.messages);
  }
}
