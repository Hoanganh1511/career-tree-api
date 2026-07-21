import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.workspace.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, name: string) {
    return this.prisma.workspace.create({ data: { name, ownerId: userId } });
  }

  async findOne(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
    });
    if (!workspace)
      throw new NotFoundException(`Workspace with id ${workspaceId} not found`);
    return workspace;
  }
}
