import { Module } from '@nestjs/common';
import { ContentSeriesService } from './content-series.service';
import { ContentSeriesController } from './content-series.controller';

@Module({
  providers: [ContentSeriesService],
  controllers: [ContentSeriesController],
})
export class ContentSeriesModule {}
