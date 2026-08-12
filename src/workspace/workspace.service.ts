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
  // Nhom PRIVATE ma viewer khong xem duoc bi LUOC BO hoan toan (khong phai
  // chi an noi dung), giong cach Document.listByAuthor da lam voi ban nhap.
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

    return workspaces.map((w) => ({
      ...this.toApi(w),
      groups: w.groups
        .filter(
          (g) =>
            g.visibility === 'PUBLIC' || isSelf || approvedGroupIds.has(g.id),
        )
        .map((g) => this.toApiGroup(g, isSelf || approvedGroupIds.has(g.id))),
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

  private toApiGroup(group: KnowledgeGroup, viewerCanWrite: boolean) {
    return {
      id: group.id,
      workspaceId: group.workspaceId,
      name: group.name,
      description: group.description,
      visibility: group.visibility,
      postCount: group.postCount,
      orderIndex: group.orderIndex,
      viewerCanWrite,
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
