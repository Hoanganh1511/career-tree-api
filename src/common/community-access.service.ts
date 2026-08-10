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
      select: { isPublic: true },
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
  ): Promise<{ communityId: string }> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { communityId: true, community: { select: { isPublic: true } } },
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

  async assertChannelMember(
    channelId: string,
    userId: string,
  ): Promise<{ communityId: string }> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { communityId: true },
    });
    if (!channel) {
      throw new NotFoundException(`Channel ${channelId} not found`);
    }
    await this.assertCommunityMember(channel.communityId, userId);
    return { communityId: channel.communityId };
  }

  async assertPostViewable(
    postId: string,
    userId: string,
  ): Promise<{ channelId: string; communityId: string }> {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: {
        channelId: true,
        communityId: true,
        community: { select: { isPublic: true } },
      },
    });
    if (!post) throw new NotFoundException(`Post ${postId} not found`);
    if (!post.community.isPublic) {
      await this.assertCommunityMember(post.communityId, userId);
    }
    return { channelId: post.channelId, communityId: post.communityId };
  }

  async assertPostMember(
    postId: string,
    userId: string,
  ): Promise<{ channelId: string; communityId: string }> {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { channelId: true, communityId: true },
    });
    if (!post) throw new NotFoundException(`Post ${postId} not found`);
    await this.assertCommunityMember(post.communityId, userId);
    return { channelId: post.channelId, communityId: post.communityId };
  }

  async assertPostModerator(
    postId: string,
    userId: string,
  ): Promise<{ communityId: string }> {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { communityId: true },
    });
    if (!post) throw new NotFoundException(`Post ${postId} not found`);
    await this.assertCommunityModerator(post.communityId, userId);
    return { communityId: post.communityId };
  }

  async assertPostOwner(postId: string, userId: string): Promise<void> {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post || post.authorId !== userId) {
      throw new NotFoundException(`Post ${postId} not found`);
    }
  }

  async assertCommentOwnerOrModerator(
    commentId: string,
    userId: string,
  ): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, post: { select: { communityId: true } } },
    });
    if (!comment) throw new NotFoundException(`Comment ${commentId} not found`);
    if (comment.authorId === userId) return;
    await this.assertCommunityModerator(comment.post.communityId, userId);
  }
}
