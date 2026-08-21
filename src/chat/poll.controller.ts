import { Body, Controller, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { VotePollDto } from './dto/vote-poll.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

// Route rieng ngoai /conversations - bo phieu chi can pollId, khong can
// biet conversationId (giong cach ReactionController tach khoi PostController).
@Controller('polls')
export class PollController {
  constructor(private chatService: ChatService) {}

  @Post(':id/vote')
  vote(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: VotePollDto,
  ) {
    return this.chatService.votePoll(userId, id, dto.optionId);
  }
}
