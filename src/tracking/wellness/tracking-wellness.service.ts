import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackingWellnessLog } from '../../../generated/prisma/client';
import { UpsertTrackingWellnessLogDto } from './dto/upsert-tracking-wellness-log.dto';

@Injectable()
export class TrackingWellnessService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string, date: string) {
    const log = await this.prisma.trackingWellnessLog.findUnique({
      where: { userId_date: { userId, date: new Date(date) } },
    });
    return log ? this.toApi(log) : null;
  }

  // 1 log/ngay/user - dua vao @@unique([userId, date]) trong schema, upsert
  // thay vi phai tach create/update rieng (form FE luon PUT ca object).
  async upsert(userId: string, date: string, dto: UpsertTrackingWellnessLogDto) {
    const log = await this.prisma.trackingWellnessLog.upsert({
      where: { userId_date: { userId, date: new Date(date) } },
      create: {
        userId,
        date: new Date(date),
        sleepHours: dto.sleepHours,
        sleepQuality: dto.sleepQuality,
        napMinutes: dto.napMinutes,
        exerciseMinutes: dto.exerciseMinutes,
        mealsLogged: dto.mealsLogged,
        notes: dto.notes,
      },
      update: {
        sleepHours: dto.sleepHours,
        sleepQuality: dto.sleepQuality,
        napMinutes: dto.napMinutes,
        exerciseMinutes: dto.exerciseMinutes,
        mealsLogged: dto.mealsLogged,
        notes: dto.notes,
      },
    });
    return this.toApi(log);
  }

  // Wellness -> Energy/Execution insight - so tỷ le hoan thanh TrackingTask
  // CUNG NGAY giua nhom "ngu du" (>=7h) va "chua du" tu toi da 30 log gan
  // nhat co sleepHours. Can >=3 ngay MOI nhom moi tra so (duoi nguong = null
  // - chua du du lieu de ket luan, tranh so gay hieu lam).
  async sleepInsight(userId: string) {
    const logs = await this.prisma.trackingWellnessLog.findMany({
      where: { userId, sleepHours: { not: null } },
      orderBy: { date: 'desc' },
      take: 30,
      select: { date: true, sleepHours: true },
    });
    if (logs.length === 0) return { withGoodSleep: null, withoutGoodSleep: null };

    const dates = logs.map((l) => l.date);
    const tasks = await this.prisma.trackingTask.findMany({
      where: { userId, date: { in: dates } },
      select: { date: true, done: true },
    });
    const tasksByDate = new Map<string, { done: number; total: number }>();
    for (const t of tasks) {
      const key = t.date.toISOString().slice(0, 10);
      const bucket = tasksByDate.get(key) ?? { done: 0, total: 0 };
      bucket.total += 1;
      if (t.done) bucket.done += 1;
      tasksByDate.set(key, bucket);
    }

    const good: number[] = [];
    const notGood: number[] = [];
    for (const log of logs) {
      const key = log.date.toISOString().slice(0, 10);
      const bucket = tasksByDate.get(key);
      // Ngay khong co task nao thi khong tinh vao ty le (khong noi len gi
      // ve "ngu co giup hoan thanh viec khong").
      if (!bucket || bucket.total === 0) continue;
      const rate = bucket.done / bucket.total;
      if (log.sleepHours! >= 7) good.push(rate);
      else notGood.push(rate);
    }

    const MIN_DAYS = 3;
    return {
      withGoodSleep: good.length >= MIN_DAYS ? avgPercent(good) : null,
      withoutGoodSleep: notGood.length >= MIN_DAYS ? avgPercent(notGood) : null,
    };
  }

  private toApi(log: TrackingWellnessLog) {
    return {
      date: log.date.toISOString().slice(0, 10),
      sleepHours: log.sleepHours,
      sleepQuality: log.sleepQuality,
      napMinutes: log.napMinutes,
      exerciseMinutes: log.exerciseMinutes,
      mealsLogged: log.mealsLogged,
      notes: log.notes,
    };
  }
}

function avgPercent(rates: number[]): number {
  return Math.round((rates.reduce((s, r) => s + r, 0) / rates.length) * 100);
}
