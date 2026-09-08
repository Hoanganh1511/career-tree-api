import { Module } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { DiaryController } from './diary.controller';
import { AdminGuard } from '../auth/admin.guard';

@Module({
  providers: [DiaryService, AdminGuard],
  controllers: [DiaryController],
})
export class DiaryModule {}
