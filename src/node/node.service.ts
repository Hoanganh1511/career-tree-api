import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';

@Injectable()
export class NodeService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateNodeDto) {
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

  update(nodeId: string, dto: UpdateNodeDto) {
    return this.prisma.node.update({
      where: { id: nodeId },
      data: {
        ...dto,
        content: dto.content as Prisma.InputJsonValue | undefined,
      },
    });
  }

  remove(nodeId: string) {
    return this.prisma.node.delete({ where: { id: nodeId } });
  }

  findOne(workspaceId: string, nodeId: string) {
    return this.prisma.node.findFirstOrThrow({
      where: { id: nodeId, workspaceId },
    });
  }

  async findTreeForWorkspace(workspaceId: string) {
    const nodes = await this.prisma.node.findMany({
      where: { workspaceId },
      orderBy: [{ depth: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
      omit: { content: true },
    });

    const [cardStats, resourceStats, issueStats] = await Promise.all([
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

    return nodes.map((n) => ({ ...n, ...computeFor(n.id) }));
  }
}
