import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ChatMessageDto } from './dto/post-assistant.dto';

// Ban RUT GON cua ai-assistant.service.ts - KHONG can buildContext quet
// Document/KnowledgeGroup (workspace Q&A), vi bai dang soan (Composer.tsx)
// da du ngan de nhet thang vao prompt, khong can RAG/quyen xem nhom nao ca.
const MAX_CONTENT_CHARS = 6000;

const IMPROVE_SYSTEM_PROMPT = `Bạn là trợ lý viết bài cho 1 nền tảng kiến thức
cá nhân. Người dùng đang soạn 1 bài viết, dưới đây là nội dung HIỆN TẠI của
bài (có thể rỗng nếu mới bắt đầu) và 1 yêu cầu cụ thể. Trả lời NGẮN GỌN, CHỈ
đưa ra đúng đoạn văn bản kết quả (không giải thích, không markdown thừa,
không lặp lại yêu cầu) - kết quả sẽ được chèn thẳng vào bài viết. Viết bằng
tiếng Việt trừ khi nội dung hiện tại đang bằng ngôn ngữ khác.`;

const CHAT_SYSTEM_PROMPT = `Bạn là trợ lý AI giúp người dùng trò chuyện, lên ý
tưởng, và chỉnh sửa cho 1 bài viết họ đang soạn trên 1 nền tảng kiến thức cá
nhân. Dưới đây là nội dung HIỆN TẠI của bài (có thể rỗng nếu mới bắt đầu).
Trả lời bằng tiếng Việt, ngắn gọn, hữu ích - có thể góp ý cấu trúc, gợi ý
viết tiếp, hoặc trả lời câu hỏi liên quan tới bài đang viết.`;

@Injectable()
export class PostAssistantService {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async improve(content: string, instruction: string) {
    const draft = content.slice(0, MAX_CONTENT_CHARS);
    const response = await this.client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: `${IMPROVE_SYSTEM_PROMPT}\n\nNội dung hiện tại:\n${draft || '(rỗng)'}`,
      messages: [{ role: 'user', content: instruction }],
    });

    const suggestion = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return { suggestion };
  }

  async chat(content: string, messages: ChatMessageDto[]) {
    const draft = content.slice(0, MAX_CONTENT_CHARS);
    const response = await this.client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: `${CHAT_SYSTEM_PROMPT}\n\nNội dung hiện tại:\n${draft || '(rỗng)'}`,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const answer = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return { answer };
  }
}
