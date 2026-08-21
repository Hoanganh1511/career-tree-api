import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PollController } from './poll.controller';

@Module({
  imports: [NotificationModule],
  providers: [ChatService],
  controllers: [ChatController, PollController],
})
export class ChatModule {}
