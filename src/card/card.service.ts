import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardService {
  constructor(private prisma: PrismaService) {}
  findAllForNode(nodeId: string) {
    return this.prisma.card.findMany({
      where: { nodeId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  create(nodeId: string, dto: CreateCardDto) {
    return this.prisma.card.create({
      data: { nodeId, content: dto.content as Prisma.InputJsonValue },
    });
  }

  update(cardId: string, dto: UpdateCardDto) {
    return this.prisma.card.update({
      where: { id: cardId },
      data: { content: dto.content as Prisma.InputJsonValue },
    });
  }

  remove(cardId: string) {
    return this.prisma.card.delete({ where: { id: cardId } });
  }
}
