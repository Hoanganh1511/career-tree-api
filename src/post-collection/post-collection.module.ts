import { Module } from '@nestjs/common';
import { PostCollectionController } from './post-collection.controller';
import { PostCollectionService } from './post-collection.service';

@Module({
  controllers: [PostCollectionController],
  providers: [PostCollectionService],
})
export class PostCollectionModule {}
