import { Injectable, NotFoundException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeGroupAccessService } from '../common/knowledge-group-access.service';
import { tiptapToPlainText } from '../common/tiptap-to-text';
import { ChatMessageDto } from './dto/ask-ai-assistant.dto';

const SYSTEM_PROMPT = `Bạn là trợ lý AI của 1 workspace kiến thức cá nhân. Bên dưới là
nội dung các bài viết đã xuất bản trong workspace mà người dùng đang hỏi.
Trả lời DỰA TRÊN nội dung được cung cấp, bằng tiếng Việt, ngắn gọn rõ ràng.
Nếu câu hỏi không liên quan hoặc không đủ thông tin trong nội dung bên dưới,
nói rõ là không tìm thấy thông tin thay vì bịa ra câu trả lời.`;

@Injectable()
export class AiAssistantService {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  constructor(
    private prisma: PrismaService,
    private groupAccess: KnowledgeGroupAccessService,
  ) {}

  // Nhoi nguyen noi dung cac bai da xuat ban trong TOAN BO workspace (moi
  // nhom) ma userId xem duoc lam context - khong RAG/vector DB (quy mo ca
  // nhan, context 1M cua Opus la du), loc dung quyen tung nhom qua
  // assertGroupViewable (bo qua nhom khong xem duoc thay vi throw).
  private async buildContext(
    workspaceId: string,
    userId: string,
  ): Promise<string[]> {
    const groups = await this.prisma.knowledgeGroup.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });
    if (groups.length === 0) return [];

    const viewableGroups: { id: string; name: string }[] = [];
    for (const group of groups) {
      try {
        await this.groupAccess.assertGroupViewable(group.id, userId);
        viewableGroups.push(group);
      } catch {
        // Nhom PRIVATE ma userId khong phai owner/collaborator APPROVED -
        // bo qua, khong dua vao context (dung nguyen tac 404-khong-403 cua
        // KnowledgeGroupAccessService, chi la o day khong can throw tiep).
      }
    }
    if (viewableGroups.length === 0) return [];

    const nameByGroupId = new Map(viewableGroups.map((g) => [g.id, g.name]));
    const docs = await this.prisma.document.findMany({
      where: {
        knowledgeGroupId: { in: viewableGroups.map((g) => g.id) },
        isPublished: true,
      },
      select: { title: true, content: true, knowledgeGroupId: true },
    });

    return docs.map((doc) => {
      const groupName = nameByGroupId.get(doc.knowledgeGroupId) ?? '';
      const text = tiptapToPlainText(doc.content);
      return `## [${groupName}] ${doc.title}\n\n${text}`;
    });
  }

  async ask(userId: string, workspaceId: string, messages: ChatMessageDto[]) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace ${workspaceId} not found`);
    }

    const docTexts = await this.buildContext(workspaceId, userId);
    if (docTexts.length === 0) {
      return {
        answer:
          'Workspace này chưa có bài viết nào bạn có quyền xem, nên mình chưa có nội dung để trả lời.',
      };
    }

    const contextText = docTexts.join('\n\n---\n\n');
    const response = await this.client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: `${SYSTEM_PROMPT}\n\n${contextText}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const answer = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return { answer };
  }
}
