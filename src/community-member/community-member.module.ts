import { Module } from '@nestjs/common';
import { CommunityMemberService } from './community-member.service';
import { CommunityMemberController } from './community-member.controller';

@Module({
  providers: [CommunityMemberService],
  controllers: [CommunityMemberController],
})
export class CommunityMemberModule {}
