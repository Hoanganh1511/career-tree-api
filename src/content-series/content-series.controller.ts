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
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AdminGuard } from '../auth/admin.guard';
import { ContentSeriesService } from './content-series.service';
import { CreateContentSeriesDto } from './dto/create-content-series.dto';
import { UpdateContentSeriesDto } from './dto/update-content-series.dto';
import { CreateContentSeriesCategoryDto } from './dto/create-content-series-category.dto';
import { UpdateContentSeriesCategoryDto } from './dto/update-content-series-category.dto';
import { CreateContentSeriesEntryDto } from './dto/create-content-series-entry.dto';
import { UpdateContentSeriesEntryDto } from './dto/update-content-series-entry.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { MoveCategoryToParentDto } from './dto/move-category-to-parent.dto';
import { ReorderItemsDto } from './dto/reorder-items.dto';

// Doc cong khai (@Public() tung route) - GHI (create/update/delete/move) chi
// admin (AdminGuard, xem User.isAdmin) vi day la NOI DUNG CHINH THUC cua app
// (giong GL Daily Diary), khong phai bai nguoi dung tu dang. KHONG dat
// @Public() o CAP CLASS nhu truoc - se lam JwtAuthGuard bo qua luon ca route
// ghi, khien AdminGuard chay ma khong co req.userId.
@Controller('content-series')
export class ContentSeriesController {
  constructor(private contentSeriesService: ContentSeriesService) {}

  @Public()
  @Get()
  findAll() {
    return this.contentSeriesService.findAll();
  }

  @Public()
  @Get(':slug')
  findOverview(@Param('slug') slug: string) {
    return this.contentSeriesService.findOverview(slug);
  }

  @Public()
  @Get(':slug/entries/:entrySlug')
  findEntry(
    @Param('slug') slug: string,
    @Param('entrySlug') entrySlug: string,
  ) {
    return this.contentSeriesService.findEntry(slug, entrySlug);
  }

  @UseGuards(AdminGuard)
  @Post()
  createSeries(@Body() dto: CreateContentSeriesDto) {
    return this.contentSeriesService.createSeries(dto);
  }

  @UseGuards(AdminGuard)
  @Patch(':slug')
  updateSeries(
    @Param('slug') slug: string,
    @Body() dto: UpdateContentSeriesDto,
  ) {
    return this.contentSeriesService.updateSeries(slug, dto);
  }

  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':slug')
  deleteSeries(@Param('slug') slug: string) {
    return this.contentSeriesService.deleteSeries(slug);
  }

  @UseGuards(AdminGuard)
  @Post(':slug/categories')
  createCategory(
    @Param('slug') slug: string,
    @Body() dto: CreateContentSeriesCategoryDto,
  ) {
    return this.contentSeriesService.createCategory(slug, dto);
  }

  @UseGuards(AdminGuard)
  @Patch(':slug/categories/:categoryId')
  updateCategory(
    @Param('slug') slug: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateContentSeriesCategoryDto,
  ) {
    return this.contentSeriesService.updateCategory(slug, categoryId, dto);
  }

  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':slug/categories/:categoryId')
  deleteCategory(
    @Param('slug') slug: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.contentSeriesService.deleteCategory(slug, categoryId);
  }

  @UseGuards(AdminGuard)
  @Post(':slug/categories/:categoryId/move')
  moveCategory(
    @Param('slug') slug: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: MoveItemDto,
  ) {
    return this.contentSeriesService.moveCategory(
      slug,
      categoryId,
      dto.direction,
    );
  }

  @UseGuards(AdminGuard)
  @Post(':slug/categories/:categoryId/move-to-parent')
  moveCategoryToParent(
    @Param('slug') slug: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: MoveCategoryToParentDto,
  ) {
    return this.contentSeriesService.moveCategoryToParent(
      slug,
      categoryId,
      dto.parentId,
    );
  }

  @UseGuards(AdminGuard)
  @Post(':slug/categories/reorder')
  reorderCategories(@Param('slug') slug: string, @Body() dto: ReorderItemsDto) {
    return this.contentSeriesService.reorderCategories(slug, dto.orderedIds);
  }

  @UseGuards(AdminGuard)
  @Post(':slug/categories/:categoryId/entries/reorder')
  reorderEntriesInCategory(
    @Param('slug') slug: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.contentSeriesService.reorderEntriesInCategory(
      slug,
      categoryId,
      dto.orderedIds,
    );
  }

  @UseGuards(AdminGuard)
  @Post(':slug/entries')
  createEntry(
    @Param('slug') slug: string,
    @Body() dto: CreateContentSeriesEntryDto,
  ) {
    return this.contentSeriesService.createEntry(slug, dto);
  }

  @UseGuards(AdminGuard)
  @Patch(':slug/entries/:entryId')
  updateEntry(
    @Param('slug') slug: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateContentSeriesEntryDto,
  ) {
    return this.contentSeriesService.updateEntry(slug, entryId, dto);
  }

  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':slug/entries/:entryId')
  deleteEntry(@Param('slug') slug: string, @Param('entryId') entryId: string) {
    return this.contentSeriesService.deleteEntry(slug, entryId);
  }

  @UseGuards(AdminGuard)
  @Post(':slug/entries/:entryId/move')
  moveEntry(
    @Param('slug') slug: string,
    @Param('entryId') entryId: string,
    @Body() dto: MoveItemDto,
  ) {
    return this.contentSeriesService.moveEntry(slug, entryId, dto.direction);
  }
}
