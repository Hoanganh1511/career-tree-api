import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OwnershipService } from 'src/common/ownership.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourceService {
  constructor(
    private prisma: PrismaService,
    private ownership: OwnershipService,
  ) {}

  async findAllForNode(userId: string, nodeId: string) {
    await this.ownership.assertNodeOwner(nodeId, userId);
    return this.prisma.resource.findMany({
      where: { nodeId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async create(userId: string, nodeId: string, dto: CreateResourceDto) {
    await this.ownership.assertNodeOwner(nodeId, userId);
    const siblingCount = await this.prisma.resource.count({
      where: { nodeId },
    });
    return this.prisma.resource.create({
      data: { nodeId, ...dto, orderIndex: siblingCount },
    });
  }

  async update(userId: string, resourceId: string, dto: UpdateResourceDto) {
    await this.ownership.assertResourceOwner(resourceId, userId);
    return this.prisma.resource.update({
      where: { id: resourceId },
      data: dto,
    });
  }

  async remove(userId: string, resourceId: string) {
    await this.ownership.assertResourceOwner(resourceId, userId);
    return this.prisma.resource.delete({ where: { id: resourceId } });
  }
}
