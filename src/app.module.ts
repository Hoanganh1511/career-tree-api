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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
