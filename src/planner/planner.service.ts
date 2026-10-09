import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PlannerItem,
  PlannerCategory,
  PlannerItemType,
  PlannerScheduleKind,
  PlannerStatus,
  Prisma,
} from '../../generated/prisma/client';
import { CreatePlannerItemDto } from './dto/create-planner-item.dto';
import { UpdatePlannerItemDto } from './dto/update-planner-item.dto';
import { UpdatePlannerSettingsDto } from './dto/update-planner-settings.dto';
import { SetCategoryColorDto } from './dto/set-category-color.dto';

// [2026-10-09] REFACTOR Planner: Task/Event/Reminder.
//
// Noi DUY NHAT giu luat nghiep vu ve lich (normalizeSchedule) va ve trang
// thai qua han (deriveStatus) - create/update deu di qua, FE khong tu suy
// lai, tranh 2 ben lech luat.

export interface ChecklistItemApi {
  id: string;
  title: string;
  done: boolean;
}

export interface PlannerItemApi {
  id: string;
  type: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  scheduleKind: string;
  startAt: string | null;
  endAt: string | null;
  dueAt: string | null;
  location: string | null;
  meetingUrl: string | null;
  checklist: ChecklistItemApi[];
  recurrence: Record<string, unknown> | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

// Ket qua chuan hoa lich - DUNG 1 bo cot hop le cho moi scheduleKind.
interface NormalizedSchedule {
  scheduleKind: PlannerScheduleKind;
  startAt: Date | null;
  endAt: Date | null;
  dueAt: Date | null;
}

// scheduleKind nao HOP LE voi tung loai item (spec: "Do not force every item
// to have both startAt and endAt").
const ALLOWED_SCHEDULE_KINDS: Record<PlannerItemType, PlannerScheduleKind[]> = {
  TASK: ['UNSCHEDULED', 'DEADLINE', 'TIMED'],
  EVENT: ['TIMED', 'ALL_DAY'],
  REMINDER: ['DEADLINE'],
};

const DEFAULT_SCHEDULE_KIND: Record<PlannerItemType, PlannerScheduleKind> = {
  TASK: 'UNSCHEDULED',
  EVENT: 'TIMED',
  REMINDER: 'DEADLINE',
};

@Injectable()
export class PlannerService {
  constructor(private prisma: PrismaService) {}

  private async assertOwner(
    userId: string,
    itemId: string,
  ): Promise<PlannerItem> {
    const item = await this.prisma.plannerItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.userId !== userId) {
      throw new NotFoundException(`PlannerItem ${itemId} not found`);
    }
    return item;
  }

  // -------------------------------------------------------------------------
  // Luat lich - 1 cho DUY NHAT cho ca create lan update.
  // -------------------------------------------------------------------------
  private normalizeSchedule(
    type: PlannerItemType,
    kind: PlannerScheduleKind,
    raw: { startAt?: string | null; endAt?: string | null; dueAt?: string | null },
  ): NormalizedSchedule {
    if (!ALLOWED_SCHEDULE_KINDS[type].includes(kind)) {
      throw new BadRequestException(
        `${type} không hỗ trợ scheduleKind=${kind} (chỉ: ${ALLOWED_SCHEDULE_KINDS[type].join(', ')}).`,
      );
    }

    const parse = (v: string | null | undefined, field: string): Date | null => {
      if (v === null || v === undefined) return null;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException(`${field} không phải thời điểm hợp lệ.`);
      }
      return d;
    };

    const startAt = parse(raw.startAt, 'startAt');
    const endAt = parse(raw.endAt, 'endAt');
    const dueAt = parse(raw.dueAt, 'dueAt');

    switch (kind) {
      case 'UNSCHEDULED':
        // Khong giu lai moc nao - tranh "rac" con sot khi doi tu TIMED ve.
        return { scheduleKind: kind, startAt: null, endAt: null, dueAt: null };

      case 'DEADLINE':
        if (!dueAt) {
          throw new BadRequestException('Cần dueAt khi scheduleKind=DEADLINE.');
        }
        return { scheduleKind: kind, startAt: null, endAt: null, dueAt };

      case 'TIMED': {
        if (!startAt || !endAt) {
          throw new BadRequestException(
            'Cần cả startAt và endAt khi scheduleKind=TIMED.',
          );
        }
        if (endAt.getTime() <= startAt.getTime()) {
          throw new BadRequestException('endAt phải sau startAt.');
        }
        return { scheduleKind: kind, startAt, endAt, dueAt: null };
      }

      case 'ALL_DAY': {
        if (!startAt) {
          throw new BadRequestException('Cần startAt khi scheduleKind=ALL_DAY.');
        }
        // Chuan hoa ve 00:00 UTC - ALL_DAY khong co y nghia gio. endAt la
        // ngay CUOI BAO GOM (su kien 1 ngay: endAt = startAt).
        const toMidnight = (d: Date) =>
          new Date(
            Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
          );
        const s = toMidnight(startAt);
        const e = toMidnight(endAt ?? startAt);
        if (e.getTime() < s.getTime()) {
          throw new BadRequestException('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
        }
        return { scheduleKind: kind, startAt: s, endAt: e, dueAt: null };
      }
    }
  }

