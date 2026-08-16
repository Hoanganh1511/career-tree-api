import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeGroupAccessService } from '../common/knowledge-group-access.service';
import { KnowledgeGroup, Workspace } from '../../generated/prisma/client';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    private prisma: PrismaService,
    private access: KnowledgeGroupAccessService,
  ) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    const workspace = await this.prisma.workspace.create({
      data: {
        ownerId: userId,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
      },
    });
    return this.toApi(workspace);
  }

  // Danh sach Workspace cua 1 user (theo username), MOI Workspace kem san
  // groups (postCount, visibility, viewerCanWrite) - 1 fetch gop cho ca tab
  // "Workspace" cua profile, khong can round-trip rieng cho tung workspace.
  // Nhom PRIVATE VAN duoc tra ve (dang "public directory" - ten/mo ta/postCount
  // thay duoc, coi nhu 1 GitHub private repo: biet ton tai nhung khong doc
  // duoc gi khi chua duoc duyet) thay vi LUOC BO hoan toan nhu truoc - de FE
  // co the hien nut "Yeu cau tham gia" (RequestCollabButton) thay vi group do
  // hoan toan vo hinh, khong ai xin tham gia duoc vi khong biet no ton tai.
  // AN TOAN vi noi dung THAT (documents) van duoc chan rieng, nghiem ngat o
  // DocumentService (assertGroupViewable/filterByGroupVisibility) - endpoint
  // nay chua bao gio tra ve content, chi metadata cua group.
  async listByOwnerWithGroups(viewerId: string, username: string) {
    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!owner) throw new NotFoundException(`User ${username} not found`);
    const isSelf = owner.id === viewerId;

    const workspaces = await this.prisma.workspace.findMany({
      where: { ownerId: owner.id },
      orderBy: { orderIndex: 'asc' },
      include: { groups: { orderBy: { orderIndex: 'asc' } } },
    });

    const allGroupIds = workspaces.flatMap((w) => w.groups.map((g) => g.id));
    const approvedGroupIds = new Set<string>();
    if (!isSelf && allGroupIds.length > 0) {
      const collabs = await this.prisma.knowledgeGroupCollaborator.findMany({
        where: {
          groupId: { in: allGroupIds },
          userId: viewerId,
          status: 'APPROVED',
        },
        select: { groupId: true },
      });
      collabs.forEach((c) => approvedGroupIds.add(c.groupId));
    }

    const checklistStats = await this.getChecklistStats(allGroupIds);

    return workspaces.map((w) => ({
      ...this.toApi(w),
      groups: w.groups.map((g) =>
        this.toApiGroup(
          g,
          isSelf || approvedGroupIds.has(g.id),
          checklistStats.get(g.id),
        ),
      ),
    }));
  }

  // Gop so lieu checklist (tong muc / so muc da hieu) theo TUNG group - dung
  // cho "cay tri thuc" o FE (canh no/day theo % da hieu). 1 query DUY NHAT
  // (khong N+1 theo tung group) - ChecklistItem khong co san knowledgeGroupId
  // truc tiep nen phai join qua Document trong `where`/`select`.
  private async getChecklistStats(groupIds: string[]) {
    const stats = new Map<string, { total: number; understood: number }>();
    if (groupIds.length === 0) return stats;

    const items = await this.prisma.checklistItem.findMany({
      where: { document: { knowledgeGroupId: { in: groupIds } } },
      select: { status: true, document: { select: { knowledgeGroupId: true } } },
    });
    for (const item of items) {
      const gid = item.document.knowledgeGroupId;
      const s = stats.get(gid) ?? { total: 0, understood: 0 };
      s.total += 1;
      if (item.status === 'UNDERSTOOD') s.understood += 1;
      stats.set(gid, s);
    }
    return stats;
  }

  // Goi y workspace tu nhung nguoi VIEWER dang follow (ACTIVE, khong tinh
  // PENDING) - dung cho strip "Gợi ý từ người bạn theo dõi" o man chon
  // workspace (FE). Workspace KHONG co field visibility (khac KnowledgeGroup)
  // nen an toan hien toan bo cho moi followee, khong can loc rieng. Lay 12
  // workspace CAP NHAT gan day nhat xuyen suot tat ca followee (khong phai
  // 12 workspace/nguoi) - danh cho 1 strip goi y ngan, khong phai danh sach
  // day du (khong can cursor pagination).
  async listSuggested(viewerId: string, limit = 12) {
    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: viewerId, status: 'ACTIVE' },
      select: { followeeId: true },
    });
    const followeeIds = follows.map((f) => f.followeeId);
    if (followeeIds.length === 0) return [];

    const workspaces = await this.prisma.workspace.findMany({
      where: { ownerId: { in: followeeIds } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        owner: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
        _count: { select: { groups: true } },
      },
    });

    return workspaces
      .filter((w) => w.owner.username) // can username de dieu huong (/workspace/:username/:id)
      .map((w) => ({
        ...this.toApi(w),
        owner: {
          id: w.owner.id,
          username: w.owner.username as string,
          name: w.owner.name,
          avatarUrl: w.owner.avatarUrl,
        },
        groupCount: w._count.groups,
      }));
  }

  async update(userId: string, workspaceId: string, dto: UpdateWorkspaceDto) {
    await this.access.assertWorkspaceOwner(workspaceId, userId);
    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
      },
    });
    return this.toApi(workspace);
  }

  async remove(userId: string, workspaceId: string) {
    await this.access.assertWorkspaceOwner(workspaceId, userId);
    // Cascade xoa groups -> documents qua onDelete: Cascade trong schema.
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
  }

  private toApi(workspace: Workspace) {
    return {
      id: workspace.id,
      ownerId: workspace.ownerId,
      name: workspace.name,
      description: workspace.description,
      icon: workspace.icon,
      color: workspace.color,
      orderIndex: workspace.orderIndex,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }

  private toApiGroup(
    group: KnowledgeGroup,
    viewerCanWrite: boolean,
    checklistStat?: { total: number; understood: number },
  ) {
    return {
      id: group.id,
      workspaceId: group.workspaceId,
      name: group.name,
      description: group.description,
      goal: group.goal,
      visibility: group.visibility,
      postCount: group.postCount,
      orderIndex: group.orderIndex,
      viewerCanWrite,
      // Gop tu tat ca ChecklistItem cua moi Document trong group - dung ve
      // "canh cay" o FE (KnowledgeTreeCanvas.tsx). Luon tra ve (ke ca group
      // PRIVATE chua duoc duyet) - CHI la 2 con so tong hop, khong lo noi
      // dung that (giong postCount).
      checklistTotal: checklistStat?.total ?? 0,
      checklistUnderstood: checklistStat?.understood ?? 0,
      // Danh sach nay CHI co trong response cua KnowledgeGroupService (khi
      // drill-down vao 1 workspace cu the) - fetch gop nay chi phuc vu browse
      // nen luon rong, tranh N+1 query khong can thiet o day.
      pendingRequests: [] as {
        id: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        joinReason: string | null;
        createdAt: string;
        user: { username: string; name: string; avatarUrl: string };
      }[],
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };
  }
}
