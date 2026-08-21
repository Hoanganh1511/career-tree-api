import { Body, Controller, Delete, Param, Put } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ReactMessageDto } from './dto/react-message.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

// Route rieng ngoai /conversations - giong PollController, chi can messageId
// (khong can biet conversationId).
@Controller('messages')
export class MessageReactionController {
  constructor(private chatService: ChatService) {}

  @Put(':id/reactions')
  react(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: ReactMessageDto,
  ) {
    return this.chatService.reactToMessage(userId, id, dto.emoji);
  }

  @Delete(':id/reactions')
  unreact(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.chatService.removeReaction(userId, id);
  }
}
