import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { UserModule } from './user/user.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { NodeModule } from './node/node.module';
import { CardModule } from './card/card.module';
import { ResourceModule } from './resource/resource.module';
import { IssueModule } from './issue/issue.module';
import { NotificationModule } from './notification/notification.module';
import { TierModule } from './tier/tier.module';
import { CategoryModule } from './category/category.module';
import { PostModule } from './post/post.module';
import { FollowModule } from './follow/follow.module';
import { FeedCategoryModule } from './feed-category/feed-category.module';
import { ContestModule } from './contest/contest.module';
import { CommunityModule } from './community/community.module';
import { ChannelModule } from './channel/channel.module';
import { CommunityMemberModule } from './community-member/community-member.module';
import { CommunityPostModule } from './community-post/community-post.module';
import { CommentModule } from './comment/comment.module';
import { ReactionModule } from './reaction/reaction.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CommonModule,
    UserModule,
    WorkspaceModule,
    NodeModule,
    CardModule,
    ResourceModule,
    IssueModule,
    NotificationModule,
    TierModule,
    CategoryModule,
    PostModule,
    FollowModule,
    FeedCategoryModule,
    ContestModule,
    CommunityModule,
    ChannelModule,
    CommunityMemberModule,
    CommunityPostModule,
    CommentModule,
    ReactionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
