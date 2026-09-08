import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiaryEntry, DiaryTopic } from '../../generated/prisma/client';
import { CreateDiaryTopicDto } from './dto/create-diary-topic.dto';
import { UpdateDiaryTopicDto } from './dto/update-diary-topic.dto';
import { CreateDiaryEntryDto } from './dto/create-diary-entry.dto';
import { UpdateDiaryEntryDto } from './dto/update-diary-entry.dto';

@Injectable()
export class DiaryService {
  constructor(private prisma: PrismaService) {}

  // AdminGuard da chan toan bo controller chi cho 1 tai khoan admin, nhung
  // van assert ownerId o day (khong tin tuong mu quang vao guard tang tren) -
  // cung tien le voi KnowledgeGroupAccessService.assertGroupOwner.
  private async assertTopicOwner(
    userId: string,
    topicId: string,
  ): Promise<DiaryTopic> {
    const topic = await this.prisma.diaryTopic.findUnique({
      where: { id: topicId },
    });
    if (!topic || topic.ownerId !== userId) {
      throw new NotFoundException(`DiaryTopic ${topicId} not found`);
    }
    return topic;
  }

  private async assertEntryOwner(
    userId: string,
    entryId: string,
  ): Promise<DiaryEntry> {
    const entry = await this.prisma.diaryEntry.findUnique({
      where: { id: entryId },
      include: { topic: true },
    });
    if (!entry || entry.topic.ownerId !== userId) {
      throw new NotFoundException(`DiaryEntry ${entryId} not found`);
    }
    return entry;
  }

  async listTopics(userId: string) {
    const topics = await this.prisma.diaryTopic.findMany({
      where: { ownerId: userId },
      orderBy: { orderIndex: 'asc' },
    });
    return topics.map((t) => this.topicToApi(t));
  }

  async createTopic(userId: string, dto: CreateDiaryTopicDto) {
    const last = await this.prisma.diaryTopic.findFirst({
      where: { ownerId: userId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const topic = await this.prisma.diaryTopic.create({
      data: {
        ownerId: userId,
        name: dto.name,
        orderIndex: (last?.orderIndex ?? -1) + 1,
      },
    });
    return this.topicToApi(topic);
  }

  async updateTopic(userId: string, topicId: string, dto: UpdateDiaryTopicDto) {
    await this.assertTopicOwner(userId, topicId);
    const topic = await this.prisma.diaryTopic.update({
      where: { id: topicId },
      data: { name: dto.name, orderIndex: dto.orderIndex },
    });
    return this.topicToApi(topic);
  }

  async deleteTopic(userId: string, topicId: string) {
    await this.assertTopicOwner(userId, topicId);
    // Cascade xoa het entries ben trong qua onDelete: Cascade trong schema.
    await this.prisma.diaryTopic.delete({ where: { id: topicId } });
  }

  async listEntries(userId: string, topicId: string) {
    await this.assertTopicOwner(userId, topicId);
    const entries = await this.prisma.diaryEntry.findMany({
      where: { topicId },
      orderBy: { entryDate: 'desc' },
    });
    return entries.map((e) => this.entryToApi(e));
  }

  async createEntry(userId: string, topicId: string, dto: CreateDiaryEntryDto) {
    await this.assertTopicOwner(userId, topicId);
    const entry = await this.prisma.diaryEntry.create({
      data: {
        topicId,
        title: dto.title,
        content: dto.content,
        entryDate: new Date(dto.entryDate),
      },
    });
    return this.entryToApi(entry);
  }

  async updateEntry(
    userId: string,
    entryId: string,
    dto: UpdateDiaryEntryDto,
  ) {
    await this.assertEntryOwner(userId, entryId);
    const entry = await this.prisma.diaryEntry.update({
      where: { id: entryId },
      data: {
        title: dto.title,
        content: dto.content,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined,
      },
    });
    return this.entryToApi(entry);
  }

  async deleteEntry(userId: string, entryId: string) {
    await this.assertEntryOwner(userId, entryId);
    await this.prisma.diaryEntry.delete({ where: { id: entryId } });
  }

  private topicToApi(topic: DiaryTopic) {
    return {
      id: topic.id,
      name: topic.name,
      orderIndex: topic.orderIndex,
      createdAt: topic.createdAt.toISOString(),
      updatedAt: topic.updatedAt.toISOString(),
    };
  }

  private entryToApi(entry: DiaryEntry) {
    return {
      id: entry.id,
      topicId: entry.topicId,
      title: entry.title,
      content: entry.content,
      entryDate: entry.entryDate.toISOString().slice(0, 10),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}
