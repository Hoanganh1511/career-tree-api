import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@Injectable()
export class IssueService {
  constructor(private prisma: PrismaService) {}

  findAllForNode(nodeId: string) {
    return this.prisma.issue.findMany({
      where: { nodeId },
      orderBy: [{ resolved: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(nodeId: string, dto: CreateIssueDto) {
    return this.prisma.issue.create({
      data: { nodeId, question: dto.question },
    });
  }

  update(issueId: string, dto: UpdateIssueDto) {
    return this.prisma.issue.update({
      where: { id: issueId },
      data: dto,
    });
  }

  remove(issueId: string) {
    return this.prisma.issue.delete({ where: { id: issueId } });
  }
}
