import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Seed 1 Series mau (placeholder tieng Viet) de dung UI module Series - xoa
// sach series cu cung slug truoc khi tao lai (an toan chay nhieu lan), giong
// tinh than seed-tracking.ts. CHUA gan userId (ContentSeries khong thuoc ve
// 1 tac gia that trong he thong - authorName/authorAvatarUrl chi la text
// hien thi, xem comment schema.prisma).
const SERIES_SLUG = 'ai-agent-skills';

async function main() {
  await prisma.contentSeries.deleteMany({ where: { slug: SERIES_SLUG } });

  const series = await prisma.contentSeries.create({
    data: {
      slug: SERIES_SLUG,
      title: 'Bộ kỹ năng làm việc với AI Agent',
      description:
        'Chuỗi bài hướng dẫn **thực chiến** để lập trình viên làm việc hiệu quả với AI coding agent (Claude Code, Cursor, Copilot...) - từ thiết lập dự án, viết prompt, đến xây quy trình review an toàn. Xem thêm tại `github.com/career-tree/ai-agent-skills`.',
      authorName: 'Career Tree Team',
      authorAvatarUrl: null,
      emailCourseEnabled: true,
      emailCourseTitle: 'Nhận bài mới qua email',
      emailCourseDescription:
        'Đăng ký để nhận thông báo khi series có bài mới - không spam, huỷ bất kỳ lúc nào.',
      stats: [
        { label: 'GitHub stars', value: '1.2k', icon: 'Star' },
        { label: 'Lượt cài đặt', value: '8.4k', icon: 'Download' },
        { label: 'Số skill', value: '6', icon: 'BookOpen' },
      ],
      installTabs: [
        {
          label: 'Tất cả agent',
          command: 'npx career-tree-skills add ai-agent-skills',
          note: 'Cài đặt toàn bộ skill vào thư mục .agent/skills của dự án.',
        },
        {
          label: 'Claude Code',
          command: 'npx career-tree-skills add ai-agent-skills --target=claude-code',
          note: 'Sau khi cài, gõ /setup-ai-agent-skills trong Claude Code để kích hoạt.',
        },
      ],
      externalLinks: [
        { label: 'GitHub repo', url: 'https://github.com/career-tree/ai-agent-skills', icon: 'Github' },
        { label: 'Docs', url: 'https://career-tree.dev/docs/ai-agent-skills', icon: 'BookOpen' },
      ],
      shareChannels: ['x', 'bluesky', 'linkedin', 'copy'],
    },
  });

  const catStart = await prisma.contentSeriesCategory.create({
    data: { seriesId: series.id, slug: 'bat-dau', title: 'Bắt đầu', orderIndex: 0, colorHex: '#3b82f6' },
  });
  const catSetup = await prisma.contentSeriesCategory.create({
    data: { seriesId: series.id, slug: 'thiet-lap-du-an', title: 'Thiết lập dự án', orderIndex: 1, colorHex: '#22c55e' },
  });
  const catAdvanced = await prisma.contentSeriesCategory.create({
    data: { seriesId: series.id, slug: 'nang-cao', title: 'Nâng cao', orderIndex: 2, colorHex: '#f97316' },
  });

  const entries = [
    {
      categoryId: catStart.id,
      slug: 'vi-sao-can-ai-agent-skill',
      orderIndex: 0,
      title: 'Vì sao cần "AI agent skill"?',
      subtitle: 'Khác gì so với việc chỉ chat với AI như bình thường?',
      icon: '✨',
      contentMarkdown: `## Vấn đề

Khi làm việc với AI coding agent, phần lớn thời gian bị lãng phí vào việc **lặp lại ngữ cảnh** ở mỗi phiên làm việc mới: quy ước code, cách chạy test, quy trình review...

## Skill là gì?

Một "skill" là gói hướng dẫn có cấu trúc (mô tả + quy trình + ví dụ) mà agent đọc được để biết cách hành động đúng trong một tình huống cụ thể, tương tự \`CLAUDE.md\` nhưng tái sử dụng được giữa nhiều dự án.

### Lợi ích

- Không phải giải thích lại từ đầu mỗi lần.
- Quy trình nhất quán giữa các thành viên trong team.
- Dễ chia sẻ, versioning như một package thông thường.

> Skill tốt nhất là skill đủ ngắn để agent đọc nhanh, nhưng đủ cụ thể để không hiểu sai.`,
      faq: [
        {
          question: 'Skill có thay thế được CLAUDE.md không?',
          answer: 'Không - `CLAUDE.md` mô tả *dự án hiện tại*, còn skill là *quy trình tái sử dụng* giữa nhiều dự án khác nhau.',
        },
      ],
      readTimeMinutes: 3,
    },
    {
      categoryId: catStart.id,
      slug: 'cai-dat-skill-dau-tien',
      orderIndex: 1,
      title: 'Cài đặt skill đầu tiên',
      subtitle: 'Từ zero đến chạy được trong 2 phút',
      icon: '🚀',
      contentMarkdown: `## Bước 1 - Cài đặt

\`\`\`bash
npx career-tree-skills add ai-agent-skills
\`\`\`

Lệnh này tạo thư mục \`.agent/skills/ai-agent-skills\` chứa toàn bộ hướng dẫn.

## Bước 2 - Kích hoạt

Mở agent bạn đang dùng và gõ \`/setup-ai-agent-skills\`. Agent sẽ đọc và ghi nhớ skill cho phiên làm việc hiện tại.

## Bước 3 - Kiểm tra

Hỏi thử agent: "Quy trình review PR của skill này là gì?" - nếu trả lời đúng nội dung bạn vừa cài, vậy là thành công.`,
      faq: [],
      readTimeMinutes: 2,
    },
    {
      categoryId: catSetup.id,
      slug: 'cau-truc-thu-muc-du-an',
      orderIndex: 2,
      title: 'Cấu trúc thư mục dự án chuẩn',
      subtitle: null,
      icon: '🗂️',
      contentMarkdown: `## Cấu trúc đề xuất

\`\`\`
.agent/
  skills/
    ai-agent-skills/
      SKILL.md
      references/
      scripts/
\`\`\`

Mỗi skill nên tách biệt hoàn toàn - không phụ thuộc chéo lẫn nhau để dễ cài/gỡ độc lập.

## Đặt tên

- Thư mục: kebab-case, mô tả đúng chức năng (\`review-pull-request\`, không phải \`skill1\`).
- File chính luôn tên \`SKILL.md\` để agent tự động nhận diện.`,
      faq: [
        { question: 'Có bắt buộc dùng thư mục .agent không?', answer: 'Không bắt buộc, nhưng đây là quy ước phổ biến nhất giữa các agent hiện nay nên nên theo để dễ tương thích.' },
      ],
      readTimeMinutes: 4,
    },
    {
      categoryId: catSetup.id,
      slug: 'viet-prompt-cho-quy-trinh',
      orderIndex: 3,
      title: 'Viết prompt cho một quy trình nhiều bước',
      subtitle: 'Checklist thay vì đoạn văn dài',
      icon: '📝',
      contentMarkdown: `## Nguyên tắc

Agent xử lý **danh sách bước rõ ràng** tốt hơn nhiều so với một đoạn văn mô tả dài dòng.

### Ví dụ tốt

1. Đọc file cấu hình \`config.json\`.
2. Nếu thiếu field \`apiKey\`, dừng lại và báo lỗi.
3. Chạy \`npm run build\`.
4. Nếu build lỗi, in ra 10 dòng log cuối.

### Ví dụ nên tránh

"Hãy đọc cấu hình rồi build dự án lên, nếu có lỗi gì thì báo cho tôi biết nhé, cũng nhớ kiểm tra api key nữa."

## Mẹo

Dùng heading để phân bước lớn, dùng danh sách để phân bước nhỏ - agent scan cấu trúc này rất nhanh và ít bỏ sót bước hơn văn xuôi.`,
      faq: [],
      readTimeMinutes: 3,
    },
    {
      categoryId: catAdvanced.id,
      slug: 'quy-trinh-review-an-toan',
      orderIndex: 4,
      title: 'Xây quy trình review an toàn',
      subtitle: 'Để agent không tự ý push code lỗi',
      icon: '🛡️',
      contentMarkdown: `## Vì sao cần gate review?

Agent càng tự động hoá nhiều, rủi ro **thực thi nhầm lệnh phá huỷ** (xoá nhánh, force-push, drop bảng...) càng cao nếu không có bước chặn.

## Checklist gate tối thiểu

- Luôn chạy \`git status\` trước lệnh có thể mất dữ liệu.
- Không bao giờ tự động \`--force\` / \`--no-verify\` trừ khi được yêu cầu rõ ràng.
- Có bước dừng lại xin xác nhận trước khi push lên nhánh chung.

## Bảng phân loại rủi ro

| Hành động | Mức rủi ro | Cần xác nhận? |
| --- | --- | --- |
| Đọc file | Thấp | Không |
| Sửa file cục bộ | Trung bình | Không |
| \`git push --force\` | Cao | Có |
| Xoá bảng database | Rất cao | Có |`,
      faq: [
        {
          question: 'Skill này có tự chặn được lệnh nguy hiểm không?',
          answer: 'Skill chỉ là hướng dẫn văn bản cho agent tuân theo - việc chặn cứng ở tầng hệ thống (permission mode, sandbox) vẫn cần cấu hình riêng ở công cụ bạn dùng.',
        },
      ],
      readTimeMinutes: 5,
    },
    {
      categoryId: catAdvanced.id,
      slug: 'ket-hop-nhieu-skill',
      orderIndex: 5,
      title: 'Kết hợp nhiều skill trong một dự án',
      subtitle: null,
      icon: '🧩',
      installTabs: [
        {
          label: 'Cài trọn bộ',
          command: 'npx career-tree-skills add ai-agent-skills --with-deps',
          note: 'Cài kèm 2 skill phụ thuộc: review-pull-request, write-commit-message.',
        },
      ],
      contentMarkdown: `## Khi nào cần nhiều skill?

Một dự án thực tế thường cần vài skill hoạt động song song: viết code, review PR, viết commit message, viết test...

## Nguyên tắc kết hợp

- Mỗi skill chỉ nên "sở hữu" một trách nhiệm duy nhất.
- Tránh 2 skill cùng ra hướng dẫn mâu thuẫn nhau (ví dụ 1 skill nói dùng \`pnpm\`, skill khác nói dùng \`npm\`).
- Đặt skill "tổng" tham chiếu tới skill con thay vì lặp lại nội dung.

Đây cũng là bài cuối của series - cảm ơn bạn đã theo dõi hết 6 bài!`,
      faq: [],
      readTimeMinutes: 3,
    },
  ];

  for (const e of entries) {
    await prisma.contentSeriesEntry.create({
      data: {
        seriesId: series.id,
        categoryId: e.categoryId,
        slug: e.slug,
        orderIndex: e.orderIndex,
        title: e.title,
        subtitle: e.subtitle ?? null,
        icon: e.icon,
        contentMarkdown: e.contentMarkdown,
        faq: e.faq,
        installTabs: e.installTabs ?? undefined,
        readTimeMinutes: e.readTimeMinutes,
      },
    });
  }

  console.log(`Seeded ContentSeries "${series.title}" (${entries.length} entries).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
