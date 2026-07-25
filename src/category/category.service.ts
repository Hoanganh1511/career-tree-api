import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OwnershipService } from 'src/common/ownership.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    private ownership: OwnershipService,
  ) {}

  async findAllForWorkspace(userId: string, workspaceId: string) {
    await this.ownership.assertWorkspaceOwner(workspaceId, userId);
    return this.prisma.category.findMany({
      where: { workspaceId },
      orderBy: { orderIndex: 'asc' },
      include: { tiers: { orderBy: { orderIndex: 'asc' } } },
    });
  }

  async create(userId: string, workspaceId: string, dto: CreateCategoryDto) {
    await this.ownership.assertWorkspaceOwner(workspaceId, userId);
    const siblingCount = await this.prisma.category.count({
      where: { workspaceId },
    });
    return this.prisma.category.create({
      data: { workspaceId, ...dto, orderIndex: siblingCount },
    });
  }

  async update(userId: string, categoryId: string, dto: UpdateCategoryDto) {
    await this.ownership.assertCategoryOwner(categoryId, userId);
    return this.prisma.category.update({
      where: { id: categoryId },
      data: dto,
    });
  }

  async remove(userId: string, categoryId: string) {
    await this.ownership.assertCategoryOwner(categoryId, userId);
    return this.prisma.category.delete({ where: { id: categoryId } });
  }
}
