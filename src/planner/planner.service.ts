import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PlannerItem,
  Prisma,
  LifeItemType,
} from '../../generated/prisma/client';
import { CreatePlannerItemDto } from './dto/create-planner-item.dto';
import { UpdatePlannerItemDto } from './dto/update-planner-item.dto';
import { UpdatePlannerSettingsDto } from './dto/update-planner-settings.dto';

function assertLifeItemType(type: string): LifeItemType {
  if (!Object.values(LifeItemType).includes(type as LifeItemType)) {
    throw new BadRequestException(`Loại không hợp lệ: ${type}`);
  }
  return type as LifeItemType;
}

type PlannerItemWithChildren = PlannerItem & { children: PlannerItem[] };

// Kieu tra ve CHO API - khai bao TUONG MINH (khong de TypeScript tu suy ra)
// vi toApi() GOI DE QUY chinh no (cho `children`) - ham de quy KHONG co kieu
// tra ve tuong minh se khien TypeScript khong suy luan duoc (circular infer),
// roi am tham roi ve `any` CHO CA HAM - gay loi eslint "Unsafe return of any"
// o MOI noi goi toApi(), du logic chay dung (bug thuan ve KIEU, khong phai
// runtime).
export interface PlannerItemApi {
  id: string;
  date: string;
  title: string;
  kind: string;
  itemType: string;
  scheduledMinute: number | null;
  color: string | null;
  durationMinutes: number | null;
  isFocus: boolean;
  done: boolean;
  orderIndex: number;
  parentId: string | null;
  priority: string | null;
  status: string | null;
  area: string | null;
  project: string | null;
  tags: string[];
  deadline: string | null;
  metadata: Record<string, unknown> | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  children?: PlannerItemApi[];
}

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

  // Danh sach cho 1 khoang ngay (tuan/thang, xem PlannerShell ben frontend) -
  // CHI top-level item (parentId null), moi item kem san `children` (dau viec
  // con cua planner "lớn") de FE khong phai goi them request nao khac.
  async listRange(userId: string, from: string, to: string) {
    const items = await this.prisma.plannerItem.findMany({
      where: {
        userId,
        parentId: null,
        date: { gte: new Date(from), lte: new Date(to) },
      },
      include: { children: { orderBy: { orderIndex: 'asc' } } },
      orderBy: [{ date: 'asc' }, { orderIndex: 'asc' }],
    });
    return items.map((i) => this.toApi(i));
  }

  async create(userId: string, dto: CreatePlannerItemDto) {
    // Chen 1 dau viec CON - lay date/kind THANG tu planner cha (bo qua
    // dto.date/dto.kind neu nguoi goi co truyen) de dam bao con LUON cung
    // ngay voi cha va LUON la SIMPLE (khong long BIG trong BIG) - xem comment
    // schema.prisma ve gioi han 1 cap nay. Item CON ke thua `itemType` cua
    // dto nhu binh thuong (khong ep theo cha - 1 Action "lớn" van co the
    // chua cac dau viec con la Action binh thuong).
    if (dto.parentId) {
      const parent = await this.assertOwner(userId, dto.parentId);
      if (parent.parentId !== null) {
        throw new BadRequestException(
          'Không thể thêm đầu việc con vào một đầu việc con khác (chỉ hỗ trợ 1 cấp).',
        );
      }
      // [2026-10-07] BO gioi han "chi kind=BIG moi co children" - yeu cau
      // nguoi dung: "bổ sung các đầu mục việc trong task" (checklist) cho
      // MOI task, khong rieng gi loai "Lớn/Subtasks" da chon tu luc tao.
      // `kind` gio CHI con quyet dinh component hien thi o Right Panel
      // (BigTimelineItem/TimelineRow, xem PlannerShell.tsx), khong con gate
      // kha nang them dau viec con nua.
      const last = await this.prisma.plannerItem.findFirst({
        where: { parentId: dto.parentId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });
      const child = await this.prisma.plannerItem.create({
        data: {
          userId,
          date: parent.date,
          title: dto.title,
          kind: 'SIMPLE',
          itemType: dto.itemType ?? 'ACTION',
          scheduledMinute: dto.scheduledMinute,
          color: dto.color,
          durationMinutes: dto.durationMinutes,
          isFocus: dto.isFocus ?? false,
          parentId: dto.parentId,
          orderIndex: (last?.orderIndex ?? -1) + 1,
          priority: dto.priority,
          status: dto.status,
          area: dto.area,
          project: dto.project,
          tags: dto.tags ?? [],
          deadline: dto.deadline ? new Date(dto.deadline) : undefined,
          metadata: dto.metadata as Prisma.InputJsonValue | undefined,
          description: dto.description,
        },
      });
      return this.toApi(child);
    }

    const last = await this.prisma.plannerItem.findFirst({
      where: { userId, parentId: null, date: new Date(dto.date) },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const item = await this.prisma.plannerItem.create({
      data: {
        userId,
        date: new Date(dto.date),
        title: dto.title,
        kind: dto.kind ?? 'SIMPLE',
        itemType: dto.itemType ?? 'ACTION',
        scheduledMinute: dto.scheduledMinute,
        color: dto.color,
        durationMinutes: dto.durationMinutes,
        isFocus: dto.isFocus ?? false,
        orderIndex: (last?.orderIndex ?? -1) + 1,
        priority: dto.priority,
        status: dto.status,
        area: dto.area,
        project: dto.project,
        tags: dto.tags ?? [],
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        description: dto.description,
      },
    });
    return this.toApi(item);
  }

  async update(userId: string, itemId: string, dto: UpdatePlannerItemDto) {
    await this.assertOwner(userId, itemId);
    const item = await this.prisma.plannerItem.update({
      where: { id: itemId },
      data: {
        title: dto.title,
        done: dto.done,
        itemType: dto.itemType,
        // 'scheduledMinute' in dto - phan biet "khong truyen" (giu nguyen,
        // Prisma bo qua field undefined) voi "truyen null" (XOA gio da dat,
        // Prisma ghi NULL that su) - khac voi cac field khac o day deu CHI
        // nhan 1 kieu gia tri hop le (khong co nhu cau xoa ve rong). Ap dung
        // CUNG 1 pattern cho toan bo metadata moi (priority/status/area/
        // project/deadline/metadata).
        scheduledMinute:
          'scheduledMinute' in dto ? dto.scheduledMinute : undefined,
        // 'color' in dto - cung tinh than voi scheduledMinute o tren (phan
        // biet "khong truyen" = giu nguyen voi "truyen null" = xoa mau da dat).
        color: 'color' in dto ? dto.color : undefined,
        durationMinutes:
          'durationMinutes' in dto ? dto.durationMinutes : undefined,
        isFocus: dto.isFocus,
        orderIndex: dto.orderIndex,
        priority: 'priority' in dto ? dto.priority : undefined,
        status: 'status' in dto ? dto.status : undefined,
        area: 'area' in dto ? dto.area : undefined,
        project: 'project' in dto ? dto.project : undefined,
        tags: dto.tags,
        deadline:
          'deadline' in dto
            ? dto.deadline === null || dto.deadline === undefined
              ? dto.deadline
              : new Date(dto.deadline)
            : undefined,
        // Prisma.JsonNull (khong phai `null` tho) - API rieng cua Prisma de
        // ghi gia tri SQL NULL that su vao 1 cot Json (`null` tho se bi hieu
        // la "khong truyen gi" doi voi field Json, khac het cac field thuong
        // khac o tren).
        metadata:
          'metadata' in dto
            ? dto.metadata === null
              ? Prisma.JsonNull
              : (dto.metadata as Prisma.InputJsonValue)
            : undefined,
        description: 'description' in dto ? dto.description : undefined,
      },
    });
    return this.toApi(item);
  }

  async remove(userId: string, itemId: string) {
    await this.assertOwner(userId, itemId);
    // Cascade xoa het children qua onDelete: Cascade trong schema.
    await this.prisma.plannerItem.delete({ where: { id: itemId } });
  }

  // [2026-10-06] "User customization" (spec section 21) - doi CA 1 color
  // family cho 1 Type, khong phai tung mau rieng le. Type nao KHONG co dong
  // trong bang nay = dung mau mac dinh cua chinh no (FE tu fallback, xem
  // life-item-types.ts) - khong can tao san 4 dong rong luc user moi dang ky.
  async getTypeColors(userId: string) {
    const rows = await this.prisma.plannerTypeColor.findMany({
      where: { userId },
    });
    return rows.map((r) => ({ type: r.type, paletteId: r.paletteId }));
  }

  async setTypeColor(userId: string, type: string, paletteId: string) {
    const lifeItemType = assertLifeItemType(type);
    await this.prisma.plannerTypeColor.upsert({
      where: { userId_type: { userId, type: lifeItemType } },
      create: { userId, type: lifeItemType, paletteId },
      update: { paletteId },
    });
    return { type: lifeItemType, paletteId };
  }

  async resetTypeColor(userId: string, type: string) {
    const lifeItemType = assertLifeItemType(type);
    await this.prisma.plannerTypeColor
      .delete({ where: { userId_type: { userId, type: lifeItemType } } })
      .catch(() => {
        // Khong co dong nao de xoa (dang dung mac dinh roi) - khong phai loi.
      });
  }

  // [2026-10-07] Settings modal cua Planner (toolbar icon moi, xem
  // PlannerSettingsModal.tsx FE) - 1 DONG/user (xem model PlannerSettings,
  // cung tinh than TrackingSettings). getSettings() TU TAO 1 dong voi gia
  // tri @default (schema.prisma) neu user CHUA TUNG mo Settings - FE luon
  // nhan duoc 1 object DAY DU, khong can tu merge voi default o FE.
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

  private toApi(item: PlannerItem | PlannerItemWithChildren): PlannerItemApi {
    return {
      id: item.id,
      date: item.date.toISOString().slice(0, 10),
      title: item.title,
      kind: item.kind,
      itemType: item.itemType,
      scheduledMinute: item.scheduledMinute,
      color: item.color,
      durationMinutes: item.durationMinutes,
      isFocus: item.isFocus,
      done: item.done,
      orderIndex: item.orderIndex,
      parentId: item.parentId,
      priority: item.priority,
      status: item.status,
      area: item.area,
      project: item.project,
      tags: item.tags,
      deadline: item.deadline ? item.deadline.toISOString().slice(0, 10) : null,
      metadata: (item.metadata as Record<string, unknown> | null) ?? null,
      description: item.description,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      children:
        'children' in item
          ? item.children.map((c) => this.toApi(c))
          : undefined,
    };
  }
}
