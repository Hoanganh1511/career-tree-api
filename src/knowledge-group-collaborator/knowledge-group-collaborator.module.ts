import { Module } from '@nestjs/common';
import { KnowledgeGroupCollaboratorService } from './knowledge-group-collaborator.service';
import { KnowledgeGroupCollaboratorController } from './knowledge-group-collaborator.controller';

@Module({
  providers: [KnowledgeGroupCollaboratorService],
  controllers: [KnowledgeGroupCollaboratorController],
})
export class KnowledgeGroupCollaboratorModule {}
