import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeGroupAccessService } from '../common/knowledge-group-access.service';
import {
  LearningObjective,
  LearningObjectiveItem,
} from '../../generated/prisma/client';
import { CreateObjectiveDto } from './dto/create-objective.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';
import { CreateObjectiveItemDto } from './dto/create-objective-item.dto';
import { UpdateObjectiveItemDto } from './dto/update-objective-item.dto';
import { UpdateObjectiveItemStatusDto } from './dto/update-objective-item-status.dto';

type ObjectiveWithItems = LearningObjective & { items: LearningObjectiveItem[] };

@Injectable()
export class ObjectiveService {
  constructor(
    private prisma: PrismaService,
    private groupAccess: KnowledgeGroupAccessService,
  ) {}

  async list(viewerId: string, groupId: string) {
    await this.groupAccess.assertGroupViewable(groupId, viewerId);
    const objectives = await this.prisma.learningObjective.findMany({
      where: { knowledgeGroupId: groupId },
      orderBy: { orderIndex: 'asc' },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });
    return objectives.map((o) => this.toApi(o));
  }

  async create(userId: string, groupId: string, dto: CreateObjectiveDto) {
    await this.groupAccess.assertGroupWriter(groupId, userId);
    const last = await this.prisma.learningObjective.findFirst({
      where: { knowledgeGroupId: groupId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const objective = await this.prisma.learningObjective.create({
      data: {
        knowledgeGroupId: groupId,
        title: dto.title,
        description: dto.description,
        orderIndex: (last?.orderIndex ?? -1) + 1,
      },
      include: { items: true },
    });
    return this.toApi(objective);
  }

  async update(userId: string, id: string, dto: UpdateObjectiveDto) {
    await this.assertOwnedObjective(id, userId);
    const objective = await this.prisma.learningObjective.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        orderIndex: dto.orderIndex,
      },
      include: { items: { orderBy: { orderIndex: 'asc' } } },
    });
    return this.toApi(objective);
  }

  async remove(userId: string, id: string) {
    await this.assertOwnedObjective(id, userId);
    await this.prisma.learningObjective.delete({ where: { id } });
  }

  async addItem(userId: string, objectiveId: string, dto: CreateObjectiveItemDto) {
    const objective = await this.assertOwnedObjective(objectiveId, userId);
    const last = await this.prisma.learningObjectiveItem.findFirst({
      where: { objectiveId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const item = await this.prisma.learningObjectiveItem.create({
      data: {
        objectiveId: objective.id,
        type: dto.type,
        label: dto.label,
        orderIndex: (last?.orderIndex ?? -1) + 1,
      },
    });
    return this.toApiItem(item);
  }

  async updateItem(userId: string, id: string, dto: UpdateObjectiveItemDto) {
    await this.assertOwnedItem(id, userId);
    const item = await this.prisma.learningObjectiveItem.update({
      where: { id },
      data: { label: dto.label, note: dto.note, orderIndex: dto.orderIndex },
    });
    return this.toApiItem(item);
  }

  async updateItemStatus(
    userId: string,
    id: string,
    dto: UpdateObjectiveItemStatusDto,
  ) {
    const owned = await this.assertOwnedItem(id, userId);
    const item = await this.prisma.learningObjectiveItem.update({
      where: { id },
      data: { status: dto.status },
    });
    await this.groupAccess.recordStudyDay(this.prisma, owned.groupId);
    return this.toApiItem(item);
  }

  async removeItem(userId: string, id: string) {
    await this.assertOwnedItem(id, userId);
    await this.prisma.learningObjectiveItem.delete({ where: { id } });
  }

  private async assertOwnedObjective(
    id: string,
    userId: string,
  ): Promise<LearningObjective> {
    const objective = await this.prisma.learningObjective.findUnique({
      where: { id },
    });
    if (!objective) throw new NotFoundException(`Objective ${id} not found`);
    await this.groupAccess.assertGroupWriter(objective.knowledgeGroupId, userId);
    return objective;
  }

  private async assertOwnedItem(
    id: string,
    userId: string,
  ): Promise<{ groupId: string }> {
    const item = await this.prisma.learningObjectiveItem.findUnique({
      where: { id },
      select: { objective: { select: { knowledgeGroupId: true } } },
    });
    if (!item) throw new NotFoundException(`Objective item ${id} not found`);
    await this.groupAccess.assertGroupWriter(
      item.objective.knowledgeGroupId,
      userId,
    );
    return { groupId: item.objective.knowledgeGroupId };
  }

  private toApi(objective: ObjectiveWithItems) {
    return {
      id: objective.id,
      knowledgeGroupId: objective.knowledgeGroupId,
      title: objective.title,
      description: objective.description,
      orderIndex: objective.orderIndex,
      createdAt: objective.createdAt.toISOString(),
      updatedAt: objective.updatedAt.toISOString(),
      items: objective.items.map((i) => this.toApiItem(i)),
    };
  }

  private toApiItem(item: LearningObjectiveItem) {
    return {
      id: item.id,
      objectiveId: item.objectiveId,
      type: item.type,
      label: item.label,
      status: item.status,
      note: item.note,
      orderIndex: item.orderIndex,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
