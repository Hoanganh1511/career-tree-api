import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { NotificationGateway } from './notification.gateway';

const notificationInclude = {
  actor: {
    select: { id: true, username: true, name: true, avatarUrl: true },
  },
} satisfies Prisma.NotificationInclude;

type NotificationWithRelations = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;

// Truoc day con phuc vu luong "yeu cau cong tac nhom kien thuc" (3 loai
// GROUP_COLLAB_*, kem group/collabId) - da bo cung tinh nang Workspace/
// KnowledgeGroup (2026-09-14). Gio chi con FOLLOW.
@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationGateway,
  ) {}

  // Tu bo qua (khong tao gi) neu actor trung recipient - vd truong hop hiem
  // tu follow chinh minh, khong ai can "tu bao" ban than.
  async create(params: {
    recipientId: string;
    actorId?: string | null;
    type: 'FOLLOW';
  }) {
    if (params.actorId && params.actorId === params.recipientId) return null;
    const created = await this.prisma.notification.create({
      data: {
        recipientId: params.recipientId,
        actorId: params.actorId ?? null,
        type: params.type,
      },
      include: notificationInclude,
    });

    // Day real-time toi client dang online cua recipient (neu co) - best-effort,
    // khong duoc phep lam hong viec tao thong bao chi vi loi socket.
    try {
      this.gateway.emitToUser(
        params.recipientId,
        'notification:new',
        this.toApi(created),
      );
    } catch {
      // best-effort
    }

    return created;
  }

  async list(userId: string, cursor?: string, limit = 20) {
    const rows = await this.prisma.notification.findMany({
      where: { recipientId: userId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: notificationInclude,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((n) => this.toApi(n)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { recipientId: userId, readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const notif = await this.prisma.notification.findUnique({
      where: { id },
      include: notificationInclude,
    });
    if (!notif || notif.recipientId !== userId) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    if (notif.readAt) return this.toApi(notif);
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
      include: notificationInclude,
    });
    return this.toApi(updated);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { markedAt: new Date().toISOString() };
  }

  private toApi(n: NotificationWithRelations) {
    return {
      id: n.id,
      type: n.type,
      actor: n.actor
        ? {
            id: n.actor.id,
            username: n.actor.username,
            name: n.actor.name,
            avatarUrl: n.actor.avatarUrl,
          }
        : null,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
