import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  findAllForWorkspace(workspaceId: string) {
    return this.prisma.notification.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(workspaceId: string, dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: { workspaceId, ...dto },
    });
  }

  update(notificationId: string, dto: UpdateNotificationDto) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: dto,
    });
  }

  remove(notificationId: string) {
    return this.prisma.notification.delete({ where: { id: notificationId } });
  }
}
