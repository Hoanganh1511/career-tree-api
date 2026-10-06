import { Module } from '@nestjs/common';
import { PlannerService } from './planner.service';
import {
  PlannerController,
  PlannerTypeColorController,
} from './planner.controller';

@Module({
  providers: [PlannerService],
  controllers: [PlannerController, PlannerTypeColorController],
})
export class PlannerModule {}
