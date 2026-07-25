import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OwnershipService } from 'src/common/ownership.service';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';

@Injectable()
export class TierService {
  constructor(
    private prisma: PrismaService,
    private ownership: OwnershipService,
  ) {}

  async findAllForCategory(userId: string, categoryId: string) {
    await this.ownership.assertCategoryOwner(categoryId, userId);
    return this.prisma.tier.findMany({
      where: { categoryId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async create(userId: string, categoryId: string, dto: CreateTierDto) {
    await this.ownership.assertCategoryOwner(categoryId, userId);
    const siblingCount = await this.prisma.tier.count({
      where: { categoryId },
    });
    return this.prisma.tier.create({
      data: { categoryId, ...dto, orderIndex: siblingCount },
    });
  }

  async update(userId: string, tierId: string, dto: UpdateTierDto) {
    await this.ownership.assertTierOwner(tierId, userId);
    return this.prisma.tier.update({
      where: { id: tierId },
      data: dto,
    });
  }

  async remove(userId: string, tierId: string) {
    await this.ownership.assertTierOwner(tierId, userId);
    return this.prisma.tier.delete({ where: { id: tierId } });
  }
}
