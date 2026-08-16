import { Module } from '@nestjs/common';
import { KnowledgeGroupCollaboratorService } from './knowledge-group-collaborator.service';
import { KnowledgeGroupCollaboratorController } from './knowledge-group-collaborator.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [KnowledgeGroupCollaboratorService],
  controllers: [KnowledgeGroupCollaboratorController],
})
export class KnowledgeGroupCollaboratorModule {}
