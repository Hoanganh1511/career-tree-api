import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardService {
  constructor(private prisma: PrismaService) {}
  findAllForNode(nodeId: string, params: { cursor?: string; limit?: number }) {
    const { cursor, limit = 20 } = params;
    return this.prisma.card.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    // cursor: {id: cursor} nói với prisma: bắt đầu từ bản ghi có `id` này trở đi
    // skip:1 - bắt buộc phải có khi dùng cursor, vì bản thân bản ghi tại cursor đã được trả về ở lần gọi trước rồi, skip:1 - để bỏ qua nó, không bị lặp lại
    // Tức: lần gọi tiếp theo -> truyền cursor = id của bản ghi cuối cùng đã nhận ở lần trước
    // Đó là lý do phải đổi `orderBy` từ orderIndex: 'asc' sang createdAt: 'desc'; cursor pagination cần thứ tự ổn định
    //  và không đổi giữa các lần gọi (nếu 1 bản ghi mới được thêm vào giữa lúc đang phân trang mà thứ tự bị xáo trộn thì cursor sẽ trỏ sai chỗ)
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
