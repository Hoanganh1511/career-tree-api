import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ContentSeriesService } from './content-series.service';

// Doc-only, cong khai (giong ContestController) - CHUA co UI tao/sua Series
// (seed thu cong qua script, xem prisma/seed-content-series.ts).
@Public()
@Controller('content-series')
export class ContentSeriesController {
  constructor(private contentSeriesService: ContentSeriesService) {}

  @Get()
  findAll() {
    return this.contentSeriesService.findAll();
  }

  @Get(':slug')
  findOverview(@Param('slug') slug: string) {
    return this.contentSeriesService.findOverview(slug);
  }

  @Get(':slug/entries/:entrySlug')
  findEntry(@Param('slug') slug: string, @Param('entrySlug') entrySlug: string) {
    return this.contentSeriesService.findEntry(slug, entrySlug);
  }
}
