import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlannerItem } from '../../generated/prisma/client';
import { CreatePlannerItemDto } from './dto/create-planner-item.dto';
import { UpdatePlannerItemDto } from './dto/update-planner-item.dto';

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
  scheduledMinute: number | null;
  done: boolean;
  orderIndex: number;
  parentId: string | null;
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
    // schema.prisma ve gioi han 1 cap nay.
    if (dto.parentId) {
      const parent = await this.assertOwner(userId, dto.parentId);
      if (parent.parentId !== null) {
        throw new BadRequestException(
          'Không thể thêm đầu việc con vào một đầu việc con khác (chỉ hỗ trợ 1 cấp).',
        );
      }
      if (parent.kind !== 'BIG') {
        throw new BadRequestException(
          'Chỉ planner "lớn" mới có thể chứa đầu việc con.',
        );
      }
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
          scheduledMinute: dto.scheduledMinute,
          parentId: dto.parentId,
          orderIndex: (last?.orderIndex ?? -1) + 1,
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
        scheduledMinute: dto.scheduledMinute,
        orderIndex: (last?.orderIndex ?? -1) + 1,
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
        // 'scheduledMinute' in dto - phan biet "khong truyen" (giu nguyen,
        // Prisma bo qua field undefined) voi "truyen null" (XOA gio da dat,
        // Prisma ghi NULL that su) - khac voi cac field khac o day deu CHI
        // nhan 1 kieu gia tri hop le (khong co nhu cau xoa ve rong).
        scheduledMinute:
          'scheduledMinute' in dto ? dto.scheduledMinute : undefined,
        orderIndex: dto.orderIndex,
      },
    });
    return this.toApi(item);
  }

  async remove(userId: string, itemId: string) {
    await this.assertOwner(userId, itemId);
    // Cascade xoa het children qua onDelete: Cascade trong schema.
    await this.prisma.plannerItem.delete({ where: { id: itemId } });
  }

  private toApi(item: PlannerItem | PlannerItemWithChildren): PlannerItemApi {
    return {
      id: item.id,
      date: item.date.toISOString().slice(0, 10),
      title: item.title,
      kind: item.kind,
      scheduledMinute: item.scheduledMinute,
      done: item.done,
      orderIndex: item.orderIndex,
      parentId: item.parentId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      children:
        'children' in item
          ? item.children.map((c) => this.toApi(c))
          : undefined,
    };
  }
}
