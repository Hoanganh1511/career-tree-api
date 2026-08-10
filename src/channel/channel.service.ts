import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityAccessService } from '../common/community-access.service';
import { CommunityMemberRole, Prisma } from '../../generated/prisma/client';
import { CreateChannelDto } from './dto/create-channel.dto';
import { toDbGroup } from './channel-group.util';

const MODERATOR_ROLES: CommunityMemberRole[] = ['OWNER', 'ADMIN'];

const requesterSelect = {
  name: true,
  username: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class ChannelService {
  constructor(
    private prisma: PrismaService,
    private access: CommunityAccessService,
  ) {}

  async findAllForCommunity(userId: string, communityId: string) {
    await this.access.assertCommunityViewable(communityId, userId);
    return this.prisma.channel.findMany({
      where: { communityId, status: 'APPROVED' },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // Bat ky thanh vien APPROVED nao cung de xuat duoc kenh moi (khong con
  // gioi han moderator) - neu nguoi tao la OWNER/ADMIN thi duyet luon
  // (APPROVED), con lai vao trang thai PENDING cho quan tri duyet.
  async create(userId: string, communityId: string, dto: CreateChannelDto) {
    const role = await this.access.assertCommunityMember(communityId, userId);
    const status = MODERATOR_ROLES.includes(role) ? 'APPROVED' : 'PENDING';

    try {
      return await this.prisma.channel.create({
        data: {
          communityId,
          slug: dto.slug,
          name: dto.name,
          group: toDbGroup(dto.group),
          description: dto.description,
          status,
          requestedById: userId,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Slug kênh này đã tồn tại trong cộng đồng');
      }
      throw e;
    }
  }

  async listPending(userId: string, communityId: string) {
    await this.access.assertCommunityModerator(communityId, userId);
    return this.prisma.channel.findMany({
      where: { communityId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { requestedBy: { select: requesterSelect } },
    });
  }

  async approve(moderatorId: string, communityId: string, channelId: string) {
    await this.access.assertCommunityModerator(communityId, moderatorId);
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel || channel.communityId !== communityId) {
      throw new NotFoundException(`Kênh ${channelId} không tồn tại`);
    }
    return this.prisma.channel.update({
      where: { id: channelId },
      data: { status: 'APPROVED' },
    });
  }

  async reject(moderatorId: string, communityId: string, channelId: string) {
    await this.access.assertCommunityModerator(communityId, moderatorId);
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel || channel.communityId !== communityId) {
      throw new NotFoundException(`Kênh ${channelId} không tồn tại`);
    }
    return this.prisma.channel.update({
      where: { id: channelId },
      data: { status: 'REJECTED' },
    });
  }
}
