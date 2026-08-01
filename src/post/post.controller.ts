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
    @Query('category') category?: string,
    // CSV kebab-case (vd "text,image,video") - Content Type ben frontend gom
    // nhieu kind, xem CONTENT_TYPE_KINDS trong post-kind-meta.ts (enggo).
    @Query('kind') kind?: string,
  ) {
    return this.postService.findAll({
      cursor,
      limit: limit ? Number(limit) : undefined,
      authorUsername,
      category,
      kind: kind ? kind.split(',') : undefined,
    });
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreatePostDto) {
    return this.postService.create(userId, dto);
  }
}
