import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class CommentController {
  constructor(private commentService: CommentService) {}

  @Get('posts/:postId/comments')
  findAll(
    @CurrentUserId() userId: string,
    @Param('postId') postId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.commentService.findAllForPost(userId, postId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('posts/:postId/comments')
  create(
    @CurrentUserId() userId: string,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(userId, postId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('comments/:commentId')
  remove(
    @CurrentUserId() userId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.commentService.remove(userId, commentId);
  }
}
