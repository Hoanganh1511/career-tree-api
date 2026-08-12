import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeGroupAccessService } from '../common/knowledge-group-access.service';
import { Prisma } from '../../generated/prisma/client';

const collabUserSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  email: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class KnowledgeGroupCollaboratorService {
  constructor(
    private prisma: PrismaService,
    private access: KnowledgeGroupAccessService,
  ) {}

  // Ap dung cho CA nhom PUBLIC lan PRIVATE - visibility chi gate quyen XEM,
  // khong gate quyen GHI, nen ai cung phai request/duoc duyet moi viet bai
  // chung duoc, bat ke nhom co the xem cong khai hay khong.
  async requestCollab(userId: string, groupId: string, reason?: string) {
    const group = await this.prisma.knowledgeGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group)
      throw new NotFoundException(`Knowledge group ${groupId} not found`);

    try {
      return await this.prisma.knowledgeGroupCollaborator.create({
        data: { groupId, userId, joinReason: reason, status: 'PENDING' },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Bạn đã gửi yêu cầu cộng tác vào nhóm này rồi',
        );
      }
      throw e;
    }
  }

  async leave(userId: string, groupId: string) {
    const collab = await this.access.getCollaboration(groupId, userId);
    if (!collab) {
      throw new NotFoundException(`Bạn chưa cộng tác trong nhóm này`);
    }
    await this.prisma.knowledgeGroupCollaborator.delete({
      where: { id: collab.id },
    });
  }

  async listCollaborators(userId: string, groupId: string) {
    await this.access.assertGroupViewable(groupId, userId);
    return this.prisma.knowledgeGroupCollaborator.findMany({
      where: { groupId, status: 'APPROVED' },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: collabUserSelect } },
    });
  }

  async approve(ownerId: string, groupId: string, collabId: string) {
    await this.access.assertGroupOwner(groupId, ownerId);
    const collab = await this.prisma.knowledgeGroupCollaborator.findUnique({
      where: { id: collabId },
    });
    if (!collab || collab.groupId !== groupId) {
      throw new NotFoundException(`Yêu cầu cộng tác ${collabId} không tồn tại`);
    }
    return this.prisma.knowledgeGroupCollaborator.update({
      where: { id: collabId },
      data: { status: 'APPROVED' },
    });
  }

  async reject(ownerId: string, groupId: string, collabId: string) {
    await this.access.assertGroupOwner(groupId, ownerId);
    const collab = await this.prisma.knowledgeGroupCollaborator.findUnique({
      where: { id: collabId },
    });
    if (!collab || collab.groupId !== groupId) {
      throw new NotFoundException(`Yêu cầu cộng tác ${collabId} không tồn tại`);
    }
    return this.prisma.knowledgeGroupCollaborator.update({
      where: { id: collabId },
      data: { status: 'REJECTED' },
    });
  }
}
