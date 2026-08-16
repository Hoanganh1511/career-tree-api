import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { SeriesService } from './series.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { AddSeriesDocumentsDto } from './dto/add-series-documents.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class SeriesController {
  constructor(private seriesService: SeriesService) {}

  @Post('knowledge-groups/:groupId/series')
  create(
    @CurrentUserId() userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: CreateSeriesDto,
  ) {
    return this.seriesService.create(userId, groupId, dto);
  }

  @Patch('series/:id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSeriesDto,
  ) {
    return this.seriesService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('series/:id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.seriesService.remove(userId, id);
  }

  @Post('series/:id/documents')
  addDocuments(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: AddSeriesDocumentsDto,
  ) {
    return this.seriesService.addDocuments(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('series/:id/documents/:documentId')
  removeDocument(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.seriesService.removeDocument(userId, id, documentId);
  }
}
