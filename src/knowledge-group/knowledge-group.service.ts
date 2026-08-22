import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeGroupAccessService } from '../common/knowledge-group-access.service';
import { KnowledgeGroup, Prisma } from '../../generated/prisma/client';
import { CreateKnowledgeGroupDto } from './dto/create-knowledge-group.dto';
import { UpdateKnowledgeGroupDto } from './dto/update-knowledge-group.dto';

const collabUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  email: true,
} satisfies Prisma.UserSelect;

// Dem streak (so ngay LIEN TUC) lui tu HOM NAY - neu hom nay CHUA co hoat
// dong thi thu tu HOM QUA (streak van "song" neu hom qua co, chi la chua noi
// dai them hom nay), khong co ca 2 -> 0. `datesDesc` da @db.Date (UTC
// midnight) nen so sanh qua ISO day-key la du, khong can chinh timezone.
function computeStreak(datesDesc: Date[]): number {
  if (datesDesc.length === 0) return 0;
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const daySet = new Set(datesDesc.map(dayKey));

  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  if (!daySet.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!daySet.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (daySet.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

@Injectable()
export class KnowledgeGroupService {
  constructor(
    private prisma: PrismaService,
    private access: KnowledgeGroupAccessService,
  ) {}

  async create(
    userId: string,
    workspaceId: string,
    dto: CreateKnowledgeGroupDto,
  ) {
    await this.access.assertWorkspaceOwner(workspaceId, userId);
    const group = await this.prisma.knowledgeGroup.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        visibility: dto.visibility ?? 'PRIVATE',
      },
    });
    return this.toApi(group, true);
  }

  // Danh sach nhom cua 1 workspace, loc theo quyen xem cua viewer. Neu viewer
  // la chu workspace, moi nhom PRIVATE dinh kem san danh sach yeu cau cong
  // tac dang PENDING (khong co endpoint rieng cho "pending requests", giong
  // pattern CommunityService.findBySlug's joinRequests).
  async findForWorkspace(viewerId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (!workspace) return [];
    const isOwner = workspace.ownerId === viewerId;

    const groups = await this.prisma.knowledgeGroup.findMany({
      where: { workspaceId },
      orderBy: { orderIndex: 'asc' },
    });

    const approvedGroupIds = new Set<string>();
    if (!isOwner && groups.length > 0) {
      const collabs = await this.prisma.knowledgeGroupCollaborator.findMany({
        where: {
          groupId: { in: groups.map((g) => g.id) },
          userId: viewerId,
          status: 'APPROVED',
        },
        select: { groupId: true },
      });
      collabs.forEach((c) => approvedGroupIds.add(c.groupId));
    }

    const visible = groups.filter(
      (g) => g.visibility === 'PUBLIC' || isOwner || approvedGroupIds.has(g.id),
    );

    return Promise.all(
      visible.map(async (g) => {
        const viewerCanWrite = isOwner || approvedGroupIds.has(g.id);
        const pendingRequests = isOwner
          ? await this.prisma.knowledgeGroupCollaborator.findMany({
              where: { groupId: g.id, status: 'PENDING' },
              orderBy: { createdAt: 'desc' },
              include: { user: { select: collabUserSelect } },
            })
          : [];
        return this.toApi(g, viewerCanWrite, pendingRequests);
      }),
    );
  }

  async update(userId: string, groupId: string, dto: UpdateKnowledgeGroupDto) {
    await this.access.assertGroupOwner(groupId, userId);
    const group = await this.prisma.knowledgeGroup.update({
      where: { id: groupId },
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        certName: dto.certName,
        certCode: dto.certCode,
        visibility: dto.visibility,
        goal: dto.goal as Prisma.InputJsonValue | undefined,
        roadmap: dto.roadmap as Prisma.InputJsonValue | undefined,
      },
    });
    return this.toApi(group, true);
  }

  async remove(userId: string, groupId: string) {
    await this.access.assertGroupOwner(groupId, userId);
    // Cascade xoa documents ben trong qua onDelete: Cascade trong schema.
    await this.prisma.knowledgeGroup.delete({ where: { id: groupId } });
  }

  // So lieu cho GroupProgressWidget.tsx (FE) - certName/certCode/postCount
  // KHONG lap lai o day, FE da co san qua ApiKnowledgeGroup (findForWorkspace).
  async getProgress(viewerId: string, groupId: string) {
    await this.access.assertGroupViewable(groupId, viewerId);

    const [topicCount, studyDays, checklistItems] = await Promise.all([
      this.prisma.documentSeries.count({
        where: { knowledgeGroupId: groupId },
      }),
      this.prisma.knowledgeGroupStudyDay.findMany({
        where: { knowledgeGroupId: groupId },
        select: { date: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.checklistItem.findMany({
        where: { document: { knowledgeGroupId: groupId } },
        select: { status: true },
      }),
    ]);

    const understood = checklistItems.filter(
      (i) => i.status === 'UNDERSTOOD',
    ).length;
    const progressPercent =
      checklistItems.length > 0
        ? Math.round((understood / checklistItems.length) * 100)
        : 0;

    return {
      progressPercent,
      totalStudyDays: studyDays.length,
      topicCount,
      currentStreak: computeStreak(studyDays.map((d) => d.date)),
    };
  }

  // Du lieu cho widget "hanh trinh" tren /home (FE) - danh sach PHANG tat ca
  // nhom kien thuc viewer SO HUU (qua cac Workspace cua chinh ho), kem %
  // tien do - khac getProgress() (1 nhom) va WorkspaceService.listByOwnerWithGroups
  // (long theo tung Workspace, khong co %). Viet rieng o day (khong import
  // cheo sang WorkspaceService) theo dung tien le da co trong file nay.
  async getJourney(viewerId: string) {
    const workspaces = await this.prisma.workspace.findMany({
      where: { ownerId: viewerId },
      include: { groups: { orderBy: { orderIndex: 'asc' } } },
    });
    const groups = workspaces.flatMap((w) => w.groups);
    if (groups.length === 0) {
      return { groups: [], currentGroupId: null, totalUnderstood: 0 };
    }
    const groupIds = groups.map((g) => g.id);

    const [checklistItems, studyDays] = await Promise.all([
      this.prisma.checklistItem.findMany({
        where: { document: { knowledgeGroupId: { in: groupIds } } },
        select: {
          status: true,
          document: { select: { knowledgeGroupId: true } },
        },
      }),
      this.prisma.knowledgeGroupStudyDay.findMany({
        where: { knowledgeGroupId: { in: groupIds } },
        select: { knowledgeGroupId: true, date: true },
        orderBy: { date: 'desc' },
      }),
    ]);

    const statsByGroup = new Map<
      string,
      { total: number; understood: number }
    >();
    for (const item of checklistItems) {
      const gid = item.document.knowledgeGroupId;
      const s = statsByGroup.get(gid) ?? { total: 0, understood: 0 };
      s.total += 1;
      if (item.status === 'UNDERSTOOD') s.understood += 1;
      statsByGroup.set(gid, s);
    }
    const datesByGroup = new Map<string, Date[]>();
    for (const row of studyDays) {
      const arr = datesByGroup.get(row.knowledgeGroupId) ?? [];
      arr.push(row.date);
      datesByGroup.set(row.knowledgeGroupId, arr);
    }

    const apiGroups = groups.map((g) => {
      const stats = statsByGroup.get(g.id) ?? { total: 0, understood: 0 };
      const dates = datesByGroup.get(g.id) ?? [];
      return {
        id: g.id,
        workspaceId: g.workspaceId,
        name: g.name,
        description: g.description,
        icon: g.icon,
        postCount: g.postCount,
        progressPercent:
          stats.total > 0
            ? Math.round((stats.understood / stats.total) * 100)
            : 0,
        totalStudyDays: dates.length,
        currentStreak: computeStreak(dates),
      };
    });

    // "Chuong hien tai" = nhom co ngay hoc GAN NHAT THAT SU (studyDays da
    // orderBy date desc nen row dau la ngay gan nhat toan bo). Chua hoc
    // ngay nao thi fallback nhom moi tao gan nhat - van la du lieu that,
    // khong bia so.
    const mostRecentStudyRow = studyDays[0];
    const currentGroupId =
      mostRecentStudyRow?.knowledgeGroupId ??
      [...groups].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0]?.id ??
      null;

    const totalUnderstood = apiGroups.reduce((sum, g) => {
      const s = statsByGroup.get(g.id);
      return sum + (s?.understood ?? 0);
    }, 0);

    return { groups: apiGroups, currentGroupId, totalUnderstood };
  }

  private toApi(
    group: KnowledgeGroup,
    viewerCanWrite: boolean,
    pendingRequests: Prisma.KnowledgeGroupCollaboratorGetPayload<{
      include: { user: { select: typeof collabUserSelect } };
    }>[] = [],
  ) {
    return {
      id: group.id,
      workspaceId: group.workspaceId,
      name: group.name,
      description: group.description,
      icon: group.icon,
      certName: group.certName,
      certCode: group.certCode,
      goal: group.goal,
      roadmap: group.roadmap,
      visibility: group.visibility,
      postCount: group.postCount,
      orderIndex: group.orderIndex,
      viewerCanWrite,
      pendingRequests: pendingRequests.map((r) => ({
        id: r.id,
        status: r.status,
        joinReason: r.joinReason,
        createdAt: r.createdAt.toISOString(),
        user: {
          username: r.user.username ?? r.user.id,
          name: r.user.name,
          avatarUrl: r.user.avatarUrl ?? '',
        },
      })),
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };
  }
}
