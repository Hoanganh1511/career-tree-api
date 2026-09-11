import { Module } from '@nestjs/common';
import { PostCommentController } from './post-comment.controller';
import { PostCommentService } from './post-comment.service';

@Module({
  controllers: [PostCommentController],
  providers: [PostCommentService],
})
export class PostCommentModule {}
