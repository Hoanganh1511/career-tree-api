import { Module } from '@nestjs/common';
import { TrackingGoalService } from './goal/tracking-goal.service';
import { TrackingGoalController } from './goal/tracking-goal.controller';
import { TrackingTimeBlockService } from './weekly/tracking-time-block.service';
import { TrackingTimeBlockController } from './weekly/tracking-time-block.controller';
import { TrackingTaskService } from './daily/tracking-task.service';
import { TrackingTaskController } from './daily/tracking-task.controller';
import { TrackingEnergyService } from './energy/tracking-energy.service';
import { TrackingEnergyController } from './energy/tracking-energy.controller';
import { TrackingWellnessService } from './wellness/tracking-wellness.service';
import { TrackingWellnessController } from './wellness/tracking-wellness.controller';
import { TrackingGroupService } from './accountability/tracking-group.service';
import { TrackingGroupController } from './accountability/tracking-group.controller';
import { TrackingAnalyticsService } from './analytics/tracking-analytics.service';
import { TrackingAnalyticsController } from './analytics/tracking-analytics.controller';
import { TrackingAssistantService } from './assistant/tracking-assistant.service';
import { TrackingAssistantController } from './assistant/tracking-assistant.controller';

// 1 module gop ca 7 domain (Goal/Weekly/Daily/Energy/Wellness/
// Accountability/Analytics + Assistant) - do gan nhau, dung chung Prisma,
// khong can tach 7 module NestJS rieng (do app.module.ts 1 dong thay vi 7).
@Module({
  providers: [
    TrackingGoalService,
    TrackingTimeBlockService,
    TrackingTaskService,
    TrackingEnergyService,
    TrackingWellnessService,
    TrackingGroupService,
    TrackingAnalyticsService,
    TrackingAssistantService,
  ],
  controllers: [
    TrackingGoalController,
    TrackingTimeBlockController,
    TrackingTaskController,
    TrackingEnergyController,
    TrackingWellnessController,
    TrackingGroupController,
    TrackingAnalyticsController,
    TrackingAssistantController,
  ],
})
export class TrackingModule {}
