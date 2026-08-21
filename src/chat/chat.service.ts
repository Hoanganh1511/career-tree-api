import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { Prisma } from '../../generated/prisma/client';

const miniUserSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  verified: true,
} satisfies Prisma.UserSelect;

// Chat 1-1 MVP - xem comment tren model Conversation trong schema.prisma.
// Tai dung NotificationGateway (cung 1 ket noi WebSocket, chi them event
// "chat:message") thay vi mo gateway rieng - trinh duyet CHI can 1 ket noi
// duy nhat cho ca thong bao lan tin nhan.
@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationGateway,
  ) {}

  // Tra ve ConversationParticipant cua CHINH userId trong conversationId -
  // dung lam "guard" (404 neu khong phai thanh vien, giong quy uoc 404-not-403
  // cua KnowledgeGroupAccessService) VA de lay lastReadAt luc can.
  private async assertParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }
    return participant;
  }

  // Tim hoi thoai 1-1 CO SAN giua userId va target, tao moi neu chua co -
  // dung cho nut "Nhắn tin" tren profile (FE goi 1 lan roi dieu huong sang
  // /messages?c=<id>).
  async createOrGetConversation(userId: string, targetUsername: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: targetUsername },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException(`User ${targetUsername} not found`);
    }
    if (target.id === userId) {
      throw new BadRequestException('Không thể nhắn tin cho chính mình');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: target.id } } },
        ],
      },
    });
    if (existing) return this.toSummary(existing.id, userId);

    const created = await this.prisma.conversation.create({
      data: {
        participants: { create: [{ userId }, { userId: target.id }] },
      },
    });
    return this.toSummary(created.id, userId);
  }

  async listConversations(userId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true },
    });
    return Promise.all(rows.map((r) => this.toSummary(r.id, userId)));
  }

  async listMessages(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit = 30,
  ) {
    await this.assertParticipant(userId, conversationId);

    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      // Dao lai thanh thu tu thoi gian tang dan (cu -> moi) - FE render tin
      // nhan tu tren xuong duoi, "load them" (cursor) se noi THEM VAO DAU.
      items: page.map((m) => this.toMessageApi(m)).reverse(),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    const participant = await this.assertParticipant(userId, conversationId);

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId: userId, content },
      }),
      // Bump updatedAt de hoi thoai nay noi len dau danh sach - @updatedAt
      // tu dong cap nhat tren MOI loi goi update(), khong can truyen data.
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: {},
      }),
      // Nguoi gui coi nhu da doc den tin nhan cua chinh minh - tranh badge
      // unread tu tang len chinh minh sau khi gui.
      this.prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      }),
    ]);

    const other = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });

    const apiMessage = this.toMessageApi(message);
    if (other) {
      try {
        // Gui kem senderName/senderAvatarUrl CHI trong payload emit (khong
        // them vao apiMessage tra ve qua REST, cung khong luu DB) - FE dung
        // 2 field nay de hien browser Notification ("X: noi dung") ma khong
        // can fetch them thong tin nguoi gui.
        const sender = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, avatarUrl: true },
        });
        this.gateway.emitToUser(other.userId, 'chat:message', {
          ...apiMessage,
          senderName: sender?.name ?? null,
          senderAvatarUrl: sender?.avatarUrl ?? null,
        });
      } catch {
        // best-effort - xem comment tuong tu trong NotificationService.create()
      }
    }

    return apiMessage;
  }

  async markRead(userId: string, conversationId: string) {
    const participant = await this.assertParticipant(userId, conversationId);
    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });
    return { readAt: new Date().toISOString() };
  }

  async unreadCount(userId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, lastReadAt: true },
    });

    const counts = await Promise.all(
      participants.map((p) =>
        this.prisma.message.count({
          where: {
            conversationId: p.conversationId,
            senderId: { not: userId },
            createdAt: { gt: p.lastReadAt ?? new Date(0) },
          },
        }),
      ),
    );
    return { count: counts.reduce((sum, c) => sum + c, 0) };
  }

  private async toSummary(conversationId: string, viewerId: string) {
    const [conversation, viewerParticipant, otherParticipant, lastMessage] =
      await Promise.all([
        this.prisma.conversation.findUniqueOrThrow({
          where: { id: conversationId },
        }),
        this.prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: { conversationId, userId: viewerId },
          },
        }),
        this.prisma.conversationParticipant.findFirst({
          where: { conversationId, userId: { not: viewerId } },
          include: { user: { select: miniUserSelect } },
        }),
        this.prisma.message.findFirst({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const unread = await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: viewerId },
        createdAt: { gt: viewerParticipant?.lastReadAt ?? new Date(0) },
      },
    });

    return {
      id: conversation.id,
      otherUser: otherParticipant
        ? {
            id: otherParticipant.user.id,
            username: otherParticipant.user.username,
            name: otherParticipant.user.name,
            avatarUrl: otherParticipant.user.avatarUrl,
            verified: otherParticipant.user.verified,
          }
        : null,
      lastMessage: lastMessage ? this.toMessageApi(lastMessage) : null,
      unreadCount: unread,
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private toMessageApi(m: {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: Date;
  }) {
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
