import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { monotonicFactory } from 'ulid';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { MessageType, Prisma } from '../../generated/prisma/client';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationSettingsDto } from './dto/update-conversation-settings.dto';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';
import { UpdateGroupInfoDto } from './dto/update-group-info.dto';

// Chan client xin limit qua lon (vd 99999) khi chua co rate-limit o tang
// global (@nestjs/throttler) - xem listMessages().
const MAX_MESSAGES_PAGE_SIZE = 100;

// monotonicFactory (khong dung ulid() truc tiep) - dam bao id sinh ra trong
// CUNG 1ms van tang dan nghiem ngat (ulid() thuong se random phan cuoi khi
// trung timestamp), can thiet vi id dong vai tro ca PK lan cursor sap xep -
// 2 tin gui sat nhau (vd nguoi dung gui lien tuc) khong duoc phep dung id
// dan den thu tu phan trang khong xac dinh.
const genMessageId = monotonicFactory();

const miniUserSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  verified: true,
} satisfies Prisma.UserSelect;

// Export - ChatSearchService (context-quanh-1-tin-nhan) tai dung include +
// toMessageApi() nay de tra ve DUNG shape ApiChatMessage day du (poll/
// reactions/replyTo), thay vi tu ghep lai include rieng.
export const messageInclude = {
  poll: {
    include: { options: { include: { votes: { select: { userId: true } } } } },
  },
  reactions: { select: { userId: true, emoji: true } },
  // Chi lay 1 lop preview - reply-toi-reply van hoat dong (moi Message chi
  // tro thang toi ban goc), khong can du du lieu day du cua tin nhan goc.
  replyTo: {
    select: {
      id: true,
      senderId: true,
      type: true,
      content: true,
      attachmentName: true,
      isRecalled: true,
    },
  },
} satisfies Prisma.MessageInclude;

export type MessageWithRelations = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;
type ReactionRow = { userId: string; emoji: string };

