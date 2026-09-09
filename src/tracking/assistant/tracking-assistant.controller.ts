import { Controller, Post } from '@nestjs/common';
import { TrackingAssistantService } from './tracking-assistant.service';
import { TrackingAnalyticsService } from '../analytics/tracking-analytics.service';
import { CurrentUserId } from '../../auth/current-user.decorator';

@Controller('tracking/assistant')
export class TrackingAssistantController {
  constructor(
    private trackingAssistantService: TrackingAssistantService,
    private trackingAnalyticsService: TrackingAnalyticsService,
  ) {}

  @Post('coach')
  async coach(@CurrentUserId() userId: string) {
    const summary = await this.trackingAnalyticsService.weeklySummary(userId);
    return this.trackingAssistantService.coach(summary);
  }
}
