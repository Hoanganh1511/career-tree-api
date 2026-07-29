import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Get()
  findAll(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('authorUsername') authorUsername?: string,
  ) {
    return this.postService.findAll({
      cursor,
      limit: limit ? Number(limit) : undefined,
      authorUsername,
    });
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreatePostDto) {
    return this.postService.create(userId, dto);
  }
}
