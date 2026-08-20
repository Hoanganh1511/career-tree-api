import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';

@Module({
  providers: [NotificationService, NotificationGateway],
  controllers: [NotificationController],
  // NotificationGateway export them - ChatModule tai dung CUNG 1 gateway/ket
  // noi WebSocket nay de emit "chat:message" (xem ChatService), khong mo
  // gateway rieng.
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
