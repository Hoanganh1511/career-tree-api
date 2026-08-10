import { Module } from '@nestjs/common';
import { CommunityPostService } from './community-post.service';
import { CommunityPostController } from './community-post.controller';

@Module({
  providers: [CommunityPostService],
  controllers: [CommunityPostController],
})
export class CommunityPostModule {}
