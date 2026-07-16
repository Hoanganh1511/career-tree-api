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
    return this.prisma.node.create({
      data: {
        workspaceId,
        parentId: dto.parentId ?? null,
        title: dto.title,
        depth,
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

  async findTreeForWorkspace(workspaceId: string) {
    const nodes = await this.prisma.node.findMany({
      where: { workspaceId },
      orderBy: [{ depth: 'asc' }, { orderIndex: 'asc' }],
    });

    const stats = await this.prisma.card.groupBy({
      by: ['nodeId'],
      where: { node: { workspaceId } },
      _count: { _all: true },
      _max: { updatedAt: true },
    });

    const statsByNode = new Map(
      stats.map((s) => [
        s.nodeId,
        { count: s._count._all, last: s._max.updatedAt },
      ]),
    );

    //     Gộp con -> cha: branch/root không có card riêng vẫn phản ảnh hoạt động của con cháu
    const childrenOf = new Map<string, string[]>();

    for (const n of nodes) {
      if (n.parentId) {
        childrenOf.set(n.parentId, [
          ...(childrenOf.get(n.parentId) ?? []),
          n.id,
        ]);
      }
    }

    const resultMap = new Map<
      string,
      { cardCount: number; lastActivity: Date | null }
    >();
    function computeFor(nodeId: string): {
      cardCount: number;
      lastActivity: Date | null;
    } {
      if (resultMap.has(nodeId)) return resultMap.get(nodeId)!;

      const own = statsByNode.get(nodeId);
      let cardCount = own?.count ?? 0;
      let lastActivity = own?.last ?? null;
      for (const childId of childrenOf.get(nodeId) ?? []) {
        const childStats = computeFor(childId);
        cardCount += childStats.cardCount;
        if (
          childStats.lastActivity &&
          (!lastActivity || childStats.lastActivity > lastActivity)
        ) {
          lastActivity = childStats.lastActivity;
        }
      }
      const result = { cardCount, lastActivity };
      resultMap.set(nodeId, result);
      return result;
    }

    return nodes.map((n) => ({ ...n, ...computeFor(n.id) }));
  }
}
