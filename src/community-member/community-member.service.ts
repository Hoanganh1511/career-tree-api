import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityAccessService } from '../common/community-access.service';
import { Prisma } from '../../generated/prisma/client';

const memberUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  email: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class CommunityMemberService {
  constructor(
    private prisma: PrismaService,
    private access: CommunityAccessService,
  ) {}

  async requestJoin(userId: string, communityId: string, reason?: string) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { isPublic: true },
    });
    if (!community)
      throw new NotFoundException(`Community ${communityId} not found`);

    const status = community.isPublic ? 'APPROVED' : 'PENDING';

    try {
      return await this.prisma.$transaction(async (tx) => {
        const member = await tx.communityMember.create({
          data: {
            communityId,
            userId,
            status,
            joinReason: reason,
            role: 'MEMBER',
          },
        });
        if (status === 'APPROVED') {
          await tx.community.update({
            where: { id: communityId },
            data: { memberCount: { increment: 1 } },
          });
        }
        return member;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Bạn đã gửi yêu cầu tham gia cộng đồng này rồi',
        );
      }
      throw e;
    }
  }

  async leave(userId: string, communityId: string) {
    const member = await this.access.getMembership(communityId, userId);
    if (!member) throw new NotFoundException(`Bạn chưa tham gia cộng đồng này`);
    if (member.role === 'OWNER') {
      throw new BadRequestException('Chủ sở hữu không thể rời cộng đồng');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.communityMember.delete({ where: { id: member.id } });
      if (member.status === 'APPROVED') {
        await tx.community.update({
          where: { id: communityId },
          data: { memberCount: { decrement: 1 } },
        });
      }
    });
  }

  async listMembers(
    userId: string,
    communityId: string,
    params: { cursor?: string; limit?: number },
  ) {
    await this.access.assertCommunityViewable(communityId, userId);
    const { cursor, limit = 30 } = params;
    return this.prisma.communityMember.findMany({
      where: { communityId, status: 'APPROVED' },
      orderBy: { points: 'desc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: { user: { select: memberUserSelect } },
    });
  }

  async approve(moderatorId: string, communityId: string, memberId: string) {
    await this.access.assertCommunityModerator(communityId, moderatorId);
    const member = await this.prisma.communityMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.communityId !== communityId) {
      throw new NotFoundException(`Yêu cầu tham gia ${memberId} không tồn tại`);
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.communityMember.update({
        where: { id: memberId },
        data: { status: 'APPROVED' },
      });
      await tx.community.update({
        where: { id: communityId },
        data: { memberCount: { increment: 1 } },
      });
      return updated;
    });
  }

  async reject(moderatorId: string, communityId: string, memberId: string) {
    await this.access.assertCommunityModerator(communityId, moderatorId);
    const member = await this.prisma.communityMember.findUnique({
      where: { id: memberId },
    });
    if (!member || member.communityId !== communityId) {
      throw new NotFoundException(`Yêu cầu tham gia ${memberId} không tồn tại`);
    }
    return this.prisma.communityMember.update({
      where: { id: memberId },
      data: { status: 'REJECTED' },
    });
  }
}
