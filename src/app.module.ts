import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { NodeModule } from './node/node.module';
import { CardModule } from './card/card.module';
import { ResourceModule } from './resource/resource.module';
import { IssueModule } from './issue/issue.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WorkspaceModule,
    NodeModule,
    CardModule,
    ResourceModule,
    IssueModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
