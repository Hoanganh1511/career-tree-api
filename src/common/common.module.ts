import { Global, Module } from '@nestjs/common';
import { OwnershipService } from './ownership.service';
import { CommunityAccessService } from './community-access.service';

@Global()
@Module({
  providers: [OwnershipService, CommunityAccessService],
  exports: [OwnershipService, CommunityAccessService],
})
export class CommonModule {}
