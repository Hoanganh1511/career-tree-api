import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '../../generated/prisma/client';

const notificationInclude = {
  actor: {
    select: { id: true, username: true, name: true, avatarUrl: true },
  },
  group: {
    select: {
      id: true,
      name: true,
      workspace: {
        select: { id: true, owner: { select: { username: true } } },
      },
    },
  },
} satisfies Prisma.NotificationInclude;

type NotificationWithRelations = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  // Goi tu CAC SERVICE KHAC (vd KnowledgeGroupCollaboratorService) khi co
  // hanh dong can bao cho 1 user - KHONG expose qua controller rieng, chi la
  // helper noi bo. Tu bo qua (khong tao gi) neu actor trung recipient - vd
  // truong hop hiem chu nhom tu request/tu duyet yeu cau cua chinh minh,
  // khong ai can "tu bao" ban than.
  async create(params: {
    recipientId: string;
    actorId?: string | null;
    type: NotificationType;
    groupId?: string | null;
    collabId?: string | null;
  }) {
    if (params.actorId && params.actorId === params.recipientId) return null;
    return this.prisma.notification.create({
      data: {
        recipientId: params.recipientId,
        actorId: params.actorId ?? null,
        type: params.type,
        groupId: params.groupId ?? null,
        collabId: params.collabId ?? null,
      },
    });
  }

  // filter 'requests' = CHI yeu cau cong tac dang cho DUYET (tab "Yêu cầu"
  // o FE) - GROUP_COLLAB_APPROVED/REJECTED KHONG thuoc tab nay (do la ket
  // qua đa xu ly, khong con hanh dong nao can lam nua).
  async list(
    userId: string,
    filter: 'all' | 'requests' = 'all',
    cursor?: string,
    limit = 20,
  ) {
    const where: Prisma.NotificationWhereInput = {
      recipientId: userId,
      ...(filter === 'requests'
        ? { type: NotificationType.GROUP_COLLAB_REQUESTED }
        : {}),
    };

    const rows = await this.prisma.notification.findMany({
      where,
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

  // Goi tu approve()/reject() (KnowledgeGroupCollaboratorService) SAU khi da
  // xu ly xong 1 yeu cau cong tac - xoa han thong bao GROUP_COLLAB_REQUESTED
  // goc thay vi chi markRead, vi FE quyet dinh co hien nut Duyet/Tu choi hay
  // khong dua vao `type` (list() filter='requests' cung loc theo type), KHONG
  // dua vao readAt - markRead thoi se khong an duoc nut, thong bao "con treo"
  // mai voi nut bam du da xu ly roi. Best-effort (khong throw) - goi tu noi
  // da boc try/catch rieng.
  async deleteRequestNotification(recipientId: string, collabId: string) {
    await this.prisma.notification.deleteMany({
      where: {
        recipientId,
        collabId,
        type: NotificationType.GROUP_COLLAB_REQUESTED,
      },
    });
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
      group: n.group
        ? {
            id: n.group.id,
            name: n.group.name,
            workspaceId: n.group.workspace.id,
            ownerUsername: n.group.workspace.owner.username,
          }
        : null,
      collabId: n.collabId,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
