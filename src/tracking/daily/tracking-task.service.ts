import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackingTask } from '../../../generated/prisma/client';
import { CreateTrackingTaskDto } from './dto/create-tracking-task.dto';
import { UpdateTrackingTaskDto } from './dto/update-tracking-task.dto';

@Injectable()
export class TrackingTaskService {
  constructor(private prisma: PrismaService) {}

  private async assertOwner(userId: string, taskId: string): Promise<TrackingTask> {
    const task = await this.prisma.trackingTask.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId) {
      throw new NotFoundException(`TrackingTask ${taskId} not found`);
    }
    return task;
  }

  async listForDate(userId: string, date: string) {
    const tasks = await this.prisma.trackingTask.findMany({
      where: { userId, date: new Date(date) },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'asc' }],
    });
    return tasks.map((t) => this.toApi(t));
  }

  async create(userId: string, dto: CreateTrackingTaskDto) {
    const task = await this.prisma.trackingTask.create({
      data: {
        userId,
        date: new Date(dto.date),
        title: dto.title,
        timeBlockId: dto.timeBlockId,
        estimatedMinutes: dto.estimatedMinutes,
      },
    });
    return this.toApi(task);
  }

  async update(userId: string, taskId: string, dto: UpdateTrackingTaskDto) {
    await this.assertOwner(userId, taskId);
    const task = await this.prisma.trackingTask.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        done: dto.done,
        pinned: dto.pinned,
        estimatedMinutes: dto.estimatedMinutes,
        skipReason: dto.skipReason,
        reviewNote: dto.reviewNote,
      },
    });
    return this.toApi(task);
  }

  async remove(userId: string, taskId: string) {
    await this.assertOwner(userId, taskId);
    await this.prisma.trackingTask.delete({ where: { id: taskId } });
  }

  // Vong Ngay - "Dời sang mai": tao task MOI cho ngay hom sau (giu title/
  // estimatedMinutes/pinned), tang postponedCount, roi xoa task cu - danh
  // dau 1 lan "troi" that thay vi chi sua date tai cho (giu lai lich su qua
  // postponedCount de DailyCommandCenterShell.tsx biet khi nao hien khung
  // "rescue").
  async postpone(userId: string, taskId: string) {
    const task = await this.assertOwner(userId, taskId);
    const nextDate = new Date(task.date);
    nextDate.setDate(nextDate.getDate() + 1);
    const created = await this.prisma.trackingTask.create({
      data: {
        userId,
        date: nextDate,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes,
        pinned: task.pinned,
        postponedCount: task.postponedCount + 1,
      },
    });
    await this.prisma.trackingTask.delete({ where: { id: taskId } });
    return this.toApi(created);
  }

  private toApi(task: TrackingTask) {
    return {
      id: task.id,
      date: task.date.toISOString().slice(0, 10),
      title: task.title,
      timeBlockId: task.timeBlockId,
      estimatedMinutes: task.estimatedMinutes,
      done: task.done,
      pinned: task.pinned,
      skipReason: task.skipReason,
      reviewNote: task.reviewNote,
      postponedCount: task.postponedCount,
      createdAt: task.createdAt.toISOString(),
    };
  }
}