const ATTACHMENT_TYPES: MessageType[] = [
  MessageType.IMAGE,
  MessageType.FILE,
  MessageType.VOICE,
  MessageType.GIF,
];

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

  // Nguoi tao + memberIds (da loc trung/loai chinh minh o DTO validation phia
  // FE, o day loc lai lan nua cho chac) - toi thieu 3 nguoi tong cong.
  async createGroupConversation(
    userId: string,
    dto: CreateGroupConversationDto,
  ) {
    const memberIds = Array.from(
      new Set(dto.memberIds.filter((id) => id !== userId)),
    );
    if (memberIds.length < 2) {
      throw new BadRequestException(
        'Nhóm cần ít nhất 3 thành viên (kể cả bạn)',
      );
    }

    const existingUsers = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
    });
    if (existingUsers.length !== memberIds.length) {
      throw new BadRequestException('Có thành viên không hợp lệ');
    }

    const created = await this.prisma.conversation.create({
      data: {
        isGroup: true,
        name: dto.name.trim(),
        avatarColor: dto.avatarColor,
        participants: {
          create: [userId, ...memberIds].map((id) => ({ userId: id })),
        },
      },
    });

    return this.toSummary(created.id, userId);
  }

  // Ten/mo ta/mau nhom - CHI nhom (Conversation cap do, khong phai
  // ConversationParticipant nhu isFavorite/isMuted/isRestricted) nen bat ky
  // thanh vien nao cung sua duoc (chua co khai niem "admin nhom" - ngoai
  // pham vi hien tai).
  async updateGroupInfo(
    userId: string,
    conversationId: string,
    dto: UpdateGroupInfoDto,
  ) {
    await this.assertParticipant(userId, conversationId);
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    if (!conversation.isGroup) {
      throw new BadRequestException('Chỉ nhóm mới có thông tin này');
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.avatarColor !== undefined
          ? { avatarColor: dto.avatarColor }
          : {}),
      },
    });

    const summary = await this.toSummary(conversationId, userId);
    const others = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    for (const other of others) {
      try {
        this.gateway.emitToUser(
          other.userId,
          'chat:group-updated',
          await this.toSummary(conversationId, other.userId),
        );
      } catch {
        // best-effort
      }
    }
    return summary;
  }

  // Roi nhom - xoa row ConversationParticipant cua CHINH userId. Khong ap
  // dung cho 1-1 (roi = xoa han hoi thoai, khac ngu nghia hoan toan).
  async leaveGroup(userId: string, conversationId: string) {
    const participant = await this.assertParticipant(userId, conversationId);
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    if (!conversation.isGroup) {
      throw new BadRequestException('Không thể rời khỏi hội thoại 1-1');
    }

    await this.prisma.conversationParticipant.delete({
      where: { id: participant.id },
    });

    const others = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    for (const other of others) {
      try {
        this.gateway.emitToUser(other.userId, 'chat:member-left', {
          conversationId,
          userId,
        });
      } catch {
        // best-effort
      }
    }
    return { left: true };
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
    limit = 20,
  ) {
    await this.assertParticipant(userId, conversationId);
    // Cham tran limit client truyen len (vd limit=99999) - khong co
    // throttler o tang global, chan abuse ngay tai day.
    const take = Math.min(Math.max(limit, 1), MAX_MESSAGES_PAGE_SIZE);

    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      // orderBy PHAI trung field voi cursor (id) de phan trang on dinh - id
      // la ULID (sortable theo thoi gian sinh), createdAt truoc day co the
      // trung nhau giua nhieu tin gui gan nhu cung luc.
      orderBy: { id: 'desc' },
      include: messageInclude,
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;

    return {
      // Dao lai thanh thu tu thoi gian tang dan (cu -> moi) - FE render tin
      // nhan tu tren xuong duoi, "load them" (cursor) se noi THEM VAO DAU.
      items: page.map((m) => this.toMessageApi(m, userId)).reverse(),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  // Anh/file/GIF/voice CHUA thu hoi - dung cho "Ảnh, file & link" trong
  // GroupInfoPanel.tsx (preview vai tin dau + "Xem tất cả" phan trang tiep
  // qua cung endpoint nay).
  async listMedia(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit = 30,
  ) {
    await this.assertParticipant(userId, conversationId);
    const take = Math.min(Math.max(limit, 1), MAX_MESSAGES_PAGE_SIZE);

    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        isRecalled: false,
        type: {
          in: [
            MessageType.IMAGE,
            MessageType.FILE,
            MessageType.GIF,
            MessageType.VOICE,
          ],
        },
      },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'desc' },
      include: messageInclude,
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;

    return {
      items: page.map((m) => this.toMessageApi(m, userId)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  async listPinnedMessages(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    const rows = await this.prisma.message.findMany({
      where: { conversationId, isPinned: true },
      orderBy: { pinnedAt: 'desc' },
      include: messageInclude,
    });
    return rows.map((m) => this.toMessageApi(m, userId));
  }

  async pinMessage(userId: string, conversationId: string, messageId: string) {
    return this.setPinned(userId, conversationId, messageId, true);
  }

  async unpinMessage(
    userId: string,
    conversationId: string,
    messageId: string,
  ) {
    return this.setPinned(userId, conversationId, messageId, false);
  }

  private async setPinned(
    userId: string,
    conversationId: string,
    messageId: string,
    pinned: boolean,
  ) {
    await this.assertParticipant(userId, conversationId);
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { isPinned: pinned, pinnedAt: pinned ? new Date() : null },
      include: messageInclude,
    });

    const others = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    for (const other of others) {
      try {
        this.gateway.emitToUser(
          other.userId,
          'chat:message-updated',
          this.toMessageApi(updated, other.userId),
        );
      } catch {
        // best-effort
      }
    }

    return this.toMessageApi(updated, userId);
  }

  // Doi TEXT/IMAGE/FILE/VOICE/GIF/POLL deu di qua day - kiem tra cheo cac
  // field theo `type` (class-validator khong lam duoc dieu kien nhu vay).
  private validatePayload(dto: SendMessageDto) {
    const type = dto.type ?? MessageType.TEXT;
    if (type === MessageType.TEXT && !dto.content?.trim()) {
      throw new BadRequestException('Tin nhắn văn bản không được để trống');
    }
    if (ATTACHMENT_TYPES.includes(type) && !dto.attachmentUrl) {
      throw new BadRequestException(`Tin nhắn loại ${type} cần attachmentUrl`);
    }
    if (type === MessageType.POLL && !dto.poll) {
      throw new BadRequestException('Thiếu dữ liệu bình chọn');
    }
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const participant = await this.assertParticipant(userId, conversationId);
    this.validatePayload(dto);
    const type = dto.type ?? MessageType.TEXT;

    // reply chi hop le neu tin nhan goc nam TRONG CUNG hoi thoai - bo qua
    // (khong throw) neu replyToId tro sai cho, tranh chan gui tin vi 1 tham
    // chieu khong quan trong.
    let replyToId: string | undefined;
    if (dto.replyToId) {
      const replyTarget = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
        select: { conversationId: true },
      });
      if (replyTarget?.conversationId === conversationId) {
        replyToId = dto.replyToId;
      }
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          id: genMessageId(),
          conversationId,
          senderId: userId,
          type,
          content: dto.content,
          attachmentUrl: dto.attachmentUrl,
          attachmentName: dto.attachmentName,
          attachmentMimeType: dto.attachmentMimeType,
          attachmentSize: dto.attachmentSize,
          durationSeconds: dto.durationSeconds,
          replyToId,
          ...(type === MessageType.POLL && dto.poll
            ? {
                poll: {
                  create: {
                    question: dto.poll.question,
                    options: {
                      create: dto.poll.options.map((o) => ({ text: o.text })),
                    },
                  },
                },
              }
            : {}),
        },
        include: messageInclude,
      });
      // Bump updatedAt de hoi thoai nay noi len dau danh sach - @updatedAt
      // tu dong cap nhat tren MOI loi goi update(), khong can truyen data.
      await tx.conversation.update({
        where: { id: conversationId },
        data: {},
      });
      // Nguoi gui coi nhu da doc den tin nhan cua chinh minh - tranh badge
      // unread tu tang len chinh minh sau khi gui.
      await tx.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      });
      return created;
    });

    const others = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });

    const apiMessage = this.toMessageApi(message, userId);
    if (others.length > 0) {
      try {
        // Gui kem senderName/senderAvatarUrl CHI trong payload emit (khong
        // them vao apiMessage tra ve qua REST, cung khong luu DB) - FE dung
        // 2 field nay de hien browser Notification ("X: noi dung") ma khong
        // can fetch them thong tin nguoi gui.
        const sender = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, avatarUrl: true },
        });
        for (const other of others) {
          this.gateway.emitToUser(other.userId, 'chat:message', {
            ...this.toMessageApi(message, other.userId),
            senderName: sender?.name ?? null,
            senderAvatarUrl: sender?.avatarUrl ?? null,
          });
        }
      } catch {
        // best-effort - xem comment tuong tu trong NotificationService.create()
      }
    }

    return apiMessage;
  }

  // Chi nguoi gui thu hoi duoc tin cua CHINH minh. Giu nguyen row (khong xoa
  // that) de khong pha vo thu tu/reply chain - xoa sach content/attachment,
  // FE dua vao isRecalled de hien "Tin nhắn đã được thu hồi".
  async recallMessage(
    userId: string,
    conversationId: string,
    messageId: string,
  ) {
    await this.assertParticipant(userId, conversationId);
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException(
        'Chỉ có thể thu hồi tin nhắn của chính mình',
      );
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isRecalled: true,
        content: null,
        attachmentUrl: null,
        attachmentName: null,
        attachmentMimeType: null,
        attachmentSize: null,
        durationSeconds: null,
      },
      include: messageInclude,
    });

    const others = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    try {
      for (const other of others) {
        this.gateway.emitToUser(
          other.userId,
          'chat:message-updated',
          this.toMessageApi(updated, other.userId),
        );
      }
    } catch {
      // best-effort
    }

    return this.toMessageApi(updated, userId);
  }

  // 1 nguoi CHI co toi da 1 reaction/tin nhan - goi lai voi emoji khac se
  // GHI DE (upsert), khong tao them dong. Dung chung 1 helper broadcast cho
  // ca react va bo react.
  async reactToMessage(userId: string, messageId: string, emoji: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }
    await this.assertParticipant(userId, message.conversationId);

    await this.prisma.messageReaction.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, emoji },
      update: { emoji },
    });

    return this.broadcastReactionUpdate(
      userId,
      message.conversationId,
      messageId,
    );
  }

  async removeReaction(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }
    await this.assertParticipant(userId, message.conversationId);

    await this.prisma.messageReaction.deleteMany({
      where: { messageId, userId },
    });

    return this.broadcastReactionUpdate(
      userId,
      message.conversationId,
      messageId,
    );
  }

  private async broadcastReactionUpdate(
    userId: string,
    conversationId: string,
    messageId: string,
  ) {
    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      select: { userId: true, emoji: true },
    });

    const others = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    try {
      for (const other of others) {
        this.gateway.emitToUser(other.userId, 'chat:reaction-update', {
          messageId,
          reactions: this.toReactionSummary(reactions, other.userId),
        });
      }
    } catch {
      // best-effort
    }

    return {
      messageId,
      reactions: this.toReactionSummary(reactions, userId),
    };
  }

  // Cai dat RIENG cua nguoi goi ve hoi thoai nay - khong doi xung (xem
  // comment tren model ConversationParticipant).
  async updateSettings(
    userId: string,
    conversationId: string,
    dto: UpdateConversationSettingsDto,
  ) {
    const participant = await this.assertParticipant(userId, conversationId);
    const updated = await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        ...(dto.isFavorite !== undefined ? { isFavorite: dto.isFavorite } : {}),
        ...(dto.isMuted !== undefined ? { isMuted: dto.isMuted } : {}),
        ...(dto.isRestricted !== undefined
          ? { isRestricted: dto.isRestricted }
          : {}),
      },
    });
    return {
      isFavorite: updated.isFavorite,
      isMuted: updated.isMuted,
      isRestricted: updated.isRestricted,
    };
  }

  // Lui lastReadAt ve NGAY TRUOC tin nhan CUOI CUNG cua nguoi kia (khong dat
  // han ve null - se khien unreadCount tinh lai TU DAU ca hoi thoai, ra so
  // lon vo ly) - unreadCount se ra dung 1, giong hanh vi "Mark as unread"
  // cua Messenger.
  async markUnread(userId: string, conversationId: string) {
    const participant = await this.assertParticipant(userId, conversationId);
    const lastFromOther = await this.prisma.message.findFirst({
      where: { conversationId, senderId: { not: userId } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (!lastFromOther) return { unreadCount: 0 };

    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date(lastFromOther.createdAt.getTime() - 1) },
    });
    return { unreadCount: 1 };
  }

  // Single-choice: bam lai DUNG option da chon -> bo vote (toggle off), bam
  // option KHAC -> chuyen vote sang option do. Chi 1 vote CON SONG/nguoi/poll.
  async votePoll(userId: string, pollId: string, optionId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        message: { select: { conversationId: true } },
        options: { include: { votes: { select: { userId: true } } } },
      },
    });
    if (!poll) {
      throw new NotFoundException(`Poll ${pollId} not found`);
    }
    await this.assertParticipant(userId, poll.message.conversationId);

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      throw new NotFoundException(`Poll option ${optionId} not found`);
    }
    const alreadyVotedThisOption = option.votes.some(
      (v) => v.userId === userId,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.pollVote.deleteMany({
        where: { userId, pollOption: { pollId } },
      });
      if (!alreadyVotedThisOption) {
        await tx.pollVote.create({ data: { pollOptionId: optionId, userId } });
      }
    });

    const others = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId: poll.message.conversationId,
        userId: { not: userId },
      },
      select: { userId: true },
    });
    try {
      for (const other of others) {
        this.gateway.emitToUser(
          other.userId,
          'chat:poll-update',
          await this.getPollTally(pollId, other.userId),
        );
      }
    } catch {
      // best-effort
    }

    return this.getPollTally(pollId, userId);
  }

  private async getPollTally(pollId: string, viewerId: string) {
    const poll = await this.prisma.poll.findUniqueOrThrow({
      where: { id: pollId },
      include: {
        options: { include: { votes: { select: { userId: true } } } },
      },
    });
    return this.toPollApi(poll, viewerId);
  }

  async markRead(userId: string, conversationId: string) {
    const participant = await this.assertParticipant(userId, conversationId);
    const readAt = new Date();
    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: readAt },
    });

    // "Da xem" (chat:read) chi co y nghia cho 1-1 - nhom co nhieu nguoi doc,
    // "da xem theo tung nguoi" chua duoc thiet ke (xem toSummary), nen chi
    // tim + emit khi CHINH XAC 1 nguoi con lai (khong phai nhom).
    const others = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    if (others.length === 1) {
      try {
        // Bao real-time cho nguoi con lai de hien "Da xem" ngay, khong can
        // doi ho reload/fetch lai conversation summary.
        this.gateway.emitToUser(others[0].userId, 'chat:read', {
          conversationId,
          readAt: readAt.toISOString(),
        });
      } catch {
        // best-effort
      }
    }

    return { readAt: readAt.toISOString() };
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

  // otherParticipants la MANG (khong phai findFirst) de dung chung duoc cho
  // ca 1-1 (mang 1 phan tu) lan nhom (mang N phan tu) - `otherUser` (field cu,
  // FE 1-1 dang doc) tinh lai = participants[0] de tuong thich nguoc.
  private async toSummary(conversationId: string, viewerId: string) {
    const [conversation, viewerParticipant, otherParticipants, lastMessage] =
      await Promise.all([
        this.prisma.conversation.findUniqueOrThrow({
          where: { id: conversationId },
        }),
        this.prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: { conversationId, userId: viewerId },
          },
        }),
        this.prisma.conversationParticipant.findMany({
          where: { conversationId, userId: { not: viewerId } },
          include: { user: { select: miniUserSelect } },
        }),
        this.prisma.message.findFirst({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          include: messageInclude,
        }),
      ]);

    const unread = await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: viewerId },
        createdAt: { gt: viewerParticipant?.lastReadAt ?? new Date(0) },
      },
    });

    const participants = otherParticipants.map((p) => ({
      id: p.user.id,
      username: p.user.username,
      name: p.user.name,
      avatarUrl: p.user.avatarUrl,
      verified: p.user.verified,
      // Snapshot tai thoi diem fetch - FE tu cap nhat real-time qua socket
      // event "presence:update" (xem NotificationGateway).
      online: this.gateway.isOnline(p.user.id),
    }));

    return {
      id: conversation.id,
      isGroup: conversation.isGroup,
      groupName: conversation.name,
      groupAvatarColor: conversation.avatarColor,
      groupDescription: conversation.description,
      otherUser: participants[0] ?? null,
      participants,
      lastMessage: lastMessage
        ? this.toMessageApi(lastMessage, viewerId)
        : null,
      unreadCount: unread,
      updatedAt: conversation.updatedAt.toISOString(),
      // Chi co y nghia voi 1-1 (dung 1 nguoi doc) - nhom co NHIEU nguoi doc,
      // "da xem theo tung nguoi" can thiet ke rieng (ngoai pham vi hien tai)
      // nen tra null, FE tu fallback ve "Da gui" thay vi bia du lieu.
      otherLastReadAt:
        !conversation.isGroup && otherParticipants[0]
          ? (otherParticipants[0].lastReadAt?.toISOString() ?? null)
          : null,
      // Cai dat RIENG cua viewerId (khong doi xung) - xem updateSettings.
      isFavorite: viewerParticipant?.isFavorite ?? false,
      isMuted: viewerParticipant?.isMuted ?? false,
      isRestricted: viewerParticipant?.isRestricted ?? false,
    };
  }

  private toPollApi(
    poll: Prisma.PollGetPayload<{
      include: {
        options: { include: { votes: { select: { userId: true } } } };
      };
    }>,
    viewerId: string,
  ) {
    return {
      id: poll.id,
      messageId: poll.messageId,
      question: poll.question,
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        voteCount: o.votes.length,
        votedByMe: o.votes.some((v) => v.userId === viewerId),
      })),
      totalVotes: poll.options.reduce((sum, o) => sum + o.votes.length, 0),
    };
  }

  // Dung chung style "[Nhãn]" voi formatMessagePreview.ts o frontend (preview
  // trong danh sach hoi thoai/browser notification) - o day danh rieng cho
  // khung reply-quote trong bubble, chi can 1 dong ngan gon.
  private formatReplyPreview(m: {
    type: MessageType;
    content: string | null;
    attachmentName: string | null;
  }): string {
    switch (m.type) {
      case MessageType.IMAGE:
        return '[Hình ảnh]';
      case MessageType.GIF:
        return '[GIF]';
      case MessageType.FILE:
        return `[Tệp] ${m.attachmentName ?? ''}`.trim();
      case MessageType.VOICE:
        return '[Tin nhắn thoại]';
      case MessageType.POLL:
        return '[Bình chọn]';
      default:
        return m.content ?? '';
    }
  }

  private toReactionSummary(reactions: ReactionRow[], viewerId: string) {
    const byEmoji = new Map<
      string,
      { emoji: string; count: number; reactedByMe: boolean }
    >();
    for (const r of reactions) {
      const entry = byEmoji.get(r.emoji) ?? {
        emoji: r.emoji,
        count: 0,
        reactedByMe: false,
      };
      entry.count += 1;
      if (r.userId === viewerId) entry.reactedByMe = true;
      byEmoji.set(r.emoji, entry);
    }
    return Array.from(byEmoji.values());
  }

  // public - ChatSearchService.getMessageContext() tai dung ham nay de tra
  // ve dung shape ApiChatMessage (xem export messageInclude o dau file).
  toMessageApi(m: MessageWithRelations, viewerId: string) {
    // Tin da thu hoi: xoa sach noi dung/attachment/poll o TANG API (khong
    // chi dua vao DB da xoa - phong truong hop client cache ban cu).
    return {
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      type: m.type,
      content: m.isRecalled ? null : m.content,
      attachmentUrl: m.isRecalled ? null : m.attachmentUrl,
      attachmentName: m.isRecalled ? null : m.attachmentName,
      attachmentMimeType: m.isRecalled ? null : m.attachmentMimeType,
      attachmentSize: m.isRecalled ? null : m.attachmentSize,
      durationSeconds: m.isRecalled ? null : m.durationSeconds,
      poll: m.isRecalled || !m.poll ? null : this.toPollApi(m.poll, viewerId),
      isRecalled: m.isRecalled,
      isPinned: m.isPinned,
      replyTo: m.replyTo
        ? {
            id: m.replyTo.id,
            senderId: m.replyTo.senderId,
            type: m.replyTo.type,
            preview: m.replyTo.isRecalled
              ? 'Tin nhắn đã được thu hồi'
              : this.formatReplyPreview(m.replyTo),
          }
        : null,
      reactions: this.toReactionSummary(m.reactions, viewerId),
      createdAt: m.createdAt.toISOString(),
    };
  }
}
