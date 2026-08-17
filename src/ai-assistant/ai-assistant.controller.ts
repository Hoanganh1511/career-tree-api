import { Body, Controller, Param, Post } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { AskAiAssistantDto } from './dto/ask-ai-assistant.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class AiAssistantController {
  constructor(private aiAssistantService: AiAssistantService) {}

  @Post('workspaces/:workspaceId/ai-assistant/ask')
  ask(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: AskAiAssistantDto,
  ) {
    return this.aiAssistantService.ask(userId, workspaceId, dto.messages);
  }
}