  // OVERDUE duoc SUY RA luc doc, KHONG luu trong DB: no phu thuoc "bay gio",
  // neu luu cung thi moi dong se cu bi sai dan theo thoi gian. Chi suy ra khi
  // item CHUA ket thuc (SCHEDULED/IN_PROGRESS/NEEDS_ATTENTION) va da qua moc.
  private deriveStatus(item: PlannerItem, now: Date): PlannerStatus {
    if (
      item.status === 'COMPLETED' ||
      item.status === 'CANCELLED' ||
      item.status === 'OVERDUE'
    ) {
      return item.status;
    }
    const deadlineMoment =
      item.scheduleKind === 'DEADLINE'
        ? item.dueAt
        : item.scheduleKind === 'TIMED'
          ? item.endAt
          : null;
    if (deadlineMoment && deadlineMoment.getTime() < now.getTime()) {
      return 'OVERDUE';
    }
    return item.status;
  }

  private normalizeChecklist(
    input: CreatePlannerItemDto['checklist'],
  ): Prisma.InputJsonValue {
    return (input ?? []).map((c, i) => ({
      id: c.id ?? `c${i + 1}`,
      title: c.title,
      done: c.done ?? false,
    }));
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  // Lay theo KHOANG thoi gian cho luoi lich. Mot item lot vao khoang khi:
  // TIMED/ALL_DAY giao nhau voi [from,to], hoac DEADLINE co dueAt trong
  // khoang. UNSCHEDULED KHONG thuoc khoang nao - lay rieng qua
  // listUnscheduled() (spec: "Model unscheduled tasks... explicitly").
  async listRange(userId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('Khoảng thời gian không hợp lệ.');
    }
    // `to` la ngay (YYYY-MM-DD) -> lay het ngay do.
    const toEnd = new Date(toDate);
    if (to.length <= 10) toEnd.setUTCHours(23, 59, 59, 999);

    const items = await this.prisma.plannerItem.findMany({
      where: {
        userId,
        OR: [
          { startAt: { lte: toEnd }, endAt: { gte: fromDate } },
          { dueAt: { gte: fromDate, lte: toEnd } },
        ],
      },
      orderBy: [{ startAt: 'asc' }, { dueAt: 'asc' }, { orderIndex: 'asc' }],
    });
    const now = new Date();
    return items.map((i) => this.toApi(i, now));
  }

  async listUnscheduled(userId: string) {
    const items = await this.prisma.plannerItem.findMany({
      where: { userId, scheduleKind: 'UNSCHEDULED' },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });
    const now = new Date();
    return items.map((i) => this.toApi(i, now));
  }

