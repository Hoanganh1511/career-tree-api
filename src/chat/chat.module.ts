import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [NotificationModule],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
