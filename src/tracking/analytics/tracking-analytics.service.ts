import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackingEnergyService } from '../energy/tracking-energy.service';
import { TrackingTimeBlock } from '../../../generated/prisma/client';

const WINDOW_DAYS = 7;

export type TrackingWeeklySummary = {
  from: string;
  to: string;
  taskCompletionRate: number | null;
  tasksDone: number;
  tasksTotal: number;
  avgEnergy: { physical: number; emotional: number; mental: number } | null;
  avgSleepHours: number | null;
  groupSessionCount: number;
};

// Analytics - GOM so lieu 7 ngay gan nhat, tra THANG so lieu (khong
// coaching - xem TrackingAssistantService cho phan goi y AI, doc lai
// summary nay lam context THAT thay vi tu tinh lai).
@Injectable()
export class TrackingAnalyticsService {
  constructor(
    private prisma: PrismaService,
    private trackingEnergyService: TrackingEnergyService,
  ) {}

  async weeklySummary(userId: string): Promise<TrackingWeeklySummary> {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - WINDOW_DAYS);

    const [tasks, checkins, wellnessLogs, sessionCount] = await Promise.all([
      this.prisma.trackingTask.findMany({
        where: { userId, date: { gte: from, lte: to } },
        select: { done: true },
      }),
      this.prisma.trackingEnergyCheckin.findMany({
        where: { userId, checkedAt: { gte: from, lte: to } },
        select: { physical: true, emotional: true, mental: true },
      }),
      this.prisma.trackingWellnessLog.findMany({
        where: { userId, date: { gte: from, lte: to } },
        select: { sleepHours: true },
      }),
      this.prisma.trackingGroupSession.count({
        where: { userId, startedAt: { gte: from, lte: to } },
      }),
    ]);

    const tasksDone = tasks.filter((t) => t.done).length;
    const avgEnergy =
      checkins.length > 0
        ? {
            physical: avg(checkins.map((c) => c.physical)),
            emotional: avg(checkins.map((c) => c.emotional)),
            mental: avg(checkins.map((c) => c.mental)),
          }
        : null;
    const sleepValues = wellnessLogs
      .map((l) => l.sleepHours)
      .filter((v): v is number => v != null);

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      taskCompletionRate: tasks.length > 0 ? tasksDone / tasks.length : null,
      tasksDone,
      tasksTotal: tasks.length,
      avgEnergy,
      avgSleepHours: sleepValues.length > 0 ? avg(sleepValues) : null,
      groupSessionCount: sessionCount,
    };
  }

  // "Data -> Pattern -> Recommendation" RULE-BASED (khong goi AI) - dem so
  // khoi FOCUSED trong 7 ngay TOI chua nam dung gio nang luong tot nhat, de
  // FE hoi "Xem & ap dung" that (xem applyBestHour). Tra null neu chua du
  // du lieu energy hoac khong co gi can chinh.
  async recommendation(userId: string) {
    const bestHour = await this.trackingEnergyService.bestHour(userId);
    if (!bestHour) return null;

    const { fromDate, toDate } = nextWindow();
    const focusedBlocks = await this.prisma.trackingTimeBlock.findMany({
      where: { userId, kind: 'FOCUSED', date: { gte: fromDate, lt: toDate } },
      select: { startMinute: true },
    });
    const focusedBlocksToRealign = focusedBlocks.filter(
      (b) => b.startMinute !== bestHour.hour * 60,
    ).length;
    if (focusedBlocksToRealign === 0) return null;

    return { bestHour: bestHour.hour, focusedBlocksToRealign };
  }

  // "Recommendation -> Action" THAT: dich MOI khoi FOCUSED trong 7 ngay TOI
  // sang dung khung gio nang luong tot nhat (giu nguyen do dai). Day la
  // vong Analytics -> Planner that (khong chi ve bieu do) - xem plan "Flow
  // - lam du vong lap con lai".
  async applyBestHour(userId: string) {
    const bestHour = await this.trackingEnergyService.bestHour(userId);
    if (!bestHour) return [];

    const { fromDate, toDate } = nextWindow();
    const blocks = await this.prisma.trackingTimeBlock.findMany({
      where: {
        userId,
        kind: 'FOCUSED',
        date: { gte: fromDate, lt: toDate },
        startMinute: { not: bestHour.hour * 60 },
      },
    });

    const updated: TrackingTimeBlock[] = [];
    for (const block of blocks) {
      const duration = block.endMinute - block.startMinute;
      const newStart = bestHour.hour * 60;
      const result = await this.prisma.trackingTimeBlock.update({
        where: { id: block.id },
        data: { startMinute: newStart, endMinute: newStart + duration },
      });
      updated.push(result);
    }
    return updated.map((b) => this.blockToApi(b));
  }

  private blockToApi(block: TrackingTimeBlock) {
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

function avg(values: number[]): number {
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

function nextWindow(): { fromDate: Date; toDate: Date } {
  const fromDate = new Date();
  const toDate = new Date(fromDate);
  toDate.setDate(toDate.getDate() + WINDOW_DAYS);
  return { fromDate, toDate };
}
