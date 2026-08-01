import { Module } from '@nestjs/common';
import { FeedCategoryService } from './feed-category.service';
import { FeedCategoryController } from './feed-category.controller';

@Module({
  providers: [FeedCategoryService],
  controllers: [FeedCategoryController],
})
export class FeedCategoryModule {}
