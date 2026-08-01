import { Module } from '@nestjs/common';
import { ContestService } from './contest.service';
import { ContestController } from './contest.controller';

@Module({
  providers: [ContestService],
  controllers: [ContestController],
})
export class ContestModule {}
