import { Controller, Get, Post } from '@nestjs/common';
import { TrackingAnalyticsService } from './tracking-analytics.service';
import { CurrentUserId } from '../../auth/current-user.decorator';

@Controller('tracking/analytics')
export class TrackingAnalyticsController {
  constructor(private trackingAnalyticsService: TrackingAnalyticsService) {}

  @Get('weekly')
  weekly(@CurrentUserId() userId: string) {
    return this.trackingAnalyticsService.weeklySummary(userId);
  }

  @Get('recommendation')
  recommendation(@CurrentUserId() userId: string) {
    return this.trackingAnalyticsService.recommendation(userId);
  }

  @Post('apply-best-hour')
  applyBestHour(@CurrentUserId() userId: string) {
    return this.trackingAnalyticsService.applyBestHour(userId);
  }
}
