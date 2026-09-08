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
import { DiaryService } from './diary.service';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { CreateDiaryTopicDto } from './dto/create-diary-topic.dto';
import { UpdateDiaryTopicDto } from './dto/update-diary-topic.dto';
import { CreateDiaryEntryDto } from './dto/create-diary-entry.dto';
import { UpdateDiaryEntryDto } from './dto/update-diary-entry.dto';

// GL Daily Diary - JwtAuthGuard da chay toan cuc (xem auth.module.ts), o day
// them AdminGuard cho CA controller (chi 1 tai khoan admin duy nhat duoc
// dung tinh nang nay - xem AdminGuard/User.isAdmin).
@UseGuards(AdminGuard)
@Controller('diary')
export class DiaryController {
  constructor(private diaryService: DiaryService) {}

  @Get('topics')
  listTopics(@CurrentUserId() userId: string) {
    return this.diaryService.listTopics(userId);
  }

  @Post('topics')
  createTopic(
    @CurrentUserId() userId: string,
    @Body() dto: CreateDiaryTopicDto,
  ) {
    return this.diaryService.createTopic(userId, dto);
  }

  @Patch('topics/:id')
  updateTopic(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDiaryTopicDto,
  ) {
    return this.diaryService.updateTopic(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('topics/:id')
  deleteTopic(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.diaryService.deleteTopic(userId, id);
  }

  @Get('topics/:id/entries')
  listEntries(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.diaryService.listEntries(userId, id);
  }

  @Post('topics/:id/entries')
  createEntry(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: CreateDiaryEntryDto,
  ) {
    return this.diaryService.createEntry(userId, id, dto);
  }

  @Patch('entries/:id')
  updateEntry(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDiaryEntryDto,
  ) {
    return this.diaryService.updateEntry(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('entries/:id')
  deleteEntry(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.diaryService.deleteEntry(userId, id);
  }
}
