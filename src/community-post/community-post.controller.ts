import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CommunityPostService } from './community-post.service';
import { CreateCommunityPostDto } from './dto/create-community-post.dto';
import { UpdateCommunityPostDto } from './dto/update-community-post.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class CommunityPostController {
  constructor(private postService: CommunityPostService) {}

  @Get('channels/:channelId/posts')
  findAll(
    @CurrentUserId() userId: string,
    @Param('channelId') channelId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.postService.findAllForChannel(userId, channelId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('channels/:channelId/posts')
  create(
    @CurrentUserId() userId: string,
    @Param('channelId') channelId: string,
    @Body() dto: CreateCommunityPostDto,
  ) {
    return this.postService.create(userId, channelId, dto);
  }

  @Patch('posts/:postId')
  update(
    @CurrentUserId() userId: string,
    @Param('postId') postId: string,
    @Body() dto: UpdateCommunityPostDto,
  ) {
    return this.postService.update(userId, postId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('posts/:postId')
  remove(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    return this.postService.remove(userId, postId);
  }

  @Post('posts/:postId/pin')
  pin(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    return this.postService.setPinned(userId, postId, true);
  }

  @Delete('posts/:postId/pin')
  unpin(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    return this.postService.setPinned(userId, postId, false);
  }
}
