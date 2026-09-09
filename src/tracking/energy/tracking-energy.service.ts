import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TrackingEnergyCheckin } from '../../../generated/prisma/client';
import { CreateTrackingEnergyCheckinDto } from './dto/create-tracking-energy-checkin.dto';

const DEFAULT_DAYS = 7;
// Can it nhat ngan nay checkin moi dua ra ket luan "gio nang luong tot
// nhat" - duoi nguong nay chua du tin cay, tra null de FE hien "chua du du
// lieu" thay vi 1 con so vo nghia.
const MIN_CHECKINS_FOR_BEST_HOUR = 5;

@Injectable()
export class TrackingEnergyService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : daysAgo(DEFAULT_DAYS);
    // `to` la date-only string (vd "2026-09-09") -> new Date(to) la 00:00
    // UTC dau ngay do, dung `lte` truc tiep se BO SOT gan het checkin trong
    // chinh ngay `to` (vd goi list(userId, today, today) tu
    // DailyCommandCenterShell.tsx se ra rong). Khi CO `to`, doi sang bien
    // tren EXCLUSIVE = ngay sau + `lt`, cung khuon voi
    // listForDate/listForWeek trong module nay. Khong truyen `to` (mac dinh
    // "toi gio") thi giu nguyen `new Date()` + `lte` nhu cu.
    const checkins = await this.prisma.trackingEnergyCheckin.findMany({
      where: to
        ? { userId, checkedAt: { gte: fromDate, lt: addDays(new Date(to), 1) } }
        : { userId, checkedAt: { gte: fromDate, lte: new Date() } },
      orderBy: { checkedAt: 'asc' },
    });
    return checkins.map((c) => this.toApi(c));
  }

  async create(userId: string, dto: CreateTrackingEnergyCheckinDto) {
    const checkin = await this.prisma.trackingEnergyCheckin.create({
      data: {
        userId,
        physical: dto.physical,
        emotional: dto.emotional,
        mental: dto.mental,
      },
    });
    return this.toApi(checkin);
  }

  // Weekly Planner goi y gio - gom TAT CA checkin cua user theo gio-trong-
  // ngay (UTC, xem ghi chu duoi ham), tra gio co TB `mental` cao nhat. Dung
  // UTC xuyen suot (ca luc tao checkin lan luc gom nhom o day) de nhat quan
  // - gio hien thi co the lech vai tieng so voi gio dia phuong thuc te cua
  // user (han che da biet, ngoai pham vi sua trong 1 luot nay).
  async bestHour(userId: string): Promise<{ hour: number; avgMental: number } | null> {
    const checkins = await this.prisma.trackingEnergyCheckin.findMany({
      where: { userId },
      select: { checkedAt: true, mental: true },
    });
    if (checkins.length < MIN_CHECKINS_FOR_BEST_HOUR) return null;

    const sumByHour = new Map<number, { sum: number; count: number }>();
    for (const c of checkins) {
      const hour = c.checkedAt.getUTCHours();
      const bucket = sumByHour.get(hour) ?? { sum: 0, count: 0 };
      bucket.sum += c.mental;
      bucket.count += 1;
      sumByHour.set(hour, bucket);
    }

    let best: { hour: number; avgMental: number } | null = null;
    for (const [hour, { sum, count }] of sumByHour) {
      const avgMental = Math.round((sum / count) * 10) / 10;
      if (!best || avgMental > best.avgMental) best = { hour, avgMental };
    }
    return best;
  }

  private toApi(checkin: TrackingEnergyCheckin) {
    return {
      id: checkin.id,
      checkedAt: checkin.checkedAt.toISOString(),
      physical: checkin.physical,
      emotional: checkin.emotional,
      mental: checkin.mental,
    };
  }
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
