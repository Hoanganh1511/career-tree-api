import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OwnershipService } from 'src/common/ownership.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class IssueService {
  constructor(
    private prisma: PrismaService,
    private ownership: OwnershipService,
  ) {}

  async findAllForNode(userId: string, nodeId: string) {
    await this.ownership.assertNodeOwner(nodeId, userId);
    return this.prisma.issue.findMany({
      where: { nodeId },
      orderBy: [{ resolved: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, nodeId: string, dto: CreateIssueDto) {
    await this.ownership.assertNodeOwner(nodeId, userId);
    return this.prisma.issue.create({
      data: { nodeId, question: dto.question },
    });
  }

  async update(userId: string, issueId: string, dto: UpdateIssueDto) {
    await this.ownership.assertIssueOwner(issueId, userId);
    return this.prisma.issue.update({
      where: { id: issueId },
      data: dto,
    });
  }

  async remove(userId: string, issueId: string) {
    await this.ownership.assertIssueOwner(issueId, userId);
    return this.prisma.issue.delete({ where: { id: issueId } });
  }
}
