import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class ChannelController {
  constructor(private channelService: ChannelService) {}

  @Get('communities/:communityId/channels')
  findAll(
    @CurrentUserId() userId: string,
    @Param('communityId') communityId: string,
  ) {
    return this.channelService.findAllForCommunity(userId, communityId);
  }

  @Post('communities/:communityId/channels')
  create(
    @CurrentUserId() userId: string,
    @Param('communityId') communityId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelService.create(userId, communityId, dto);
  }

  @Get('communities/:communityId/channels/pending')
  listPending(
    @CurrentUserId() userId: string,
    @Param('communityId') communityId: string,
  ) {
    return this.channelService.listPending(userId, communityId);
  }

  @Patch('communities/:communityId/channels/:channelId/approve')
  approve(
    @CurrentUserId() userId: string,
    @Param('communityId') communityId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.channelService.approve(userId, communityId, channelId);
  }

  @Patch('communities/:communityId/channels/:channelId/reject')
  reject(
    @CurrentUserId() userId: string,
    @Param('communityId') communityId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.channelService.reject(userId, communityId, channelId);
  }
}
