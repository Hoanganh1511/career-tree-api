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
import { TrackingTimeBlockService } from './tracking-time-block.service';
import { CurrentUserId } from '../../auth/current-user.decorator';
import { CreateTrackingTimeBlockDto } from './dto/create-tracking-time-block.dto';
import { UpdateTrackingTimeBlockDto } from './dto/update-tracking-time-block.dto';

@Controller('tracking/time-blocks')
export class TrackingTimeBlockController {
  constructor(private trackingTimeBlockService: TrackingTimeBlockService) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query('weekStart') weekStart: string) {
    return this.trackingTimeBlockService.listForWeek(userId, weekStart);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateTrackingTimeBlockDto) {
    return this.trackingTimeBlockService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTrackingTimeBlockDto,
  ) {
    return this.trackingTimeBlockService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.trackingTimeBlockService.remove(userId, id);
  }
}
