import { Global, Module } from '@nestjs/common';
import { CommunityAccessService } from './community-access.service';

@Global()
@Module({
  providers: [CommunityAccessService],
  exports: [CommunityAccessService],
})
export class CommonModule {}
