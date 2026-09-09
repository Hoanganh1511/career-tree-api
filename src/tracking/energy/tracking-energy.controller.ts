import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TrackingEnergyService } from './tracking-energy.service';
import { CurrentUserId } from '../../auth/current-user.decorator';
import { CreateTrackingEnergyCheckinDto } from './dto/create-tracking-energy-checkin.dto';

@Controller('tracking/energy')
export class TrackingEnergyController {
  constructor(private trackingEnergyService: TrackingEnergyService) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.trackingEnergyService.list(userId, from, to);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateTrackingEnergyCheckinDto) {
    return this.trackingEnergyService.create(userId, dto);
  }

  @Get('best-hour')
  bestHour(@CurrentUserId() userId: string) {
    return this.trackingEnergyService.bestHour(userId);
  }
}
