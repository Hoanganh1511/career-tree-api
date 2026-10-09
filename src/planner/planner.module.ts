import { Module } from '@nestjs/common';
import { PlannerService } from './planner.service';
import {
  PlannerController,
  PlannerCategoryColorController,
  PlannerSettingsController,
} from './planner.controller';

@Module({
  providers: [PlannerService],
  controllers: [
    PlannerController,
    PlannerCategoryColorController,
    PlannerSettingsController,
  ],
})
export class PlannerModule {}
