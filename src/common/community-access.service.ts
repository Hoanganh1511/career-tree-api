import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityMemberRole } from '../../generated/prisma/client';

const MODERATOR_ROLES: CommunityMemberRole[] = ['OWNER', 'ADMIN'];

@Injectable()
export class CommunityAccessService {
  constructor(private prisma: PrismaService) {}

  async getMembership(communityId: string, userId: string) {
    return this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
  }

  async assertCommunityViewable(
    communityId: string,
    userId: string,
  ): Promise<void> {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { isPrivate: true },
    });
    if (!community) {
      throw new NotFoundException(`Community ${communityId} not found`);
    }
    if (community.isPublic) return;
    await this.assertCommunityMember(communityId, userId);
  }

  async assertCommunityMember(
    communityId: string,
    userId: string,
  ): Promise<CommunityMemberRole> {
    const member = await this.getMembership(communityId, userId);
    if (!member || member.status !== 'APPROVED') {
      throw new NotFoundException(`Community ${communityId} not found`);
    }
    return member.role;
  }
  async assertCommunityModerator(
    communityId: string,
    userId: string,
  ): Promise<void> {
    const role = await this.assertCommunityMember(communityId, userId);
    if (!MODERATOR_ROLES.includes(role)) {
      throw new NotFoundException(`Community ${communityId} not found`);
    }
  }

  async assertChannelViewable(
    channelId: string,
    userId: string,
  ): Promise<void> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { communityId: true, isPrivate: true },
    });
    if (!channel) {
      throw new NotFoundException(`Channel ${channelId} not found`);
    }
    if (!channel.community.isPublic) {
      await this.assertCommunityMember(channel.communityId, userId);
    }
    return {
      communityId: channel.communityId,
    };
  }
}
