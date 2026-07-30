import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FollowModule } from 'src/follow/follow.module';

@Module({
  imports: [FollowModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
