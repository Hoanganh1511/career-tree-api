import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FollowModule } from 'src/follow/follow.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  // NotificationModule export san NotificationGateway (dung chung cho ca
  // chat, xem comment trong notification.module.ts) - UserService can no de
  // tra loi "ai dang online" (getOnlineStatusByUsernames), khong tao ket
  // noi WebSocket rieng.
  imports: [FollowModule, NotificationModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
