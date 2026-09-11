import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { PostCommentService } from './post-comment.service';
import { CreatePostCommentDto } from './dto/create-post-comment.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

// Path RIENG "post-comments" (khong phai "posts/:id/comments") - CommentController
// cu (mien CommunityPost) da chiem dung dang path "posts/:postId/comments",
// dat trung se dung do voi route do (xem ghi chu trong post-comment.service.ts).
@Controller('post-comments')
export class PostCommentController {
  constructor(private commentService: PostCommentService) {}

  @Get('post/:postId')
  findAllForPost(
    @CurrentUserId() viewerId: string,
    @Param('postId') postId: string,
  ) {
    return this.commentService.findAllForPost(viewerId, postId);
  }

  @Post('post/:postId')
  create(
    @CurrentUserId() userId: string,
    @Param('postId') postId: string,
    @Body() dto: CreatePostCommentDto,
  ) {
    return this.commentService.create(userId, postId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':commentId')
  remove(
    @CurrentUserId() userId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.commentService.remove(userId, commentId);
  }

  @Post(':commentId/like')
  toggleLike(
    @CurrentUserId() userId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.commentService.toggleLike(userId, commentId);
  }
}
