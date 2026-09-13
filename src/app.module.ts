import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { UserModule } from './user/user.module';
import { PostModule } from './post/post.module';
import { PostCollectionModule } from './post-collection/post-collection.module';
import { PostCommentModule } from './post-comment/post-comment.module';
import { FollowModule } from './follow/follow.module';
import { FeedCategoryModule } from './feed-category/feed-category.module';
import { ContestModule } from './contest/contest.module';
import { CommunityModule } from './community/community.module';
import { ChannelModule } from './channel/channel.module';
import { CommunityMemberModule } from './community-member/community-member.module';
import { CommunityPostModule } from './community-post/community-post.module';
import { CommentModule } from './comment/comment.module';
import { ReactionModule } from './reaction/reaction.module';
import { ContentSeriesModule } from './content-series/content-series.module';
import { NotificationModule } from './notification/notification.module';
import { PostAssistantModule } from './post-assistant/post-assistant.module';
import { ChatModule } from './chat/chat.module';
import { UploadModule } from './upload/upload.module';
import { GifModule } from './gif/gif.module';
import { BooksModule } from './books/books.module';
import { DiaryModule } from './diary/diary.module';
import { TrackingModule } from './tracking/tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Dung cho UploadService.cleanupOrphanedUploadsJob() - don rac S3 tu
    // presigned upload khong bao gio duoc sendMessage tham chieu (xem
    // src/upload/upload.service.ts).
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CommonModule,
    UserModule,
    PostModule,
    PostCollectionModule,
    PostCommentModule,
    FollowModule,
    FeedCategoryModule,
    ContestModule,
    CommunityModule,
    ChannelModule,
    CommunityMemberModule,
    CommunityPostModule,
    CommentModule,
    ReactionModule,
    ContentSeriesModule,
    NotificationModule,
    PostAssistantModule,
    ChatModule,
    UploadModule,
    GifModule,
    BooksModule,
    DiaryModule,
    TrackingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
