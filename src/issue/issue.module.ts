import { Module } from '@nestjs/common';
import { IssueService } from './issue.service';
import { IssueController } from './issue.controller';

@Module({
  providers: [IssueService],
  controllers: [IssueController],
})
export class IssueModule {}
