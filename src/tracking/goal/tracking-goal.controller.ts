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
  Put,
} from '@nestjs/common';
import { TrackingGoalService } from './tracking-goal.service';
import { CurrentUserId } from '../../auth/current-user.decorator';
import { CreateTrackingGoalDto } from './dto/create-tracking-goal.dto';
import { UpdateTrackingGoalDto } from './dto/update-tracking-goal.dto';
import { CreateTrackingGoalStepDto } from './dto/create-tracking-goal-step.dto';
import { UpdateTrackingGoalStepDto } from './dto/update-tracking-goal-step.dto';
import { CreateTrackingMilestoneDto } from './dto/create-tracking-milestone.dto';
import { UpdateTrackingMilestoneDto } from './dto/update-tracking-milestone.dto';
import { UpsertTrackingSettingsDto } from './dto/upsert-tracking-settings.dto';

@Controller('tracking/goals')
export class TrackingGoalController {
  constructor(private trackingGoalService: TrackingGoalService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.trackingGoalService.list(userId);
  }

  // Dat TRUOC ':id' - "reality-check" la literal segment, phai duoc khai
  // bao truoc route co :id o CUNG do sau (1 segment) de khong bi :id nuot
  // nham (xem tien le tuong tu o tracking-group.controller.ts "mine").
  @Get('reality-check')
  realityCheck(@CurrentUserId() userId: string) {
    return this.trackingGoalService.realityCheck(userId);
  }

  @Put('settings')
  upsertSettings(@CurrentUserId() userId: string, @Body() dto: UpsertTrackingSettingsDto) {
    return this.trackingGoalService.upsertSettings(userId, dto);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateTrackingGoalDto) {
    return this.trackingGoalService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTrackingGoalDto,
  ) {
    return this.trackingGoalService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.trackingGoalService.remove(userId, id);
  }

  @Post(':id/milestones')
  createMilestone(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: CreateTrackingMilestoneDto,
  ) {
    return this.trackingGoalService.createMilestone(userId, id, dto);
  }

  @Patch('milestones/:milestoneId')
  updateMilestone(
    @CurrentUserId() userId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateTrackingMilestoneDto,
  ) {
    return this.trackingGoalService.updateMilestone(userId, milestoneId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('milestones/:milestoneId')
  removeMilestone(@CurrentUserId() userId: string, @Param('milestoneId') milestoneId: string) {
    return this.trackingGoalService.removeMilestone(userId, milestoneId);
  }

  @Post('milestones/:milestoneId/steps')
  createStepUnderMilestone(
    @CurrentUserId() userId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: CreateTrackingGoalStepDto,
  ) {
    return this.trackingGoalService.createStepUnderMilestone(userId, milestoneId, dto);
  }

  @Post(':id/steps')
  createStep(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: CreateTrackingGoalStepDto,
  ) {
    return this.trackingGoalService.createStep(userId, id, dto);
  }

  @Patch('steps/:stepId')
  updateStep(
    @CurrentUserId() userId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateTrackingGoalStepDto,
  ) {
    return this.trackingGoalService.updateStep(userId, stepId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('steps/:stepId')
  removeStep(@CurrentUserId() userId: string, @Param('stepId') stepId: string) {
    return this.trackingGoalService.removeStep(userId, stepId);
  }
}
