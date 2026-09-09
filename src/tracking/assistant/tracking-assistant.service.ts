import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { TrackingWeeklySummary } from '../analytics/tracking-analytics.service';

// Cung khuon voi post-assistant.service.ts - KHONG nhan so lieu tu client
// (tranh AI "coach" dua tren so bia) - service goi luon
// TrackingAnalyticsService.weeklySummary() lay so that (xem
// tracking-assistant.controller.ts).
const SYSTEM_PROMPT = `Bạn là huấn luyện viên năng suất cho 1 người đang tự
quản lý kế hoạch cá nhân. Dưới đây là số liệu THẬT của họ trong 7 ngày qua
(tỷ lệ hoàn thành task, mức năng lượng trung bình, giờ ngủ trung bình, số
buổi làm việc nhóm). Đưa ra ĐÚNG 2-3 gợi ý cụ thể, ngắn gọn, có thể hành
động ngay, dựa HOÀN TOÀN trên số liệu được cung cấp - không bịa thêm số
liệu hay hành vi nào ngoài đây. Nếu số liệu quá ít (vd chưa có check-in
energy nào), nói rõ nên bắt đầu ghi nhận đều hơn trước khi có gợi ý sâu
hơn. Viết bằng tiếng Việt.`;

@Injectable()
export class TrackingAssistantService {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async coach(summary: TrackingWeeklySummary) {
    const response = await this.client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `Số liệu 7 ngày qua:\n${JSON.stringify(summary, null, 2)}` },
      ],
    });

    const suggestions = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return { suggestions };
  }
}
