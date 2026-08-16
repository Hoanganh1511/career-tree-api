import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query('filter') filter?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.list(
      userId,
      filter === 'requests' ? 'requests' : 'all',
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  // Dat TRUOC ':id/read' o duoi (khac verb nen thuc ra khong xung dot, nhung
  // giu quy uoc "route co ten cu the truoc route co param" xuyen suot repo).
  @Get('unread-count')
  unreadCount(@CurrentUserId() userId: string) {
    return this.notificationService.unreadCount(userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.notificationService.markRead(userId, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUserId() userId: string) {
    return this.notificationService.markAllRead(userId);
  }
}
