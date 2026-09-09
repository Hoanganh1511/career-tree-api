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
  Query,
} from '@nestjs/common';
import { TrackingTaskService } from './tracking-task.service';
import { CurrentUserId } from '../../auth/current-user.decorator';
import { CreateTrackingTaskDto } from './dto/create-tracking-task.dto';
import { UpdateTrackingTaskDto } from './dto/update-tracking-task.dto';

@Controller('tracking/tasks')
export class TrackingTaskController {
  constructor(private trackingTaskService: TrackingTaskService) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query('date') date: string) {
    return this.trackingTaskService.listForDate(userId, date);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateTrackingTaskDto) {
    return this.trackingTaskService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTrackingTaskDto,
  ) {
    return this.trackingTaskService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.trackingTaskService.remove(userId, id);
  }

  @Post(':id/postpone')
  postpone(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.trackingTaskService.postpone(userId, id);
  }
}
