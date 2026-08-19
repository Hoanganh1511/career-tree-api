import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class KnowledgeGroupAccessService {
  constructor(private prisma: PrismaService) {}

  async getCollaboration(groupId: string, userId: string) {
    return this.prisma.knowledgeGroupCollaborator.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  async assertWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (!workspace || workspace.ownerId !== userId) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }
  }

  // 404 (khong phai 403) neu group khong ton tai, hoac PRIVATE ma viewer
  // khong phai chu workspace/collaborator APPROVED - dung convention repo.
  async assertGroupViewable(groupId: string, userId: string): Promise<void> {
    const group = await this.prisma.knowledgeGroup.findUnique({
      where: { id: groupId },
      select: { visibility: true, workspace: { select: { ownerId: true } } },
    });
    if (!group)
      throw new NotFoundException(`Knowledge group ${groupId} not found`);
    if (group.visibility === 'PUBLIC') return;
    if (group.workspace.ownerId === userId) return;
    const collab = await this.getCollaboration(groupId, userId);
    if (!collab || collab.status !== 'APPROVED') {
      throw new NotFoundException(`Knowledge group ${groupId} not found`);
    }
  }

  // Quyen GHI (tao/sua/xoa bai) - chu workspace HOAC collaborator APPROVED,
  // BAT KE visibility (PUBLIC khong co nghia "ai cung viet duoc").
  async assertGroupWriter(
    groupId: string,
    userId: string,
  ): Promise<{ workspaceId: string }> {
    const group = await this.prisma.knowledgeGroup.findUnique({
      where: { id: groupId },
      select: { workspaceId: true, workspace: { select: { ownerId: true } } },
    });
    if (!group)
      throw new NotFoundException(`Knowledge group ${groupId} not found`);
    if (group.workspace.ownerId === userId) {
      return { workspaceId: group.workspaceId };
    }
    const collab = await this.getCollaboration(groupId, userId);
    if (!collab || collab.status !== 'APPROVED') {
      throw new NotFoundException(`Knowledge group ${groupId} not found`);
    }
    return { workspaceId: group.workspaceId };
  }

  // Quyet dinh yeu cau cong tac (approve/reject) - CHI chu workspace, khong
  // co tier moderator nhu Community (spec: "chủ sở hữu duyệt").
  async assertGroupOwner(groupId: string, userId: string): Promise<void> {
    const group = await this.prisma.knowledgeGroup.findUnique({
      where: { id: groupId },
      select: { workspace: { select: { ownerId: true } } },
    });
    if (!group || group.workspace.ownerId !== userId) {
      throw new NotFoundException(`Knowledge group ${groupId} not found`);
    }
  }

  // Ghi nhan "hom nay nhom nay co hoat dong that" (tao/sua bai, doi trang
  // thai checklist) - upsert 1 dong/ngay (@@unique chan trung), goi duoc ca
  // trong 1 $transaction dang chay (truyen tx) lan doc lap (truyen
  // this.prisma tu noi goi). Dung cho GroupProgressWidget.tsx (so ngay hoc/
  // streak).
  async recordStudyDay(
    tx: Prisma.TransactionClient | PrismaService,
    knowledgeGroupId: string,
  ): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await tx.knowledgeGroupStudyDay.upsert({
      where: { knowledgeGroupId_date: { knowledgeGroupId, date: today } },
      create: { knowledgeGroupId, date: today },
      update: {},
    });
  }
}
