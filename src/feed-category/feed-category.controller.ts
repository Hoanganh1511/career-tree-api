import { Controller, Get } from '@nestjs/common';
import { FeedCategoryService } from './feed-category.service';

// Namespace "/feed/categories" (KHONG phai "/categories") - "/categories/:id"
// da thuoc ve CategoryController cua Skill Tree (workspace -> category ->
// tier -> node), khac hoan toan domain. Day la phan loai nganh nghe dung cho
// bo loc feed bai viet.
@Controller('feed/categories')
export class FeedCategoryController {
  constructor(private feedCategoryService: FeedCategoryService) {}

  @Get('tree')
  findTree() {
    return this.feedCategoryService.findTree();
  }
}
