import { Global, Module } from '@nestjs/common';
import { CommunityAccessService } from './community-access.service';
import { KnowledgeGroupAccessService } from './knowledge-group-access.service';

@Global()
@Module({
  providers: [CommunityAccessService, KnowledgeGroupAccessService],
  exports: [CommunityAccessService, KnowledgeGroupAccessService],
})
export class CommonModule {}
