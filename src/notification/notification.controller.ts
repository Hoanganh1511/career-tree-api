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

@Controller()
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get('workspaces/:workspaceId/notifications')
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.notificationService.findAllForWorkspace(workspaceId);
  }

  @Post('workspaces/:workspaceId/notifications')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationService.create(workspaceId, dto);
  }

  @Patch('notifications/:notificationId')
  update(
    @Param('notificationId') notificationId: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(notificationId, dto);
  }

  @Delete('notifications/:notificationId')
  remove(@Param('notificationId') notificationId: string) {
    return this.notificationService.remove(notificationId);
  }
}
