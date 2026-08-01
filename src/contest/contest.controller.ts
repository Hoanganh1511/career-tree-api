import { Controller, Get, Param, Query } from '@nestjs/common';
import { ContestService, type ContestTab } from './contest.service';

@Controller('contests')
export class ContestController {
  constructor(private contestService: ContestService) {}

  @Get()
  findAll() {
    return this.contestService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.contestService.findBySlug(slug);
  }

  @Get(':slug/posts')
  findPosts(
    @Param('slug') slug: string,
    @Query('tab') tab?: ContestTab,
    @Query('limit') limit?: string,
  ) {
    return this.contestService.findPosts(
      slug,
      tab ?? 'popular',
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':slug/related')
  findRelated(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.contestService.findRelated(
      slug,
      limit ? Number(limit) : undefined,
    );
  }
}
