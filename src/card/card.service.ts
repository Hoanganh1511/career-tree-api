import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OwnershipService } from 'src/common/ownership.service';
import { Prisma } from '../../generated/prisma/client';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardService {
  constructor(
    private prisma: PrismaService,
    private ownership: OwnershipService,
  ) {}

  async findAllForNode(
    userId: string,
    nodeId: string,
    params: { cursor?: string; limit?: number },
  ) {
    await this.ownership.assertNodeOwner(nodeId, userId);
    const { cursor, limit = 20 } = params;
    return this.prisma.card.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
  }

  async create(userId: string, nodeId: string, dto: CreateCardDto) {
    await this.ownership.assertNodeOwner(nodeId, userId);
    return this.prisma.card.create({
      data: {
        nodeId,
        content: dto.content as Prisma.InputJsonValue,
        kind: dto.kind,
      },
    });
  }

  async update(userId: string, cardId: string, dto: UpdateCardDto) {
    await this.ownership.assertCardOwner(cardId, userId);
    return this.prisma.card.update({
      where: { id: cardId },
      data: { content: dto.content as Prisma.InputJsonValue },
    });
  }

  async remove(userId: string, cardId: string) {
    await this.ownership.assertCardOwner(cardId, userId);
    return this.prisma.card.delete({ where: { id: cardId } });
  }
}
