import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { OwnershipService } from 'src/common/ownership.service';
import { computeStreak, STREAK_LOOKBACK_DAYS } from './streak.util';
@Injectable()
export class NodeService {
  constructor(
    private prisma: PrismaService,
    private ownership: OwnershipService,
  ) {}

  async create(userId: string, workspaceId: string, dto: CreateNodeDto) {
    await this.ownership.assertWorkspaceOwner(workspaceId, userId);

    let depth = 0;
    if (dto.parentId) {
      const parent = await this.prisma.node.findUniqueOrThrow({
        where: { id: dto.parentId },
      });
      depth = parent.depth + 1;
    }
    const siblingCount = await this.prisma.node.count({
      where: { workspaceId, parentId: dto.parentId ?? null },
    });
    return this.prisma.node.create({
      data: {
        workspaceId,
        parentId: dto.parentId ?? null,
        title: dto.title,
        depth,
        orderIndex: siblingCount,
      },
    });
  }

  async update(userId: string, nodeId: string, dto: UpdateNodeDto) {
    await this.ownership.assertNodeOwner(nodeId, userId);
    return this.prisma.node.update({
      where: { id: nodeId },
      data: {
        ...dto,
        content: dto.content as Prisma.InputJsonValue | undefined,
      },
    });
  }
  async resetLayout(userId: string, workspaceId: string) {
    await this.ownership.assertWorkspaceOwner(workspaceId, userId);
    await this.prisma.node.updateMany({
      where: { workspaceId },
      data: { x: null, y: null },
    });
  }

  async remove(userId: string, nodeId: string) {
    await this.ownership.assertNodeOwner(nodeId, userId);
    return this.prisma.node.delete({ where: { id: nodeId } });
  }

  async findOne(userId: string, workspaceId: string, nodeId: string) {
    await this.ownership.assertWorkspaceOwner(workspaceId, userId);
    return this.prisma.node.findFirstOrThrow({
      where: { id: nodeId, workspaceId },
    });
  }
  async findTreeForWorkspace(userId: string, workspaceId: string) {
    await this.ownership.assertWorkspaceOwner(workspaceId, userId);
    const nodes = await this.prisma.node.findMany({
      where: { workspaceId },
      orderBy: [{ depth: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
      omit: { content: true },
    });

    const streakCutoff = new Date(
      Date.now() - STREAK_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    const [cardStats, resourceStats, issueStats, recentCards] =
      await Promise.all([
        this.prisma.card.groupBy({
          by: ['nodeId', 'kind'],
          where: { node: { workspaceId } },
          _count: { _all: true },
          _max: { updatedAt: true },
        }),
        this.prisma.resource.groupBy({
          by: ['nodeId'],
          where: { node: { workspaceId } },
          _count: { _all: true },
        }),
        this.prisma.issue.groupBy({
          by: ['nodeId'],
          where: { node: { workspaceId }, resolved: false },
          _count: { _all: true },
        }),
        // Chi lay du du lieu de tinh streak/7-ngay gan nhat - khong keo ca content Card.
        this.prisma.card.findMany({
          where: { node: { workspaceId }, updatedAt: { gte: streakCutoff } },
          select: { nodeId: true, updatedAt: true },
        }),
      ]);

    type OwnStats = {
      cardCount: number;
      practiceCount: number;
      resourceCount: number;
      openIssueCount: number;
      lastActivity: Date | null;
    };
    const ownStats = new Map<string, OwnStats>();
    const getOwn = (nodeId: string): OwnStats => {
      let entry = ownStats.get(nodeId);
      if (!entry) {
        entry = {
          cardCount: 0,
          practiceCount: 0,
          resourceCount: 0,
          openIssueCount: 0,
          lastActivity: null,
        };
        ownStats.set(nodeId, entry);
      }
      return entry;
    };

    for (const s of cardStats) {
      const entry = getOwn(s.nodeId);
      entry.cardCount += s._count._all;
      if (s.kind === 'PRACTICE') entry.practiceCount += s._count._all;
      if (
        s._max.updatedAt &&
        (!entry.lastActivity || s._max.updatedAt > entry.lastActivity)
      ) {
        entry.lastActivity = s._max.updatedAt;
      }
    }
    for (const s of resourceStats) {
      getOwn(s.nodeId).resourceCount += s._count._all;
    }
    for (const s of issueStats) {
      getOwn(s.nodeId).openIssueCount += s._count._all;
    }

    // Ngay (UTC, "YYYY-MM-DD") co hoat dong cua RIENG node do (chua gop con).
    const ownActiveDays = new Map<string, Set<string>>();
    for (const c of recentCards) {
      const key = c.updatedAt.toISOString().slice(0, 10);
      let set = ownActiveDays.get(c.nodeId);
      if (!set) {
        set = new Set();
        ownActiveDays.set(c.nodeId, set);
      }
      set.add(key);
    }

    const childrenOf = new Map<string, string[]>();

    for (const n of nodes) {
      if (n.parentId) {
        childrenOf.set(n.parentId, [
          ...(childrenOf.get(n.parentId) ?? []),
          n.id,
        ]);
      }
    }

    const resultMap = new Map<string, OwnStats>();

    function computeFor(nodeId: string): OwnStats {
      if (resultMap.has(nodeId)) return resultMap.get(nodeId)!;

      const own = getOwn(nodeId);
      const result: OwnStats = { ...own };
      for (const childId of childrenOf.get(nodeId) ?? []) {
        const childStats = computeFor(childId);
        result.cardCount += childStats.cardCount;
        result.practiceCount += childStats.practiceCount;
        result.resourceCount += childStats.resourceCount;
        result.openIssueCount += childStats.openIssueCount;
        if (
          childStats.lastActivity &&
          (!result.lastActivity ||
            childStats.lastActivity > result.lastActivity)
        ) {
          result.lastActivity = childStats.lastActivity;
        }
      }
      resultMap.set(nodeId, result);
      return result;
    }

    // Ngay hoat dong gop ca nhanh con (giong cach computeFor gop cardCount) -
    // de node cha cung phan anh dung "ca nhanh co dang hoc deu khong", nhat
    // quan voi cach lastActivity/cardCount hien tai da cascade len cha.
    const activeDaysResultMap = new Map<string, Set<string>>();
    function computeActiveDays(nodeId: string): Set<string> {
      const cached = activeDaysResultMap.get(nodeId);
      if (cached) return cached;

      const result = new Set(ownActiveDays.get(nodeId) ?? []);
      for (const childId of childrenOf.get(nodeId) ?? []) {
        for (const day of computeActiveDays(childId)) result.add(day);
      }
      activeDaysResultMap.set(nodeId, result);
      return result;
    }

    const today = new Date();
    return nodes.map((n) => ({
      ...n,
      ...computeFor(n.id),
      streak: computeStreak(computeActiveDays(n.id), today),
    }));
  }
}