  async create(userId: string, dto: CreatePlannerItemDto) {
    const kind = dto.scheduleKind ?? DEFAULT_SCHEDULE_KIND[dto.type];
    const schedule = this.normalizeSchedule(dto.type, kind, dto);

    const last = await this.prisma.plannerItem.findFirst({
      where: { userId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const item = await this.prisma.plannerItem.create({
      data: {
        userId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        category: dto.category ?? 'OTHER',
        status: dto.status ?? 'SCHEDULED',
        priority: dto.priority ?? 'NONE',
        ...schedule,
        location: dto.location,
        meetingUrl: dto.meetingUrl,
        checklist: this.normalizeChecklist(dto.checklist),
        recurrence: (dto.recurrence as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        orderIndex: (last?.orderIndex ?? -1) + 1,
      },
    });
    return this.toApi(item, new Date());
  }

  async update(userId: string, itemId: string, dto: UpdatePlannerItemDto) {
    const existing = await this.assertOwner(userId, itemId);

    // Lich chi duoc tinh lai khi nguoi goi DONG den no - neu PATCH chi doi
    // title/status thi giu nguyen bo cot lich hien tai, khong validate lai.
    const touchesSchedule =
      'scheduleKind' in dto ||
      'startAt' in dto ||
      'endAt' in dto ||
      'dueAt' in dto ||
      'type' in dto;

    const nextType = dto.type ?? existing.type;
    let schedule: NormalizedSchedule | undefined;
    if (touchesSchedule) {
      const kind =
        dto.scheduleKind ??
        (ALLOWED_SCHEDULE_KINDS[nextType].includes(existing.scheduleKind)
          ? existing.scheduleKind
          : DEFAULT_SCHEDULE_KIND[nextType]);
      schedule = this.normalizeSchedule(nextType, kind, {
        startAt:
          'startAt' in dto ? dto.startAt : existing.startAt?.toISOString(),
        endAt: 'endAt' in dto ? dto.endAt : existing.endAt?.toISOString(),
        dueAt: 'dueAt' in dto ? dto.dueAt : existing.dueAt?.toISOString(),
      });
    }

    const item = await this.prisma.plannerItem.update({
      where: { id: itemId },
      data: {
        type: dto.type,
        title: dto.title,
        description: 'description' in dto ? dto.description : undefined,
        category: dto.category,
        status: dto.status,
        priority: dto.priority,
        ...(schedule ?? {}),
        location: 'location' in dto ? dto.location : undefined,
        meetingUrl: 'meetingUrl' in dto ? dto.meetingUrl : undefined,
        checklist:
          'checklist' in dto
            ? dto.checklist === null
              ? Prisma.JsonNull
              : this.normalizeChecklist(dto.checklist)
            : undefined,
        recurrence:
          'recurrence' in dto
            ? dto.recurrence === null
              ? Prisma.JsonNull
              : (dto.recurrence as Prisma.InputJsonValue)
            : undefined,
        orderIndex: dto.orderIndex,
      },
    });
    return this.toApi(item, new Date());
  }

  async remove(userId: string, itemId: string) {
    await this.assertOwner(userId, itemId);
    await this.prisma.plannerItem.delete({ where: { id: itemId } });
  }

  // -------------------------------------------------------------------------
  // Mau theo category (thay PlannerTypeColor cu)
  // -------------------------------------------------------------------------
  async getCategoryColors(userId: string) {
    const rows = await this.prisma.plannerCategoryColor.findMany({
      where: { userId },
    });
    return rows.map((r) => ({
      category: r.category,
      main: r.main,
      light: r.light,
      border: r.border,
    }));
  }

  async setCategoryColor(
    userId: string,
    category: string,
    dto: SetCategoryColorDto,
  ) {
    const cat = this.assertCategory(category);
    const row = await this.prisma.plannerCategoryColor.upsert({
      where: { userId_category: { userId, category: cat } },
      create: { userId, category: cat, ...dto },
      update: { ...dto },
    });
    return {
      category: row.category,
      main: row.main,
      light: row.light,
      border: row.border,
    };
  }

  async resetCategoryColor(userId: string, category: string) {
    const cat = this.assertCategory(category);
    await this.prisma.plannerCategoryColor
      .delete({ where: { userId_category: { userId, category: cat } } })
      .catch(() => {
        // Chua tung ghi de - dang dung mac dinh roi, khong phai loi.
      });
  }

  private assertCategory(value: string): PlannerCategory {
    const all = Object.values(PlannerCategory) as string[];
    if (!all.includes(value)) {
      throw new BadRequestException(`Category không hợp lệ: ${value}`);
    }
    return value as PlannerCategory;
  }

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  async getSettings(userId: string) {
    const row = await this.prisma.plannerSettings.findUnique({
      where: { userId },
    });
    if (row) return row;
    return this.prisma.plannerSettings.create({ data: { userId } });
  }

  async updateSettings(userId: string, dto: UpdatePlannerSettingsDto) {
    return this.prisma.plannerSettings.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }

  private toApi(item: PlannerItem, now: Date): PlannerItemApi {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      category: item.category,
      status: this.deriveStatus(item, now),
      priority: item.priority,
      scheduleKind: item.scheduleKind,
      startAt: item.startAt ? item.startAt.toISOString() : null,
      endAt: item.endAt ? item.endAt.toISOString() : null,
      dueAt: item.dueAt ? item.dueAt.toISOString() : null,
      location: item.location,
      meetingUrl: item.meetingUrl,
      checklist: Array.isArray(item.checklist)
        ? (item.checklist as unknown as ChecklistItemApi[])
        : [],
      recurrence: (item.recurrence as Record<string, unknown> | null) ?? null,
      orderIndex: item.orderIndex,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
