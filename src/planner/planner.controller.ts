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
import { PlannerService } from './planner.service';
import { CurrentUserId } from '../auth/current-user.decorator';
import { CreatePlannerItemDto } from './dto/create-planner-item.dto';
import { UpdatePlannerItemDto } from './dto/update-planner-item.dto';

// Planner - trang /planner RIENG moi, HOAN TOAN DOC LAP voi /tracking (dang
// khoa, xem tracking/layout.tsx o FE) - xem comment day du trong
// schema.prisma (model PlannerItem) va planner.service.ts.
@Controller('planner/items')
export class PlannerController {
  constructor(private plannerService: PlannerService) {}

  @Get()
  listRange(
    @CurrentUserId() userId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.plannerService.listRange(userId, from, to);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreatePlannerItemDto) {
    return this.plannerService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlannerItemDto,
  ) {
    return this.plannerService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.plannerService.remove(userId, id);
  }
}
