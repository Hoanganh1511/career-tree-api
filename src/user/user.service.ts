import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { SyncUserDto } from './dto/sync-user.dto';
import { FollowService } from 'src/follow/follow.service';

@Injectable()
export class UserService {
  private readonly userSelect = {
    id: true,
    username: true,
    name: true,
    avatarUrl: true,
    verified: true,
    createdAt: true,
    followerCount: true,
    followingCount: true,
    profile: {
      select: {
        bio: true,
        coverImageUrl: true,
        location: true,
        websiteUrl: true,
        pronouns: true,
        postCount: true,
      },
    },
  } satisfies Prisma.UserSelect;
  constructor(
    private prisma: PrismaService,
    private followService: FollowService,
  ) {}

  async syncUser(dto: SyncUserDto): Promise<{ id: string }> {
    await this.ensureSystemFlagRow();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { googleId: dto.googleId },
        // avatarUrl luon dong bo lai theo Google (nguon duy nhat hien tai) -
        // username thi KHONG, chi sinh 1 LAN duy nhat khi con null (xem duoi),
        // tranh ghi de neu sau nay them tinh nang tu doi username rieng.
        update: { email: dto.email, name: dto.name, avatarUrl: dto.avatarUrl },
        create: {
          googleId: dto.googleId,
          email: dto.email,
          name: dto.name,
          avatarUrl: dto.avatarUrl,
        },
      });

      // User dong bo qua Google KHONG co san username (Google chi tra
      // googleId/email/name/picture) - can 1 gia tri de dung trong URL
      // profile (/u/:username) va Post.author. Chi sinh khi con null, khong
      // ghi de - dung slug tu phan truoc @ cua email, doi ky tu la/so, them
      // hau to so neu trung.
      if (!user.username) {
        const base =
          dto.email
            .split('@')[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') || 'user';
        let candidate = base;
        let attempt = 0;
        while (
          await tx.user.findUnique({
            where: { username: candidate },
            select: { id: true },
          })
        ) {
          attempt += 1;
          candidate = `${base}${attempt}`;
        }
        await tx.user.update({
          where: { id: user.id },
          data: { username: candidate },
        });
      }

      const claim = await tx.systemFlag.updateMany({
        where: { id: 1, legacyBackfillDone: false },
        data: { legacyBackfillDone: true },
      });

      if (claim.count === 1) {
        await tx.workspace.updateMany({
          where: { ownerId: null },
          data: { ownerId: user.id },
        });
      } else {
        const ownWorkspaceCount = await tx.workspace.count({
          where: { ownerId: user.id },
        });
        if (ownWorkspaceCount === 0) {
          await tx.workspace.create({
            data: { name: 'My Career Tree', ownerId: user.id },
          });
        }
      }

      return { id: user.id };
    });
  }

  // "Dang xuat khoi moi thiet bi" - danh dau moc thoi gian, moi token noi bo
  // phat hanh truoc moc nay se bi JwtAuthGuard tu choi. Khong xoa session nao
  // ca (khong co session store de xoa), chi lam chung het hieu luc.
  async revokeAllSessions(userId: string): Promise<{ revokedAt: string }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { tokensValidAfter: new Date() },
      select: { tokensValidAfter: true },
    });
    return { revokedAt: user.tokensValidAfter!.toISOString() };
  }

  private async ensureSystemFlagRow(): Promise<void> {
    try {
      await this.prisma.systemFlag.create({
        data: { id: 1, legacyBackfillDone: false },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return;
      }
      throw e;
    }
  }

  async canViewProfile(viewerId: string, targetId: string): Promise<boolean> {
    if (viewerId === targetId) return true;
    const blocked = await this.followService.isBlockedEitherDirection(
      viewerId,
      targetId,
    );
    return !blocked;
  }
  async getProfileByUsername(viewerId: string, username: string) {
    const target = await this.prisma.user.findUnique({
      where: { username },
      select: this.userSelect,
    });
    if (!target) throw new NotFoundException(`User ${username} not found`);

    const canView = await this.canViewProfile(viewerId, target.id);
    if (!canView) throw new NotFoundException(`User ${username} not found`);

    const isFollowing = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followeeId: { followerId: viewerId, followeeId: target.id },
      },
      select: { followerId: true },
    });

    return {
      id: target.id,
      username: target.username,
      displayName: target.name,
      avatarUrl: target.avatarUrl ?? '',
      isVerified: target.verified,
      createdAt: target.createdAt.toISOString(),
      followerCount: target.followerCount,
      followingCount: target.followingCount,
      bio: target.profile?.bio ?? null,
      coverImageUrl: target.profile?.coverImageUrl ?? null,
      location: target.profile?.location ?? null,
      websiteUrl: target.profile?.websiteUrl ?? null,
      pronouns: target.profile?.pronouns ?? null,
      postCount: target.profile?.postCount ?? 0,
      isSelf: viewerId === target.id,
      isFollowing: isFollowing !== null,
    };
  }
}
