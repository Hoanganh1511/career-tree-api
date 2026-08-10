import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommunityMemberService } from './community-member.service';
import { JoinCommunityDto } from './dto/join-community.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('communities/:communityId')
export class CommunityMemberController {
  constructor(private memberService: CommunityMemberService) {}

  @Post('join')
  join(
    @CurrentUserId() userId: string,
    @Param('communityId') communityId: string,
    @Body() dto: JoinCommunityDto,
  ) {
    return this.memberService.requestJoin(userId, communityId, dto.reason);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('join')
  leave(
    @CurrentUserId() userId: string,
    @Param('communityId') communityId: string,
  ) {
    return this.memberService.leave(userId, communityId);
  }

  @Get('members')
  listMembers(
    @CurrentUserId() userId: string,
    @Param('communityId') communityId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.memberService.listMembers(userId, communityId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('members/:memberId/approve')
  approve(
    @CurrentUserId() userId: string,
    @Param('communityId') communityId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.memberService.approve(userId, communityId, memberId);
  }

  @Patch('members/:memberId/reject')
  reject(
    @CurrentUserId() userId: string,
    @Param('communityId') communityId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.memberService.reject(userId, communityId, memberId);
  }
}
