import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ChatService } from './chat.service';
import { ChatSearchService } from './chat-search.service';
import { ChatController } from './chat.controller';
import { PollController } from './poll.controller';
import { MessageReactionController } from './message-reaction.controller';

@Module({
  imports: [NotificationModule],
  providers: [ChatService, ChatSearchService],
  controllers: [ChatController, PollController, MessageReactionController],
})
export class ChatModule {}
