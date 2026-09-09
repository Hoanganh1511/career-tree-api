import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TrackingGroup,
  TrackingGroupSession,
} from '../../../generated/prisma/client';
import { CreateTrackingGroupDto } from './dto/create-tracking-group.dto';
import { JoinTrackingGroupDto } from './dto/join-tracking-group.dto';
import { CreateTrackingGroupSessionDto } from './dto/create-tracking-group-session.dto';
import { EndTrackingGroupSessionDto } from './dto/end-tracking-group-session.dto';

const RECENT_SESSIONS_LIMIT = 30;

// Accountability Hub - khac Goal/Task/Energy (chi chu so huu xem duoc):
// TrackingGroup/TrackingGroupSession can check THANH VIEN truoc khi cho
// xem/tao session (nhieu nguoi cung xem chung 1 group).
@Injectable()
export class TrackingGroupService {
  constructor(private prisma: PrismaService) {}

  private async assertMember(userId: string, groupId: string): Promise<void> {
    const member = await this.prisma.trackingGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) {
      throw new NotFoundException(`TrackingGroup ${groupId} not found`);
    }
  }

  async listMine(userId: string) {
    const memberships = await this.prisma.trackingGroupMember.findMany({
      where: { userId },
      include: { group: { include: { _count: { select: { members: true } } } } },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => this.groupToApi(m.group, m.group._count.members));
  }

  async create(userId: string, dto: CreateTrackingGroupDto) {
    const group = await this.prisma.trackingGroup.create({
      data: {
        name: dto.name,
        createdById: userId,
        members: { create: { userId } },
      },
    });
    return this.groupToApi(group, 1);
  }

  async join(userId: string, dto: JoinTrackingGroupDto) {
    const group = await this.prisma.trackingGroup.findUnique({
      where: { inviteCode: dto.inviteCode },
    });
    if (!group) throw new NotFoundException('Mã mời không hợp lệ');
    await this.prisma.trackingGroupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId } },
      create: { groupId: group.id, userId },
      update: {},
    });
    const memberCount = await this.prisma.trackingGroupMember.count({
      where: { groupId: group.id },
    });
    return this.groupToApi(group, memberCount);
  }

  async getGroup(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    const group = await this.prisma.trackingGroup.findUniqueOrThrow({
      where: { id: groupId },
      include: {
        members: { orderBy: { joinedAt: 'asc' } },
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: RECENT_SESSIONS_LIMIT,
        },
      },
    });
    return {
      ...this.groupToApi(group, group.members.length),
      memberIds: group.members.map((m) => m.userId),
      recentSessions: group.sessions.map((s) => this.sessionToApi(s)),
    };
  }

  async createSession(userId: string, groupId: string, dto: CreateTrackingGroupSessionDto) {
    await this.assertMember(userId, groupId);
    const session = await this.prisma.trackingGroupSession.create({
      data: { groupId, userId, goalText: dto.goalText },
    });
    return this.sessionToApi(session);
  }

  async endSession(
    userId: string,
    sessionId: string,
    dto: EndTrackingGroupSessionDto,
  ) {
    const session = await this.prisma.trackingGroupSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException(`TrackingGroupSession ${sessionId} not found`);
    // Chi chinh chu phien moi duoc ket thuc no - khac assertMember (xem
    // nhom thi ai cung xem duoc, nhung "ket thuc phien cua nguoi khac" la
    // hanh dong, phai la chinh chu.
    if (session.userId !== userId) {
      throw new ForbiddenException('Không thể kết thúc phiên của người khác');
    }
    const updated = await this.prisma.trackingGroupSession.update({
      where: { id: sessionId },
      data: { completed: dto.completed, endedAt: new Date() },
    });
    return this.sessionToApi(updated);
  }

  private groupToApi(group: TrackingGroup, memberCount: number) {
    return {
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      memberCount,
      createdAt: group.createdAt.toISOString(),
    };
  }

  private sessionToApi(session: TrackingGroupSession) {
    return {
      id: session.id,
      groupId: session.groupId,
      userId: session.userId,
      goalText: session.goalText,
      completed: session.completed,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    };
  }
}
