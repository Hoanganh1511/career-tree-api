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
import { SetCategoryColorDto } from './dto/set-category-color.dto';
import { UpdatePlannerSettingsDto } from './dto/update-planner-settings.dto';

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

  // [2026-10-09] Viec CHUA xep lich khong thuoc khoang ngay nao - phai co
  // duong lay rieng, neu khong se "bien mat" khoi UI (spec muc B: "Model
  // unscheduled tasks... explicitly").
  @Get('unscheduled')
  listUnscheduled(@CurrentUserId() userId: string) {
    return this.plannerService.listUnscheduled(userId);
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

// [2026-10-09] Thay PlannerTypeColorController cu (mau theo itemType, da bo
// cung LifeItemType) - gio ghi de mau theo CATEGORY. Vang mat 1 dong = dung
// mau mac dinh cua category trong design reference ben FE.
@Controller('planner/category-colors')
export class PlannerCategoryColorController {
  constructor(private plannerService: PlannerService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.plannerService.getCategoryColors(userId);
  }

  @Patch(':category')
  set(
    @CurrentUserId() userId: string,
    @Param('category') category: string,
    @Body() dto: SetCategoryColorDto,
  ) {
    return this.plannerService.setCategoryColor(userId, category, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':category')
  reset(@CurrentUserId() userId: string, @Param('category') category: string) {
    return this.plannerService.resetCategoryColor(userId, category);
  }
}

// [2026-10-07] Controller RIENG (giong PlannerTypeColorController o tren) -
// Settings modal cua Planner (xem PlannerSettingsModal.tsx FE). 1 object DUY
// NHAT/user (khong co :param nhu type-colors vi khong co truc "loai" nao de
// group) nen chi can GET/PATCH, khong can DELETE/reset rieng (nguoi dung tu
// doi lai tung field qua PATCH neu muon ve mac dinh).
@Controller('planner/settings')
export class PlannerSettingsController {
  constructor(private plannerService: PlannerService) {}

  @Get()
  get(@CurrentUserId() userId: string) {
    return this.plannerService.getSettings(userId);
  }

  @Patch()
  update(
    @CurrentUserId() userId: string,
    @Body() dto: UpdatePlannerSettingsDto,
  ) {
    return this.plannerService.updateSettings(userId, dto);
  }
}
