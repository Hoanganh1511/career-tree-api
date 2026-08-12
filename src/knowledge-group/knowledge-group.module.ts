import { Module } from '@nestjs/common';
import { KnowledgeGroupService } from './knowledge-group.service';
import { KnowledgeGroupController } from './knowledge-group.controller';

@Module({
  providers: [KnowledgeGroupService],
  controllers: [KnowledgeGroupController],
})
export class KnowledgeGroupModule {}
