import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OwnershipService } from 'src/common/ownership.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private ownership: OwnershipService,
  ) {}

  async findAllForWorkspace(userId: string, workspaceId: string) {
    await this.ownership.assertWorkspaceOwner(workspaceId, userId);
    return this.prisma.notification.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, workspaceId: string, dto: CreateNotificationDto) {
    await this.ownership.assertWorkspaceOwner(workspaceId, userId);
    return this.prisma.notification.create({
      data: { workspaceId, ...dto },
    });
  }

  async update(userId: string, notificationId: string, dto: UpdateNotificationDto) {
    await this.ownership.assertNotificationOwner(notificationId, userId);
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: dto,
    });
  }

  async remove(userId: string, notificationId: string) {
    await this.ownership.assertNotificationOwner(notificationId, userId);
    return this.prisma.notification.delete({ where: { id: notificationId } });
  }
}
