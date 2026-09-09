import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackingTimeBlock } from '../../../generated/prisma/client';
import { CreateTrackingTimeBlockDto } from './dto/create-tracking-time-block.dto';
import { UpdateTrackingTimeBlockDto } from './dto/update-tracking-time-block.dto';

// Weekly Planner - MVP khong keo-tha (xem plan), block them/sua/xoa qua
// form. `weekStart` la ngay thu Hai cua tuan (ISO date) - list 7 ngay tiep
// theo tu do.
@Injectable()
export class TrackingTimeBlockService {
  constructor(private prisma: PrismaService) {}

  private async assertOwner(userId: string, blockId: string): Promise<TrackingTimeBlock> {
    const block = await this.prisma.trackingTimeBlock.findUnique({ where: { id: blockId } });
    if (!block || block.userId !== userId) {
      throw new NotFoundException(`TrackingTimeBlock ${blockId} not found`);
    }
    return block;
  }

  async listForWeek(userId: string, weekStart: string) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const blocks = await this.prisma.trackingTimeBlock.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: [{ date: 'asc' }, { startMinute: 'asc' }],
    });
    return blocks.map((b) => this.toApi(b));
  }

  async create(userId: string, dto: CreateTrackingTimeBlockDto) {
    const block = await this.prisma.trackingTimeBlock.create({
      data: {
        userId,
        date: new Date(dto.date),
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        label: dto.label,
        kind: dto.kind,
        goalStepId: dto.goalStepId,
      },
    });
    return this.toApi(block);
  }

  async update(userId: string, blockId: string, dto: UpdateTrackingTimeBlockDto) {
    await this.assertOwner(userId, blockId);
    const block = await this.prisma.trackingTimeBlock.update({
      where: { id: blockId },
      data: {
        startMinute: dto.startMinute,
        endMinute: dto.endMinute,
        label: dto.label,
        kind: dto.kind,
      },
    });
    return this.toApi(block);
  }

  async remove(userId: string, blockId: string) {
    await this.assertOwner(userId, blockId);
    await this.prisma.trackingTimeBlock.delete({ where: { id: blockId } });
  }

  private toApi(block: TrackingTimeBlock) {
    return {
      id: block.id,
      date: block.date.toISOString().slice(0, 10),
      startMinute: block.startMinute,
      endMinute: block.endMinute,
      label: block.label,
      kind: block.kind,
      goalStepId: block.goalStepId,
    };
  }
}
