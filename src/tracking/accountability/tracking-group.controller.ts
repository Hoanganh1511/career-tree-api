import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TrackingGroupService } from './tracking-group.service';
import { CurrentUserId } from '../../auth/current-user.decorator';
import { CreateTrackingGroupDto } from './dto/create-tracking-group.dto';
import { JoinTrackingGroupDto } from './dto/join-tracking-group.dto';
import { CreateTrackingGroupSessionDto } from './dto/create-tracking-group-session.dto';
import { EndTrackingGroupSessionDto } from './dto/end-tracking-group-session.dto';

@Controller('tracking/groups')
export class TrackingGroupController {
  constructor(private trackingGroupService: TrackingGroupService) {}

  @Get('mine')
  listMine(@CurrentUserId() userId: string) {
    return this.trackingGroupService.listMine(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateTrackingGroupDto) {
    return this.trackingGroupService.create(userId, dto);
  }

  @Post('join')
  join(@CurrentUserId() userId: string, @Body() dto: JoinTrackingGroupDto) {
    return this.trackingGroupService.join(userId, dto);
  }

  @Get(':id')
  getGroup(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.trackingGroupService.getGroup(userId, id);
  }

  @Post(':id/sessions')
  createSession(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: CreateTrackingGroupSessionDto,
  ) {
    return this.trackingGroupService.createSession(userId, id, dto);
  }

  @Patch('sessions/:sessionId')
  endSession(
    @CurrentUserId() userId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: EndTrackingGroupSessionDto,
  ) {
    return this.trackingGroupService.endSession(userId, sessionId, dto);
  }
}
