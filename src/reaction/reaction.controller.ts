import { Body, Controller, Param, Post } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class ReactionController {
  constructor(private reactionService: ReactionService) {}

  @Post('posts/:postId/reactions')
  togglePost(
    @CurrentUserId() userId: string,
    @Param('postId') postId: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.reactionService.togglePostReaction(userId, postId, dto.emoji);
  }

  @Post('comments/:commentId/reactions')
  toggleComment(
    @CurrentUserId() userId: string,
    @Param('commentId') commentId: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.reactionService.toggleCommentReaction(
      userId,
      commentId,
      dto.emoji,
    );
  }
}
