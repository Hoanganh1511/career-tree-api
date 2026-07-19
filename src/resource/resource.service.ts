import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourceService {
  constructor(private prisma: PrismaService) {}

  findAllForNode(nodeId: string) {
    return this.prisma.resource.findMany({
      where: { nodeId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async create(nodeId: string, dto: CreateResourceDto) {
    const siblingCount = await this.prisma.resource.count({
      where: { nodeId },
    });
    return this.prisma.resource.create({
      data: { nodeId, ...dto, orderIndex: siblingCount },
    });
  }

  update(resourceId: string, dto: UpdateResourceDto) {
    return this.prisma.resource.update({
      where: { id: resourceId },
      data: dto,
    });
  }

  remove(resourceId: string) {
    return this.prisma.resource.delete({ where: { id: resourceId } });
  }
}
