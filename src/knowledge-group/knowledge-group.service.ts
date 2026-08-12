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
        visibility: dto.visibility,
      },
    });
    return this.toApi(group, true);
  }

  async remove(userId: string, groupId: string) {
    await this.access.assertGroupOwner(groupId, userId);
    // Cascade xoa documents ben trong qua onDelete: Cascade trong schema.
    await this.prisma.knowledgeGroup.delete({ where: { id: groupId } });
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
