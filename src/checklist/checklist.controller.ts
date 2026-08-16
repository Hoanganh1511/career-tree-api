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
} from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { UpdateChecklistStatusDto } from './dto/update-checklist-status.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class ChecklistController {
  constructor(private checklistService: ChecklistService) {}

  @Get('documents/:documentId/checklist')
  list(
    @CurrentUserId() userId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.checklistService.list(userId, documentId);
  }

  @Post('documents/:documentId/checklist')
  create(
    @CurrentUserId() userId: string,
    @Param('documentId') documentId: string,
    @Body() dto: CreateChecklistItemDto,
  ) {
    return this.checklistService.create(userId, documentId, dto);
  }

  @Patch('checklist-items/:id')
  updateItem(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.checklistService.updateItem(userId, id, dto);
  }

  @Patch('checklist-items/:id/status')
  updateStatus(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChecklistStatusDto,
  ) {
    return this.checklistService.updateStatus(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('checklist-items/:id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.checklistService.remove(userId, id);
  }

  @Get('checklist-items/:id/logs')
  listLogs(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.checklistService.listLogs(userId, id);
  }
}
