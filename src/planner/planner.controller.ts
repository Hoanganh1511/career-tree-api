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
import { SetTypeColorDto } from './dto/set-type-color.dto';

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

// [2026-10-06] Controller RIENG (khac prefix voi PlannerController o tren,
// 'planner/items') - "User customization" (spec section 21): doi mau CA 1
// family cho 1 Type (Action/Event/Habit/Reflection), tach khoi CRUD item vi
// day la 1 "setting" cap user, khong thuoc ve 1 PlannerItem cu the nao.
@Controller('planner/type-colors')
export class PlannerTypeColorController {
  constructor(private plannerService: PlannerService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.plannerService.getTypeColors(userId);
  }

  @Patch(':type')
  set(
    @CurrentUserId() userId: string,
    @Param('type') type: string,
    @Body() dto: SetTypeColorDto,
  ) {
    return this.plannerService.setTypeColor(userId, type, dto.paletteId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':type')
  reset(@CurrentUserId() userId: string, @Param('type') type: string) {
    return this.plannerService.resetTypeColor(userId, type);
  }
}
