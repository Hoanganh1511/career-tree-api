import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get('workspaces/:workspaceId/notifications')
  findAll(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.notificationService.findAllForWorkspace(userId, workspaceId);
  }

  @Post('workspaces/:workspaceId/notifications')
  create(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationService.create(userId, workspaceId, dto);
  }

  @Patch('notifications/:notificationId')
  update(
    @CurrentUserId() userId: string,
    @Param('notificationId') notificationId: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(userId, notificationId, dto);
  }

  @Delete('notifications/:notificationId')
  remove(
    @CurrentUserId() userId: string,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.remove(userId, notificationId);
  }
}
