import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspaceService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.workspace.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async create(name: string) {
    return this.prisma.workspace.create({ data: { name } });
  }

  async findOne(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace)
      throw new NotFoundException(`Workspace with id ${workspaceId} not found`);

    return workspace;
  }
}
