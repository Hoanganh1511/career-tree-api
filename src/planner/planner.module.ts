import { Module } from '@nestjs/common';
import { PlannerService } from './planner.service';
import {
  PlannerController,
  PlannerTypeColorController,
  PlannerSettingsController,
} from './planner.controller';

@Module({
  providers: [PlannerService],
  controllers: [
    PlannerController,
    PlannerTypeColorController,
    PlannerSettingsController,
  ],
})
export class PlannerModule {}
