import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OwnershipService {
  constructor(private prisma: PrismaService) {}

  async assertWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    if (!ws || ws.ownerId !== userId) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }
  }

  async assertNodeOwner(nodeId: string, userId: string): Promise<void> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { workspace: { select: { ownerId: true } } },
    });
    if (!node || node.workspace.ownerId !== userId) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }
  }

  async assertCardOwner(cardId: string, userId: string): Promise<void> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
        node: { select: { workspace: { select: { ownerId: true } } } },
      },
    });
    if (!card || card.node.workspace.ownerId !== userId) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }
  }

  async assertResourceOwner(resourceId: string, userId: string): Promise<void> {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        node: { select: { workspace: { select: { ownerId: true } } } },
      },
    });
    if (!resource || resource.node.workspace.ownerId !== userId) {
      throw new NotFoundException(`Resource ${resourceId} not found`);
    }
  }

  async assertIssueOwner(issueId: string, userId: string): Promise<void> {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        node: { select: { workspace: { select: { ownerId: true } } } },
      },
    });
    if (!issue || issue.node.workspace.ownerId !== userId) {
      throw new NotFoundException(`Issue ${issueId} not found`);
    }
  }

  async assertNotificationOwner(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const n = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { workspace: { select: { ownerId: true } } },
    });
    if (!n || n.workspace.ownerId !== userId) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
  }
}
