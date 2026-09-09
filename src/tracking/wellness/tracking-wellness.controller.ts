import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { TrackingWellnessService } from './tracking-wellness.service';
import { CurrentUserId } from '../../auth/current-user.decorator';
import { UpsertTrackingWellnessLogDto } from './dto/upsert-tracking-wellness-log.dto';

@Controller('tracking/wellness')
export class TrackingWellnessController {
  constructor(private trackingWellnessService: TrackingWellnessService) {}

  // Dat TRUOC ':date' - "sleep-insight" la literal segment, phai khai bao
  // truoc route co :date o CUNG do sau (1 segment) de khong bi :date nuot
  // nham (cung tien le voi "reality-check" o tracking-goal.controller.ts).
  @Get('sleep-insight')
  sleepInsight(@CurrentUserId() userId: string) {
    return this.trackingWellnessService.sleepInsight(userId);
  }

  @Get(':date')
  get(@CurrentUserId() userId: string, @Param('date') date: string) {
    return this.trackingWellnessService.get(userId, date);
  }

  @Put(':date')
  upsert(
    @CurrentUserId() userId: string,
    @Param('date') date: string,
    @Body() dto: UpsertTrackingWellnessLogDto,
  ) {
    return this.trackingWellnessService.upsert(userId, date, dto);
  }
}
