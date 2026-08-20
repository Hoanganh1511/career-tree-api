import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';

@Module({
  imports: [NotificationModule],
  providers: [FollowService],
  controllers: [FollowController],
  exports: [FollowService],
})
export class FollowModule {}
