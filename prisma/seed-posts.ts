import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma, PostCategory } from '../generated/prisma/client';
import { toDbKind, type PostKindApi } from '../src/post/post-kind.util';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ---------- helpers ----------

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}
function daysAgo(n: number): Date {
  return hoursAgo(n * 24);
}

// Khop dung ACCENT_PALETTE + getBlockAccentColor trong enggo/src/lib/skill-tree/
// block-accent.ts (khong import xuyen repo duoc nen chep lai nguyen logic -
// 6 mau, chon theo orderIndex neu Category chua tu dat color rieng).
const ACCENT_PALETTE = [
  '#10b981',
  '#38bdf8',
  '#8b5cf6',
  '#f59e0b',
  '#f43f5e',
  '#22d3ee',
];
function blockAccentColor(orderIndex: number, color: string | null): string {
  if (color) return color;
  const i =
    ((orderIndex % ACCENT_PALETTE.length) + ACCENT_PALETTE.length) %
    ACCENT_PALETTE.length;
  return ACCENT_PALETTE[i];
}

// Mau on dinh theo TEN danh muc lon (khong phai ID that - xem ghi chu topic
// duoi day) - cung 1 danh muc luon ra cung 1 mau xuyen suot cac bai, tranh
// nham lan khi luot feed thay "Backend" luc thi xanh luc thi tim.
const TOPIC_ACCENT: Record<string, string> = {
  Backend: '#10b981',
  Frontend: '#38bdf8',
  DevOps: '#f59e0b',
  'Design System': '#8b5cf6',
  'Product Design': '#f43f5e',
  Algorithms: '#22d3ee',
  JavaScript: '#facc15',
  'System Design': '#6366f1',
  Career: '#0ea5e9',
  'Career Tree': '#22c55e',
  Community: '#ec4899',

  // Them cho 13 "Linh vuc" con lai chua co bai nao gan category That (xem
  // block POSTS_BY_CATEGORY duoi day) - moi ten 1 mau on dinh rieng, tach
  // biet voi cac topic tu do o tren.
  Mobile: '#06b6d4',
  'Game Dev': '#a855f7',
  Blockchain: '#eab308',
  IoT: '#14b8a6',
  'Dev Tools': '#64748b',
  'Data / AI': '#d946ef',
  Database: '#0891b2',
  Product: '#fb7185',
  'UI/UX': '#c084fc',
  Cloud: '#60a5fa',
  Security: '#ef4444',
  'QA / Test': '#84cc16',
  'Soft Skills': '#f472b6',

  // Them cho cac Topic con moi cua Knowledge World (knowledge-worlds.ts) -
  // Algorithms/Design System da co san o tren, tai dung nguyen.
  Architecture: '#94a3b8',
  Performance: '#fb923c',
  'Distributed Systems': '#2dd4bf',
  'Prompt Engineering': '#e879f9',
  LLM: '#818cf8',
  'AI Agents': '#34d399',
  MCP: '#fbbf24',
  RAG: '#f87171',
  'Computer Vision': '#93c5fd',
  UI: '#a78bfa',
  UX: '#fda4af',
  Motion: '#fdba74',
  Figma: '#c4b5fd',
  Resume: '#5eead4',
  Interview: '#fcd34d',
  Productivity: '#86efac',
  Remote: '#7dd3fc',
  Freelance: '#fca5a5',
  Startup: '#d8b4fe',
  Growth: '#6ee7b7',
  Marketing: '#f9a8d4',
};
function topicAccent(category: string): string {
  return TOPIC_ACCENT[category] ?? ACCENT_PALETTE[0];
}

// Breadcrumb "danh muc kien thuc" THUAN HIEN THI (xem Post["topic"] trong
// enggo/src/content/home-feed-mock.ts) - CHI la tag phan loai chu de, KHONG
// map toi workspace/category/node THAT nao (khac han REAL_CATEGORIES/
// REAL_NODES ben duoi, chi dung rieng cho 3 bai skill-report cua chinh chu) -
// vi 5 persona seed khong co workspace that nao trong DB, gan ID gia cho ho
// se khong trung thuc. path[0] = danh muc lon, path[1] = chu de cu the.
function topic(...path: string[]): { path: string[]; accent: string } {
  return { path, accent: topicAccent(path[0]) };
}

// ---------- personas ----------
// Dung LAI dung 5 nguoi (+ chinh chu Tuan Anh) da co san trong
// enggo/src/content/user-profile.ts (OTHERS) - cung ten/username/avatar - de
// bam vao ten tac gia tren feed luon dan toi dung trang /u/:username thay vi
// 1 profile khong ton tai. googleId la placeholder ro rang khong phai Google
// that (nguoi nay khong dang nhap that), upsert theo googleId nen script
// chay lai nhieu lan van an toan (khong tao trung).
const PERSONAS = [
  {
    googleId: 'seed-lucas-dev',
    email: 'lucas.tran.seed@example.com',
    name: 'Lucas Trần',
    username: 'lucas.dev',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
    verified: true,
  },
  {
    googleId: 'seed-minh-engineer',
    email: 'minh.tran.seed@example.com',
    name: 'Minh Trần',
    username: 'minh.engineer',
    avatarUrl: 'https://i.pravatar.cc/150?img=13',
    verified: true,
  },
  {
    googleId: 'seed-jane-design',
    email: 'jane.doe.seed@example.com',
    name: 'Jane Doe',
    username: 'jane.design',
    avatarUrl: 'https://i.pravatar.cc/150?img=47',
    verified: true,
  },
  {
    googleId: 'seed-peter-devops',
    email: 'peter.nguyen.seed@example.com',
    name: 'Peter Nguyễn',
    username: 'peter.devops',
    avatarUrl: 'https://i.pravatar.cc/150?img=33',
    verified: true,
  },
  {
    googleId: 'seed-linh-dev',
    email: 'linh.dev.seed@example.com',
    name: 'Linh Dev',
    username: 'linh.dev',
    avatarUrl: 'https://i.pravatar.cc/150?img=44',
    verified: false,
  },
] as const;

type PersonaKey = (typeof PERSONAS)[number]['username'] | 'tuananh.fe';

// Workspace/category/node THAT cua chinh chu (id da xac minh truoc luc viet
// script nay, xem "My Career Tree" - 00000000-0000-0000-0000-000000000001,
// owner anhht.fe@gmail.com) - dung cho 3 bai skill-report duoi day. CHI chinh
// chu duoc dung lam tac gia skill-report vi day la workspace that cua ho.
const REAL_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const REAL_CATEGORIES = {
  backend: {
    id: '2431b880-0236-47c1-98f2-4695489a637e',
    name: 'Backend Development',
    orderIndex: 2,
    color: null,
  },
  storage: {
    id: '8db17580-bc8f-455a-a9d3-78ff735da690',
    name: 'Database & Storage',
    orderIndex: 3,
    color: null,
  },
  system: {
    id: '4faff8fa-1f23-41a4-be7f-d083a06d51f9',
    name: 'System Design',
    orderIndex: 5,
    color: null,
  },
};
const REAL_NODES = {
  authentication: {
    id: '21d5dacb-b7e1-4add-a280-b24ed358b8c1',
    title: 'Authentication',
    category: REAL_CATEGORIES.backend,
  },
  redis: {
    id: '28e621f3-ca51-4302-a217-32b81a8afdcf',
    title: 'Redis',
    category: REAL_CATEGORIES.storage,
  },
  caching: {
    id: '170080cd-27bb-4e17-9843-1457977c170a',
    title: 'Caching',
    category: REAL_CATEGORIES.system,
  },
};

// ---------- post data ----------
// 35 bai, trai 24 kind, giong dung mach "chia se cong nghe" that (Twitter/X
// dev community, r/programming, Dev.to): giong dieu ca nhan, con so cu the,
// doi khi tu trao, khong quang cao san pham. Vai bai (Lucas ve N+1/cache,
// Peter ve Docker image size) noi tiep dung mach cau chuyen da co san trong
// seed-swe.ts (cung nhan vat, cung tinh tiet) de ca 2 seed dong nhat 1 the
// gioi thay vi 2 nguon tach roi nhau.
type PostSeed = {
  author: PersonaKey;
  kind: PostKindApi;
  data: Record<string, unknown>;
  at: Date;
  // Chi set o block POSTS_BY_CATEGORY duoi day - 35 bai "tu do" ben tren
  // khong gan category That (chi co topic hien thi), nen filter
  // GET /posts?category=... tra ve rong cho toi khi co block nay.
  category?: PostCategory;
};

const POSTS: PostSeed[] = [
  // --- text ---
  {
    author: 'lucas.dev',
    kind: 'text',
    data: {
      topic: topic('Backend', 'Node.js'),
      content:
        'Vừa debug xong 1 con bug quái dị: connection pool bị leak vì quên `await` 1 promise trong middleware logging. 3 tiếng cho 1 dòng thiếu await 🙃',
    },
    at: hoursAgo(2),
  },
  {
    author: 'linh.dev',
    kind: 'text',
    data: {
      topic: topic('JavaScript', 'Fundamentals'),
      content:
        'Hôm nay lần đầu hiểu được closure thật sự là gì, không phải học vẹt để trả lời phỏng vấn nữa. Cảm giác như vừa mở khoá 1 cấp độ mới.',
    },
    at: hoursAgo(6),
  },
  {
    author: 'peter.devops',
    kind: 'text',
    data: {
      topic: topic('DevOps', 'Observability'),
      content:
        'PSA cho ai đang set alerting: đừng để threshold CPU cảnh báo ở 90% cho pod có autoscale — nó spam bạn lúc 2h sáng vì traffic spike bình thường. Set theo p95 latency thực tế đi, đỡ mất ngủ hơn nhiều.',
    },
    at: daysAgo(1),
  },
  // --- image ---
  {
    author: 'minh.engineer',
    kind: 'image',
    data: {
      topic: topic('Product Design', 'UX'),
      content:
        'Before/after redesign trang dashboard - giảm hẳn số click để đến đúng insight quan trọng.',
      image: {
        url: 'https://picsum.photos/seed/dashboard-redesign/900/560',
        alt: 'Dashboard sau khi redesign',
      },
    },
    at: daysAgo(2),
  },
  {
    author: 'jane.design',
    kind: 'image',
    data: {
      topic: topic('Product Design', 'UX Research'),
      content:
        'Wireframe cho luồng onboarding mới, đang test với 5 user thật trong tuần này.',
      image: {
        url: 'https://picsum.photos/seed/onboarding-wireframe/900/560',
        alt: 'Wireframe onboarding',
      },
    },
    at: daysAgo(3),
  },
  // --- gallery ---
  {
    author: 'jane.design',
    kind: 'gallery',
    data: {
      topic: topic('Design System', 'Theming'),
      content:
        '3 phương án màu cho dark mode - cuối cùng chọn bản giữa vì contrast đạt WCAG AA mà không bị chói.',
      images: [
        {
          url: 'https://picsum.photos/seed/dark-mode-1/500/500',
          alt: 'Phương án 1',
        },
        {
          url: 'https://picsum.photos/seed/dark-mode-2/500/500',
          alt: 'Phương án 2',
        },
        {
          url: 'https://picsum.photos/seed/dark-mode-3/500/500',
          alt: 'Phương án 3',
        },
      ],
    },
    at: daysAgo(4),
  },
  // --- video ---
  {
    author: 'peter.devops',
    kind: 'video',
    data: {
      topic: topic('DevOps', 'CI/CD'),
      content:
        'Demo nhanh pipeline CI/CD mới - từ commit đến production chỉ còn 4 phút thay vì 12 phút như trước.',
      video: {
        thumbnailUrl: 'https://picsum.photos/seed/cicd-pipeline/900/506',
        duration: '1:52',
      },
    },
    at: daysAgo(5),
  },
  // --- file ---
  {
    author: 'lucas.dev',
    kind: 'file',
    data: {
      topic: topic('Backend', 'Code Review'),
      content:
        'Checklist mình hay dùng khi review PR, chủ yếu để bắt N+1 query trước khi merge.',
      file: { name: 'n-plus-1-checklist.pdf', ext: 'PDF', size: '412 KB' },
    },
    at: daysAgo(6),
  },
  // --- link ---
  {
    author: 'minh.engineer',
    kind: 'link',
    data: {
      topic: topic('Frontend', 'React'),
      content:
        'Bài này giải thích rõ nhất mình từng đọc về ranh giới Server/Client Component.',
      link: {
        domain: 'react.dev',
        title: 'Server Components',
        description:
          'Server Components cho phép viết UI render sẵn trên server, tách biệt với Client Components.',
      },
    },
    at: daysAgo(7),
  },
  // --- resource ---
  {
    author: 'tuananh.fe',
    kind: 'resource',
    data: {
      topic: topic('Backend', 'Distributed Systems'),
      content:
        'Đang đọc lại chương về replication - hiểu sâu hơn nhiều so với lần đầu đọc 2 năm trước.',
      resource: {
        title: 'Designing Data-Intensive Applications',
        kindLabel: 'Sách · 616 trang',
        rating: 4.9,
      },
    },
    at: daysAgo(8),
  },
  // --- note ---
  {
    author: 'linh.dev',
    kind: 'note',
    data: {
      topic: topic('Frontend', 'React'),
      title:
        'useEffect dependency array không phải chỗ để tắt warning cho xong',
      content:
        'Trước mình hay thêm bừa vào deps array hoặc disable eslint rule cho nhanh. Giờ hiểu ra: warning đó thường đang chỉ đúng 1 bug tiềm ẩn (stale closure), không phải noise.',
      tag: 'TIL',
    },
    at: daysAgo(9),
  },
  {
    author: 'lucas.dev',
    kind: 'note',
    data: {
      topic: topic('Backend', 'Database'),
      title: 'Postgres: SELECT FOR UPDATE SKIP LOCKED cho job queue',
      content:
        'Thay vì tự implement lock bằng Redis, dùng thẳng SKIP LOCKED của Postgres cho bảng job - nhiều worker poll cùng lúc mà không đụng nhau, không cần thêm hạ tầng.',
      tag: 'Backend',
    },
    at: daysAgo(10),
  },
  // --- project-update ---
  {
    author: 'peter.devops',
    kind: 'project-update',
    data: {
      topic: topic('DevOps', 'Infrastructure'),
      project: 'career-tree infra',
      version: 'v0.6',
      changes: [
        'Chuyển CI sang GitHub Actions matrix build',
        'Thêm readiness probe riêng, tách khỏi liveness',
        'Giảm image Docker từ 1.1GB xuống 180MB bằng multi-stage build',
      ],
    },
    at: daysAgo(11),
  },
  {
    author: 'minh.engineer',
    kind: 'project-update',
    data: {
      topic: topic('Design System', 'Tokens'),
      project: 'Design system',
      version: 'v2.3',
      changes: [
        'Thêm token cho motion duration',
        'Chuẩn hoá lại spacing scale từ 4px base',
      ],
    },
    at: daysAgo(12),
  },
  // --- achievement ---
  {
    author: 'linh.dev',
    kind: 'achievement',
    data: {
      topic: topic('Algorithms', 'LeetCode'),
      title: 'Giải xong bài Hard đầu tiên trên LeetCode',
      description:
        'Course Schedule bằng topological sort - lần đầu tự code được, không xem lời giải.',
    },
    at: daysAgo(13),
  },
  {
    author: 'jane.design',
    kind: 'achievement',
    data: {
      topic: topic('Design System', 'Adoption'),
      title: 'Design system được 3 team khác trong công ty áp dụng',
      description: 'Sau 8 tháng xây từ 0, giờ không chỉ team mình dùng nữa.',
    },
    at: daysAgo(14),
  },
  // --- milestone ---
  {
    author: 'tuananh.fe',
    kind: 'milestone',
    data: {
      topic: topic('Career Tree', 'Learning Streak'),
      content:
        'Mốc nhỏ nhưng vui - vẫn giữ được thói quen ghi chú mỗi ngày dù bận đến đâu.',
      title: '100 ngày học liên tục trên Career Tree',
      items: [
        { label: 'Ngày liên tiếp', value: '100' },
        { label: 'Node đã học', value: '64' },
        { label: 'Ghi chú', value: '212' },
      ],
    },
    at: daysAgo(15),
  },
  // --- question ---
  {
    author: 'minh.engineer',
    kind: 'question',
    data: {
      topic: topic('Frontend', 'Next.js'),
      content:
        'Mọi người thường deploy Next.js App Router lên đâu? Vercel tiện nhưng đắt khi traffic lớn, tự host thì mất Image Optimization/ISR built-in. Có ai self-host nghiêm túc chưa, chia sẻ kinh nghiệm với?',
    },
    at: daysAgo(16),
  },
  // --- poll ---
  {
    author: 'peter.devops',
    kind: 'poll',
    data: {
      topic: topic('DevOps', 'Infrastructure as Code'),
      question: 'Bạn thích viết IaC bằng gì nhất?',
      options: [
        { label: 'Terraform', votes: 142 },
        { label: 'Pulumi', votes: 38 },
        { label: 'AWS CDK', votes: 51 },
        { label: 'Ansible', votes: 19 },
      ],
    },
    at: daysAgo(17),
  },
  // --- career-update ---
  {
    author: 'peter.devops',
    kind: 'career-update',
    data: {
      topic: topic('Career', 'DevOps'),
      company: 'Fintech Startup',
      role: 'Lead DevOps Engineer',
    },
    at: daysAgo(18),
  },
  // --- skill-update ---
  {
    author: 'linh.dev',
    kind: 'skill-update',
    data: {
      topic: topic('Frontend', 'React'),
      skill: 'React Hooks',
      level: 3,
      maxLevel: 5,
    },
    at: daysAgo(19),
  },
  {
    author: 'minh.engineer',
    kind: 'skill-update',
    data: {
      topic: topic('Frontend', 'Performance'),
      skill: 'Web Performance',
      level: 4,
      maxLevel: 5,
    },
    at: daysAgo(20),
  },
  // --- node-created ---
  {
    author: 'tuananh.fe',
    kind: 'node-created',
    data: {
      topic: topic('System Design', 'Architecture'),
      nodeName: 'Event-Driven Architecture',
      blockName: 'System Design',
    },
    at: daysAgo(21),
  },
  // --- knowledge-block ---
  {
    author: 'tuananh.fe',
    kind: 'knowledge-block',
    data: {
      topic: topic('Backend', 'Progress'),
      block: 'Backend Development',
      progress: 72,
    },
    at: daysAgo(22),
  },
  {
    author: 'lucas.dev',
    kind: 'knowledge-block',
    data: {
      topic: topic('Backend', 'Distributed Systems'),
      block: 'Distributed Systems',
      progress: 58,
    },
    at: daysAgo(23),
  },
  // --- timeline-event ---
  {
    author: 'jane.design',
    kind: 'timeline-event',
    data: {
      topic: topic('Career Tree', 'Milestones'),
      event: 'Đã đồng hành cùng Career Tree được 2 năm 🎉',
    },
    at: daysAgo(24),
  },
  // --- code-snippet ---
  {
    author: 'lucas.dev',
    kind: 'code-snippet',
    data: {
      topic: topic('Frontend', 'React Hooks'),
      language: 'TypeScript',
      title: 'Debounce hook dùng useRef thay vì useState',
      code: `function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  return (...args: Parameters<T>) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  };
}`,
    },
    at: daysAgo(25),
  },
  {
    author: 'minh.engineer',
    kind: 'code-snippet',
    data: {
      topic: topic('Frontend', 'CSS'),
      language: 'CSS',
      title: 'Container query thay cho media query',
      code: `.card-list {
  container-type: inline-size;
}

@container (min-width: 480px) {
  .card { grid-template-columns: 1fr 1fr; }
}`,
    },
    at: daysAgo(26),
  },
  // --- idea ---
  {
    author: 'jane.design',
    kind: 'idea',
    data: {
      topic: topic('Design System', 'Motion'),
      content:
        'Nếu design system có 1 token riêng cho "motion duration theo mức độ quan trọng" (không chỉ theo kích thước component) thì animation sẽ nhất quán hơn hẳn giữa các team.',
    },
    at: daysAgo(27),
  },
  // --- tutorial ---
  {
    author: 'peter.devops',
    kind: 'tutorial',
    data: {
      topic: topic('DevOps', 'CI/CD'),
      title: 'Setup cache cho pnpm trong GitHub Actions monorepo',
      description:
        'Giảm thời gian install từ ~90s xuống ~8s cho hầu hết build, chỉ cần đúng key cache.',
      steps: 6,
    },
    at: daysAgo(28),
  },
  // --- experiment ---
  {
    author: 'minh.engineer',
    kind: 'experiment',
    data: {
      topic: topic('Frontend', 'React'),
      title:
        'So sánh Server Component vs Client Component cho danh sách 500 item',
      hypothesis: 'Server Component sẽ giảm đáng kể JS gửi về client.',
      result:
        'Bundle giảm 61%, nhưng TTFB tăng nhẹ ~40ms do render trên server - đánh đổi hợp lý cho trang này.',
    },
    at: daysAgo(29),
  },
  // --- event ---
  {
    author: 'jane.design',
    kind: 'event',
    data: {
      topic: topic('Community', 'Events'),
      title: 'Design System Meetup HCMC #4',
      when: 'Thứ 7, tuần sau · 14:00',
      location: 'Dreamplex Q1, TP.HCM',
    },
    at: daysAgo(30),
  },
  // --- skill-report (workspace/node THAT cua chinh chu) ---
  {
    author: 'tuananh.fe',
    kind: 'skill-report',
    data: {
      content:
        'Hôm nay ôn lại luồng refresh token và fix xong lỗi race condition khi 2 request cùng refresh 1 lúc - dùng mutex lock phía backend.',
      workspaceId: REAL_WORKSPACE_ID,
      workspaceName: 'My Career Tree',
      categoryId: REAL_NODES.authentication.category.id,
      categoryName: REAL_NODES.authentication.category.name,
      categoryAccent: blockAccentColor(
        REAL_NODES.authentication.category.orderIndex,
        REAL_NODES.authentication.category.color,
      ),
      nodeId: REAL_NODES.authentication.id,
      nodeTitle: REAL_NODES.authentication.title,
    },
    at: hoursAgo(1),
  },
  {
    author: 'tuananh.fe',
    kind: 'skill-report',
    data: {
      content:
        'Thử cache-aside với Redis cho API list workspace tree, giảm p95 latency đáng kể cho request lặp lại. Còn thiếu invalidation khi node bị move sang parent khác.',
      workspaceId: REAL_WORKSPACE_ID,
      workspaceName: 'My Career Tree',
      categoryId: REAL_NODES.redis.category.id,
      categoryName: REAL_NODES.redis.category.name,
      categoryAccent: blockAccentColor(
        REAL_NODES.redis.category.orderIndex,
        REAL_NODES.redis.category.color,
      ),
      nodeId: REAL_NODES.redis.id,
      nodeTitle: REAL_NODES.redis.title,
    },
    at: hoursAgo(5),
  },
  {
    author: 'tuananh.fe',
    kind: 'skill-report',
    data: {
      content:
        'Đọc lại phần cache invalidation cho cấu trúc cây - phức tạp hơn dự kiến vì node có thể bị move sang parent khác bất kỳ lúc nào. Ghi chú lại 2 hướng đang cân nhắc.',
      workspaceId: REAL_WORKSPACE_ID,
      workspaceName: 'My Career Tree',
      categoryId: REAL_NODES.caching.category.id,
      categoryName: REAL_NODES.caching.category.name,
      categoryAccent: blockAccentColor(
        REAL_NODES.caching.category.orderIndex,
        REAL_NODES.caching.category.color,
      ),
      nodeId: REAL_NODES.caching.id,
      nodeTitle: REAL_NODES.caching.title,
    },
    at: daysAgo(2.5),
  },
];

// ---------- posts co gan category That ----------
// 2 bai/chuyen vuc cho du 18 gia tri PostCategory (khop NGHE_NGHIEP trong
// enggo/src/lib/discover/category-taxonomy.ts) - khac POSTS o tren (chi co
// topic hien thi, KHONG set category), nen truoc block nay moi trang
// /home/category/[slug] deu rong (GET /posts?category=... loc theo cot that).
const POSTS_BY_CATEGORY: PostSeed[] = [
  // --- Frontend ---
  {
    author: 'linh.dev',
    kind: 'text',
    category: PostCategory.FRONTEND,
    data: {
      topic: topic('Frontend', 'React'),
      content:
        'Vừa thử useOptimistic của React 19 cho nút Like - UI phản hồi tức thì mà code lại gọn hơn hẳn so với tự quản lý state lạc quan thủ công như trước.',
    },
    at: daysAgo(31),
  },
  {
    author: 'minh.engineer',
    kind: 'note',
    category: PostCategory.FRONTEND,
    data: {
      topic: topic('Frontend', 'Performance'),
      title: 'content-visibility: auto cứu cả trang danh sách dài',
      content:
        'Trang có 2000 item list, dùng content-visibility: auto cho từng row là FCP giảm gần một nửa, không cần virtualize gì thêm.',
      tag: 'Performance',
    },
    at: daysAgo(32),
  },
  // --- Backend ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.BACKEND,
    data: {
      topic: topic('Backend', 'Queue'),
      content:
        'Đổi hết các job cron sang BullMQ với concurrency giới hạn theo queue - hết hẳn tình trạng job nặng chiếm dụng worker của job nhẹ.',
    },
    at: daysAgo(33),
  },
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.BACKEND,
    data: {
      topic: topic('Backend', 'API Design'),
      content:
        'Idempotency key cho API tạo đơn hàng cứu mình 1 bàn thua trông thấy hôm qua - client retry 3 lần do mạng chập chờn mà chỉ tạo đúng 1 đơn.',
    },
    at: daysAgo(34),
  },
  // --- Mobile ---
  {
    author: 'linh.dev',
    kind: 'text',
    category: PostCategory.MOBILE,
    data: {
      topic: topic('Mobile', 'React Native'),
      content:
        'Bật New Architecture (Fabric + TurboModules) cho app React Native, list cuộn mượt hẳn trên máy Android tầm trung, trước hay bị giật khi có ảnh.',
    },
    at: daysAgo(35),
  },
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.MOBILE,
    data: {
      topic: topic('Mobile', 'React Native'),
      content:
        'Chuyển từ FlatList sang FlashList cho màn hình chat - RAM giảm rõ khi list dài hàng nghìn tin nhắn.',
    },
    at: daysAgo(36),
  },
  // --- Game Dev ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.GAME_DEV,
    data: {
      topic: topic('Game Dev', 'Godot'),
      content:
        'Nghịch Godot cuối tuần, object pooling cho particle effect giúp game chạy ổn 60fps trên máy cấu hình thấp thay vì spawn/destroy liên tục.',
    },
    at: daysAgo(37),
  },
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.GAME_DEV,
    data: {
      topic: topic('Game Dev', 'Game Loop'),
      content:
        'Thử viết lại vòng lặp game bằng fixed timestep thay vì delta time thô - hết hẳn hiện tượng vật lý chạy khác nhau giữa các máy.',
    },
    at: daysAgo(38),
  },
  // --- Blockchain ---
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.BLOCKCHAIN,
    data: {
      topic: topic('Blockchain', 'Smart Contract'),
      content:
        'Deploy smart contract lên testnet, gas fee ước tính sai gần 3 lần vì quên optimize storage layout - packing lại struct là tiết kiệm đáng kể.',
    },
    at: daysAgo(39),
  },
  {
    author: 'lucas.dev',
    kind: 'question',
    category: PostCategory.BLOCKCHAIN,
    data: {
      topic: topic('Blockchain', 'Wallet'),
      content:
        'Có ai dùng thử account abstraction (ERC-4337) cho ví thật chưa? Đang cân nhắc có nên bỏ hẳn seed phrase truyền thống cho user mới không.',
    },
    at: daysAgo(40),
  },
  // --- IoT ---
  {
    author: 'peter.devops',
    kind: 'text',
    category: PostCategory.IOT,
    data: {
      topic: topic('IoT', 'MQTT'),
      content:
        'Setup MQTT broker cho cụm cảm biến nhiệt độ nhà kính, dùng QoS 1 là đủ, QoS 2 tốn overhead không cần thiết cho use case này.',
    },
    at: daysAgo(41),
  },
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.IOT,
    data: {
      topic: topic('IoT', 'Firmware'),
      content:
        'Firmware ESP32 bị reset ngẫu nhiên hoá ra do watchdog timer, quên feed trong lúc xử lý dữ liệu nặng - thêm 1 dòng mà debug mất cả buổi.',
    },
    at: daysAgo(42),
  },
  // --- Dev Tools ---
  {
    author: 'lucas.dev',
    kind: 'note',
    category: PostCategory.DEV_TOOLS,
    data: {
      topic: topic('Dev Tools', 'Git'),
      title: 'Alias git hay dùng để log gọn hơn',
      content:
        'git log --oneline --graph --decorate giờ mình alias thành git lg, nhìn nhánh rõ hơn hẳn thay vì log mặc định.',
      tag: 'Git',
    },
    at: daysAgo(43),
  },
  {
    author: 'linh.dev',
    kind: 'text',
    category: PostCategory.DEV_TOOLS,
    data: {
      topic: topic('Dev Tools', 'ESLint'),
      content:
        'Chuyển từ ESLint config rời sang flat config, lúc đầu hơi rối nhưng maintain dễ hơn nhiều khi có nhiều package trong monorepo.',
    },
    at: daysAgo(44),
  },
  // --- Data / AI ---
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.DATA_AI,
    data: {
      topic: topic('Data / AI', 'Fine-tuning'),
      content:
        'Thử fine-tune 1 model nhỏ để phân loại feedback khách hàng thay vì gọi API LLM lớn cho mọi request - chi phí giảm hẳn mà độ chính xác vẫn chấp nhận được.',
    },
    at: daysAgo(45),
  },
  {
    author: 'lucas.dev',
    kind: 'link',
    category: PostCategory.DATA_AI,
    data: {
      topic: topic('Data / AI', 'RAG'),
      content:
        'Bài này giải thích RAG rõ nhất mình từng đọc, đặc biệt phần chunking sao cho không cắt đứt ngữ cảnh.',
      link: {
        domain: 'pinecone.io',
        title: 'Retrieval Augmented Generation',
        description:
          'Giải thích cách kết hợp vector search với LLM để trả lời chính xác hơn dựa trên dữ liệu riêng.',
      },
    },
    at: daysAgo(46),
  },
  // --- Database ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.DATABASE,
    data: {
      topic: topic('Database', 'Indexing'),
      content:
        'Thêm index composite cho đúng thứ tự cột trong WHERE + ORDER BY, query từ 2s xuống còn 40ms - bài học nhớ đời về column order trong index.',
    },
    at: daysAgo(47),
  },
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.DATABASE,
    data: {
      topic: topic('Database', 'Partitioning'),
      content:
        'Thử partition bảng log theo tháng, query gần đây nhanh hẳn vì Postgres chỉ quét đúng partition cần, không phải scan hết bảng khổng lồ.',
    },
    at: daysAgo(48),
  },
  // --- Product ---
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.PRODUCT,
    data: {
      topic: topic('Product', 'Onboarding'),
      content:
        'Chạy thử A/B 2 luồng onboarding, bản rút gọn còn 3 bước conversion cao hơn 18% so với bản 5 bước cũ - đôi khi ít hỏi hơn lại tốt hơn.',
    },
    at: daysAgo(49),
  },
  {
    author: 'minh.engineer',
    kind: 'idea',
    category: PostCategory.PRODUCT,
    data: {
      topic: topic('Product', 'Forms'),
      content:
        'Nếu thêm 1 bước preview trước khi submit form dài, tỷ lệ bỏ dở chắc sẽ giảm - user hay lo submit nhầm mà không có cách xem lại.',
    },
    at: daysAgo(50),
  },
  // --- UI/UX ---
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.UI_UX,
    data: {
      topic: topic('UI/UX', 'Accessibility'),
      content:
        'Đổi contrast text phụ từ gray-400 sang gray-500 sau khi audit lại bằng WCAG checker - nhìn không khác nhiều nhưng đỡ hẳn khiếu nại từ user lớn tuổi.',
    },
    at: daysAgo(51),
  },
  {
    author: 'linh.dev',
    kind: 'text',
    category: PostCategory.UI_UX,
    data: {
      topic: topic('UI/UX', 'Accessibility'),
      content:
        'Thêm focus-visible rõ ràng cho toàn bộ nút bấm, test bằng bàn phím thuần mới thấy trước đây điều hướng không chuột gần như không dùng được.',
    },
    at: daysAgo(52),
  },
  // --- DevOps ---
  {
    author: 'peter.devops',
    kind: 'text',
    category: PostCategory.DEVOPS,
    data: {
      topic: topic('DevOps', 'Health Check'),
      content:
        'Chuyển health check từ TCP sang HTTP endpoint thật, phát hiện ra 2 service bị treo ngầm mà load balancer vẫn tưởng còn sống.',
    },
    at: daysAgo(53),
  },
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.DEVOPS,
    data: {
      topic: topic('DevOps', 'Kubernetes'),
      content:
        'Set resource limit đúng cho pod thay vì để mặc định, tránh hẳn tình trạng 1 service ăn hết CPU node làm ảnh hưởng service khác.',
    },
    at: daysAgo(54),
  },
  // --- Cloud ---
  {
    author: 'peter.devops',
    kind: 'text',
    category: PostCategory.CLOUD,
    data: {
      topic: topic('Cloud', 'Cost Optimization'),
      content:
        'Chuyển log từ EBS sang S3 lifecycle tự archive sau 30 ngày, giảm chi phí storage gần 60% mà vẫn truy vấn lại được khi cần.',
    },
    at: daysAgo(55),
  },
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.CLOUD,
    data: {
      topic: topic('Cloud', 'Auto Scaling'),
      content:
        'Bật auto-scaling theo request queue length thay vì CPU, phản ứng nhanh hơn hẳn với traffic spike đột ngột.',
    },
    at: daysAgo(56),
  },
  // --- System Design ---
  {
    author: 'tuananh.fe',
    kind: 'text',
    category: PostCategory.SYSTEM_DESIGN,
    data: {
      topic: topic('System Design', 'Architecture'),
      content:
        'Vẽ lại sơ đồ luồng đồng bộ dữ liệu giữa các service, phát hiện ra 1 vòng lặp phụ thuộc tưởng không có - may mà vẽ ra giấy mới thấy.',
    },
    at: daysAgo(57),
  },
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.SYSTEM_DESIGN,
    data: {
      topic: topic('System Design', 'CAP Theorem'),
      content:
        'Đọc lại phần CAP theorem, giờ hiểu rõ hơn tại sao hệ thống mình chọn AP thay vì CP cho tính năng feed - chấp nhận eventual consistency đổi lấy availability.',
    },
    at: daysAgo(58),
  },
  // --- Security ---
  {
    author: 'peter.devops',
    kind: 'text',
    category: PostCategory.SECURITY,
    data: {
      topic: topic('Security', 'Rate Limiting'),
      content:
        'Bật rate limit theo IP cho endpoint login, chặn được 1 đợt brute force nhỏ ngay tối qua mà không ảnh hưởng user thật.',
    },
    at: daysAgo(59),
  },
  {
    author: 'lucas.dev',
    kind: 'note',
    category: PostCategory.SECURITY,
    data: {
      topic: topic('Security', 'Auth'),
      title: 'Luôn hash refresh token trước khi lưu DB',
      content:
        'Trước lưu refresh token dạng plain text trong DB, giờ hash bằng SHA-256 trước khi lưu - lỡ DB bị leak cũng không ai dùng lại được token.',
      tag: 'Security',
    },
    at: daysAgo(60),
  },
  // --- QA / Test ---
  {
    author: 'linh.dev',
    kind: 'text',
    category: PostCategory.QA_TEST,
    data: {
      topic: topic('QA / Test', 'Edge Case'),
      content:
        'Viết thêm test cho edge case ngày 29/2, phát hiện ra hàm tính tuổi bị sai lệch 1 ngày cho người sinh năm nhuận - nhỏ nhưng để lâu chắc thành bug âm thầm.',
    },
    at: daysAgo(61),
  },
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.QA_TEST,
    data: {
      topic: topic('QA / Test', 'CI'),
      content:
        'Chuyển 1 phần E2E chạy chậm sang test tích hợp mức component, thời gian CI giảm từ 12 phút xuống 5 phút mà vẫn bắt được lỗi tương tự.',
    },
    at: daysAgo(62),
  },
  // --- Career ---
  {
    author: 'tuananh.fe',
    kind: 'text',
    category: PostCategory.CAREER,
    data: {
      topic: topic('Career', 'Growth'),
      content:
        'Sau 2 năm chỉ làm feature, giờ mới lần đầu được giao thiết kế kiến trúc từ đầu cho 1 module - áp lực nhưng học được nhiều hơn hẳn.',
    },
    at: daysAgo(63),
  },
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.CAREER,
    data: {
      topic: topic('Career', 'Leadership'),
      content:
        'Chuyển từ IC sang lead 1 nhóm nhỏ 3 người, khó nhất không phải kỹ thuật mà là học cách không tự làm hết mọi việc.',
    },
    at: daysAgo(64),
  },
  // --- Soft Skills ---
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.SOFT_SKILLS,
    data: {
      topic: topic('Soft Skills', 'Communication'),
      content:
        "Học được cách nói 'để mình suy nghĩ thêm rồi trả lời' thay vì đồng ý ngay trong họp - quyết định sau đó chắc chắn hơn hẳn.",
    },
    at: daysAgo(65),
  },
  {
    author: 'tuananh.fe',
    kind: 'text',
    category: PostCategory.SOFT_SKILLS,
    data: {
      topic: topic('Soft Skills', 'Writing'),
      content:
        'Tập viết note ngắn gọn hơn cho báo cáo hàng tuần, sếp đọc xong phản hồi nhanh hơn hẳn so với bản dài dòng trước đây.',
    },
    at: daysAgo(66),
  },
];

// ---------- posts cho topic con MOI cua Knowledge World ----------
// 2 bai/topic cho 23 gia tri PostCategory moi them (Think/AI/Create/Career/
// Business topic con - xem knowledge-worlds.ts ben enggo), kind da dang de
// co du lieu demo cho nhieu Content Type khac nhau (Post/Resource/Project/
// Question/Achievement/Progress/Event/Vote) khi ket hop voi Topic.
const POSTS_BY_NEW_TOPIC: PostSeed[] = [
  // --- Think: Algorithms ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.ALGORITHMS,
    data: {
      topic: topic('Algorithms', 'Graph'),
      content:
        'Giải lại bài Dijkstra bằng priority queue thay vì mảng tuyến tính, từ O(V²) xuống O((V+E)logV) - áp dụng ngay được cho bài toán tìm đường đi ngắn nhất trong hệ thống routing.',
    },
    at: daysAgo(67),
  },
  {
    author: 'linh.dev',
    kind: 'question',
    category: PostCategory.ALGORITHMS,
    data: {
      topic: topic('Algorithms', 'Ôn tập'),
      content:
        'Có ai có kinh nghiệm ôn lại thuật toán sau nhiều năm không đụng tới không? Đang thấy hổng kiến thức graph algorithms trầm trọng, không biết bắt đầu từ đâu cho hiệu quả.',
    },
    at: daysAgo(68),
  },
  // --- Think: Architecture ---
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.ARCHITECTURE,
    data: {
      topic: topic('Architecture', 'Microservices'),
      content:
        'Tách monolith thành 3 service theo domain boundary (user/order/payment) - khó nhất không phải code mà là thống nhất được ranh giới dữ liệu giữa các team.',
    },
    at: daysAgo(69),
  },
  {
    author: 'tuananh.fe',
    kind: 'note',
    category: PostCategory.ARCHITECTURE,
    data: {
      topic: topic('Architecture', 'Hexagonal'),
      title: 'Hexagonal architecture không phức tạp như tưởng',
      content:
        'Đọc lại pattern này, hoá ra chỉ là tách rõ business logic khỏi framework/DB - core không phụ thuộc ngược ra ngoài. Áp dụng dần cho module auth trước.',
      tag: 'Architecture',
    },
    at: daysAgo(70),
  },
  // --- Think: Performance ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.PERFORMANCE,
    data: {
      topic: topic('Performance', 'Frontend'),
      content:
        'Lazy load 80% component không cần render ngay trên trang dashboard, TTI giảm từ 4.2s xuống 1.8s - đa số bottleneck hoá ra nằm ở bundle size chứ không phải logic.',
    },
    at: daysAgo(71),
  },
  {
    author: 'minh.engineer',
    kind: 'tutorial',
    category: PostCategory.PERFORMANCE,
    data: {
      topic: topic('Performance', 'Profiling'),
      title: 'Profile React app bằng Chrome DevTools Performance tab',
      description:
        'Từng bước tìm ra component re-render thừa, không cần cài thêm tool ngoài.',
      steps: 5,
    },
    at: daysAgo(72),
  },
  // --- Think: Distributed Systems ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.DISTRIBUTED_SYSTEMS,
    data: {
      topic: topic('Distributed Systems', 'Consensus'),
      content:
        'Đọc lại phần consensus algorithm (Raft), giờ mới hiểu rõ tại sao cần leader election thay vì để mọi node tự quyết - tránh split-brain khi mất kết nối mạng.',
    },
    at: daysAgo(73),
  },
  {
    author: 'tuananh.fe',
    kind: 'idea',
    category: PostCategory.DISTRIBUTED_SYSTEMS,
    data: {
      topic: topic('Distributed Systems', 'Event Sourcing'),
      content:
        'Nếu hệ thống có nhiều service cùng ghi vào 1 event log (event sourcing), việc replay lại state sẽ dễ debug hơn hẳn so với chỉ lưu state cuối cùng.',
    },
    at: daysAgo(74),
  },
  // --- AI: Prompt Engineering ---
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.PROMPT_ENGINEERING,
    data: {
      topic: topic('Prompt Engineering', 'Few-shot'),
      content:
        'Thêm ví dụ cụ thể (few-shot) vào prompt thay vì chỉ mô tả yêu cầu chung chung, độ chính xác output tăng rõ rệt - đặc biệt với task phân loại.',
    },
    at: daysAgo(75),
  },
  {
    author: 'jane.design',
    kind: 'note',
    category: PostCategory.PROMPT_ENGINEERING,
    data: {
      topic: topic('Prompt Engineering', 'Chain of Thought'),
      title: 'Chain-of-thought giúp model tự sửa lỗi logic',
      content:
        'Yêu cầu model giải thích từng bước trước khi ra kết quả cuối, tỷ lệ sai giảm hẳn so với hỏi thẳng đáp án.',
      tag: 'AI',
    },
    at: daysAgo(76),
  },
  // --- AI: LLM ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.LLM,
    data: {
      topic: topic('LLM', 'Self-host'),
      content:
        'Thử self-host 1 model nhỏ (7B) thay vì gọi API lớn cho task nội bộ - latency thấp hơn hẳn dù chất lượng output kém hơn 1 chút, đánh đổi hợp lý cho use case đơn giản.',
    },
    at: daysAgo(77),
  },
  {
    author: 'minh.engineer',
    kind: 'question',
    category: PostCategory.LLM,
    data: {
      topic: topic('LLM', 'Context Window'),
      content:
        'Context window dài hơn có thực sự tốt hơn không, hay chỉ tốn token vô ích? Đang phân vân giữa cắt bớt context và để model tự lọc.',
    },
    at: daysAgo(78),
  },
  // --- AI: AI Agents ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.AI_AGENTS,
    data: {
      topic: topic('AI Agents', 'Tool Use'),
      content:
        'Cho agent tự gọi tool (search + calculator) thay vì chỉ trả lời từ kiến thức có sẵn, độ chính xác cho câu hỏi cần tính toán tăng hẳn.',
    },
    at: daysAgo(79),
  },
  {
    author: 'minh.engineer',
    kind: 'project-update',
    category: PostCategory.AI_AGENTS,
    data: {
      topic: topic('AI Agents', 'Internal Tools'),
      project: 'Internal AI Assistant',
      version: 'v0.3',
      changes: [
        'Thêm tool gọi API nội bộ để tra cứu đơn hàng',
        'Giới hạn số lần loop tool-call tránh vòng lặp vô hạn',
        'Log lại từng bước reasoning để debug dễ hơn',
      ],
    },
    at: daysAgo(80),
  },
  // --- AI: MCP ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.MCP,
    data: {
      topic: topic('MCP', 'Server'),
      content:
        'Thử viết 1 MCP server nhỏ expose API nội bộ cho Claude gọi trực tiếp - setup nhanh hơn mình tưởng, chuẩn hoá được cách agent nào cũng gọi được cùng 1 tool.',
    },
    at: daysAgo(81),
  },
  {
    author: 'minh.engineer',
    kind: 'link',
    category: PostCategory.MCP,
    data: {
      topic: topic('MCP', 'Protocol'),
      content:
        'Bài này giải thích rõ MCP khác function calling truyền thống ở điểm nào - đặc biệt phần chuẩn hoá giao thức giữa client/server.',
      link: {
        domain: 'modelcontextprotocol.io',
        title: 'Model Context Protocol',
        description:
          'Giao thức chuẩn để kết nối AI model với nguồn dữ liệu/tool bên ngoài.',
      },
    },
    at: daysAgo(82),
  },
  // --- AI: RAG ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.RAG,
    data: {
      topic: topic('RAG', 'Chunking'),
      content:
        'Chunk văn bản theo đoạn ngữ nghĩa thay vì cắt cứng theo số ký tự, câu trả lời của RAG chính xác hơn hẳn vì không còn cắt đứt giữa câu.',
    },
    at: daysAgo(83),
  },
  {
    author: 'jane.design',
    kind: 'idea',
    category: PostCategory.RAG,
    data: {
      topic: topic('RAG', 'Re-ranking'),
      content:
        'Nếu thêm bước re-rank kết quả sau khi retrieve (thay vì dùng thẳng top-k similarity) thì chất lượng câu trả lời chắc sẽ đều hơn, nhất là với câu hỏi mơ hồ.',
    },
    at: daysAgo(84),
  },
  // --- AI: Computer Vision ---
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.COMPUTER_VISION,
    data: {
      topic: topic('Computer Vision', 'Fine-tuning'),
      content:
        'Thử fine-tune model nhận diện lỗi sản phẩm trên dây chuyền, augment thêm ảnh xoay/lật là độ chính xác tăng đáng kể dù data gốc ít.',
    },
    at: daysAgo(85),
  },
  {
    author: 'lucas.dev',
    kind: 'achievement',
    category: PostCategory.COMPUTER_VISION,
    data: {
      topic: topic('Computer Vision', 'Model Accuracy'),
      title: 'Model nhận diện đạt 94% accuracy sau 3 tuần',
      description:
        'Từ 78% ban đầu, chủ yếu nhờ làm sạch lại tập dữ liệu gán nhãn sai chứ không phải đổi kiến trúc model.',
    },
    at: daysAgo(86),
  },
  // --- Create: UI ---
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.UI,
    data: {
      topic: topic('UI', 'Border Radius'),
      content:
        'Đổi hết border-radius trong hệ thống về đúng 1 scale (4/8/12/16px) thay vì mỗi chỗ 1 giá trị tuỳ hứng, nhìn đồng bộ hẳn dù chỉ là chi tiết nhỏ.',
    },
    at: daysAgo(87),
  },
  {
    author: 'linh.dev',
    kind: 'note',
    category: PostCategory.UI,
    data: {
      topic: topic('UI', 'Spacing'),
      title: '8px grid giúp spacing nhất quán hơn hẳn',
      content:
        'Trước canh spacing tuỳ cảm giác, giờ ép hết về bội số của 8px - layout tự nhiên thẳng hàng mà không cần chỉnh tay nhiều.',
      tag: 'UI',
    },
    at: daysAgo(88),
  },
  // --- Create: UX ---
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.UX,
    data: {
      topic: topic('UX', 'Onboarding'),
      content:
        'Rút ngắn form đăng ký từ 8 field xuống 3 field bắt buộc, field còn lại hỏi sau khi user đã vào app - tỷ lệ hoàn tất tăng đáng kể.',
    },
    at: daysAgo(89),
  },
  {
    author: 'minh.engineer',
    kind: 'question',
    category: PostCategory.UX,
    data: {
      topic: topic('UX', 'Research'),
      content:
        'Mọi người research user thế nào khi không có ngân sách thuê participant? Đang thử phỏng vấn nhanh 5 người dùng nội bộ nhưng không chắc đủ đại diện.',
    },
    at: daysAgo(90),
  },
  // --- Create: Motion ---
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.MOTION,
    data: {
      topic: topic('Motion', 'Duration'),
      content:
        'Giảm thời lượng animation modal từ 300ms xuống 150ms, cảm giác app phản hồi nhanh hẳn dù logic không đổi gì cả.',
    },
    at: daysAgo(91),
  },
  {
    author: 'linh.dev',
    kind: 'idea',
    category: PostCategory.MOTION,
    data: {
      topic: topic('Motion', 'Easing'),
      content:
        'Nếu animation loading dùng đúng easing giống lúc thao tác thành công (ease-out) thay vì linear, cảm giác mượt sẽ nhất quán hơn xuyên suốt app.',
    },
    at: daysAgo(92),
  },
  // --- Create: Figma ---
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.FIGMA,
    data: {
      topic: topic('Figma', 'Variables'),
      content:
        'Chuyển hết sang Figma Variables thay vì style cũ, đổi theme dark/light giờ chỉ cần switch 1 collection thay vì sửa từng layer.',
    },
    at: daysAgo(93),
  },
  {
    author: 'linh.dev',
    kind: 'resource',
    category: PostCategory.FIGMA,
    data: {
      topic: topic('Figma', 'Component Library'),
      content:
        'Chia sẻ file component library mình hay dùng để prototype nhanh, có sẵn auto-layout cho hầu hết pattern thường gặp.',
      resource: {
        title: 'UI Kit - Auto Layout Components',
        kindLabel: 'Figma · 120 component',
        rating: 4.7,
      },
    },
    at: daysAgo(94),
  },
  // --- Create: Design System (topic con moi, khac topic() tu do da dung o POSTS/POSTS_BY_CATEGORY) ---
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.DESIGN_SYSTEM,
    data: {
      topic: topic('Design System', 'Docs'),
      content:
        'Viết lại docs cho design system kèm ví dụ code thật thay vì chỉ có ảnh mô tả, dev team áp dụng đúng hơn hẳn, ít hỏi lại cách dùng.',
    },
    at: daysAgo(95),
  },
  {
    author: 'minh.engineer',
    kind: 'project-update',
    category: PostCategory.DESIGN_SYSTEM,
    data: {
      topic: topic('Design System', 'Tokens'),
      project: 'Design System',
      version: 'v3.0',
      changes: [
        'Thêm token cho elevation/shadow',
        'Chuẩn hoá lại tên component theo pattern Atomic Design',
        'Migrate 40% component cũ sang API mới',
      ],
    },
    at: daysAgo(96),
  },
  // --- Career: Resume ---
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.RESUME,
    data: {
      topic: topic('Resume', 'Metrics'),
      content:
        "Bỏ hết phần 'trách nhiệm công việc' chung chung, đổi thành số liệu cụ thể (giảm X%, tăng Y người dùng) - tỷ lệ được gọi phỏng vấn tăng rõ.",
    },
    at: daysAgo(97),
  },
  {
    author: 'tuananh.fe',
    kind: 'note',
    category: PostCategory.RESUME,
    data: {
      topic: topic('Resume', 'Length'),
      title: '1 trang CV vẫn đủ cho hầu hết vị trí',
      content:
        'Từng cố nhồi 2 trang cho đầy đủ, giờ rút lại 1 trang chỉ giữ phần liên quan nhất tới vị trí ứng tuyển - recruiter đọc nhanh hơn hẳn.',
      tag: 'Career',
    },
    at: daysAgo(98),
  },
  // --- Career: Interview ---
  {
    author: 'lucas.dev',
    kind: 'text',
    category: PostCategory.INTERVIEW,
    data: {
      topic: topic('Interview', 'Behavioral'),
      content:
        'Luyện trả lời behavioral question theo cấu trúc STAR (Situation-Task-Action-Result), câu trả lời rõ ràng hơn hẳn so với kể chuyện lan man.',
    },
    at: daysAgo(99),
  },
  {
    author: 'minh.engineer',
    kind: 'question',
    category: PostCategory.INTERVIEW,
    data: {
      topic: topic('Interview', 'System Design'),
      content:
        'Vòng system design interview thường hỏi sâu tới mức nào cho vị trí mid-level? Đang không chắc nên chuẩn bị tới đâu là đủ.',
    },
    at: daysAgo(100),
  },
  // --- Career: Productivity ---
  {
    author: 'peter.devops',
    kind: 'text',
    category: PostCategory.PRODUCTIVITY,
    data: {
      topic: topic('Productivity', 'Task Management'),
      content:
        'Chuyển hết task rời rạc vào 1 board Kanban duy nhất thay vì note tay nhiều nơi, giảm hẳn cảm giác quên việc giữa các dự án.',
    },
    at: daysAgo(101),
  },
  {
    author: 'jane.design',
    kind: 'idea',
    category: PostCategory.PRODUCTIVITY,
    data: {
      topic: topic('Productivity', 'Deep Work'),
      content:
        'Nếu block cứng 2 tiếng đầu ngày không họp, không Slack - công việc cần tập trung sâu mới thực sự xong đúng hạn.',
    },
    at: daysAgo(102),
  },
  // --- Career: Remote ---
  {
    author: 'linh.dev',
    kind: 'text',
    category: PostCategory.REMOTE,
    data: {
      topic: topic('Remote', 'Communication'),
      content:
        'Làm remote 1 năm, bài học lớn nhất là phải chủ động overcommunicate tiến độ - im lặng làm việc dễ bị hiểu nhầm là không làm gì.',
    },
    at: daysAgo(103),
  },
  {
    author: 'peter.devops',
    kind: 'poll',
    category: PostCategory.REMOTE,
    data: {
      topic: topic('Remote', 'Setup'),
      question: 'Bạn thích setup làm việc remote nào nhất?',
      options: [
        { label: 'Full remote', votes: 210 },
        { label: 'Hybrid 2-3 ngày văn phòng', votes: 156 },
        { label: 'Full văn phòng', votes: 34 },
      ],
    },
    at: daysAgo(104),
  },
  // --- Career: Freelance ---
  {
    author: 'tuananh.fe',
    kind: 'text',
    category: PostCategory.FREELANCE,
    data: {
      topic: topic('Freelance', 'Estimation'),
      content:
        'Nhận job freelance đầu tiên ngoài giờ hành chính, khó nhất không phải code mà là ước lượng thời gian cho đúng để báo giá.',
    },
    at: daysAgo(105),
  },
  {
    author: 'lucas.dev',
    kind: 'milestone',
    category: PostCategory.FREELANCE,
    data: {
      topic: topic('Freelance', 'First Client'),
      title: 'Job freelance đầu tiên hoàn thành đúng deadline',
      description:
        '3 tuần làm ngoài giờ, khách hàng hài lòng và đã hẹn job tiếp theo.',
    },
    at: daysAgo(106),
  },
  // --- Business: Startup ---
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.STARTUP,
    data: {
      topic: topic('Startup', 'MVP'),
      content:
        'Launch MVP trong 3 tuần thay vì làm đủ tính năng như kế hoạch ban đầu - feedback thật từ user sớm giá trị hơn nhiều so với đoán mò thêm 2 tháng nữa.',
    },
    at: daysAgo(107),
  },
  {
    author: 'jane.design',
    kind: 'question',
    category: PostCategory.STARTUP,
    data: {
      topic: topic('Startup', 'Validation'),
      content:
        'Mọi người validate ý tưởng startup thế nào trước khi code dòng nào? Đang cân nhắc landing page + waitlist có đủ tin cậy không.',
    },
    at: daysAgo(108),
  },
  // --- Business: Growth ---
  {
    author: 'minh.engineer',
    kind: 'text',
    category: PostCategory.GROWTH,
    data: {
      topic: topic('Growth', 'Referral'),
      content:
        'Thêm referral đơn giản (mời bạn tặng cả 2 người 1 tháng free) tăng user mới 22% mà không tốn thêm ngân sách ads.',
    },
    at: daysAgo(109),
  },
  {
    author: 'jane.design',
    kind: 'event',
    category: PostCategory.GROWTH,
    data: {
      topic: topic('Growth', 'Community'),
      title: 'Growth Marketing Meetup HCMC #2',
      when: 'Chủ nhật tuần sau · 09:00',
      location: 'Toong Q3, TP.HCM',
    },
    at: daysAgo(110),
  },
  // --- Business: Marketing ---
  {
    author: 'jane.design',
    kind: 'text',
    category: PostCategory.MARKETING,
    data: {
      topic: topic('Marketing', 'Copywriting'),
      content:
        'Đổi headline landing page từ mô tả tính năng sang mô tả kết quả user đạt được, conversion tăng gần gấp đôi dù giao diện không đổi gì.',
    },
    at: daysAgo(111),
  },
  {
    author: 'minh.engineer',
    kind: 'link',
    category: PostCategory.MARKETING,
    data: {
      topic: topic('Marketing', 'Email'),
      content:
        'Case study hay về cách 1 sản phẩm B2B tăng trial-to-paid chỉ bằng cách đổi thời điểm gửi email onboarding.',
      link: {
        domain: 'hubspot.com',
        title: 'Onboarding Email Timing',
        description:
          'Phân tích thời điểm gửi email ảnh hưởng thế nào tới tỷ lệ chuyển đổi từ dùng thử sang trả phí.',
      },
    },
    at: daysAgo(112),
  },
];

// ---------- seeding ----------

async function main() {
  const usernameToId = new Map<string, string>();

  for (const p of PERSONAS) {
    const user = await prisma.user.upsert({
      where: { googleId: p.googleId },
      update: {
        name: p.name,
        username: p.username,
        avatarUrl: p.avatarUrl,
        verified: p.verified,
      },
      create: {
        googleId: p.googleId,
        email: p.email,
        name: p.name,
        username: p.username,
        avatarUrl: p.avatarUrl,
        verified: p.verified,
      },
    });
    usernameToId.set(p.username, user.id);
    console.log(`Persona ${p.username} -> ${user.id}`);
  }

  // Chinh chu (dang nhap that qua Google) - chi backfill username/avatar NEU
  // con thieu, khong ghi de du lieu that cua ho.
  const realUser = await prisma.user.findUnique({
    where: { email: 'anhht.fe@gmail.com' },
    select: { id: true, username: true, avatarUrl: true },
  });
  if (!realUser) {
    throw new Error(
      'Khong tim thay user that (anhht.fe@gmail.com) - chay seed nay sau khi da dang nhap it nhat 1 lan.',
    );
  }
  await prisma.user.update({
    where: { id: realUser.id },
    data: {
      username: realUser.username ?? 'tuananh.fe',
      avatarUrl: realUser.avatarUrl ?? 'https://i.pravatar.cc/150?img=52',
    },
  });
  usernameToId.set('tuananh.fe', realUser.id);
  console.log(`Real user tuananh.fe -> ${realUser.id}`);

  // Xoa sach post seed cu (chi cua cac tac gia trong danh sach nay) truoc khi
  // tao lai - script chay lai nhieu lan khong bi nhan doi post.
  const authorIds = Array.from(usernameToId.values());
  const deleted = await prisma.post.deleteMany({
    where: { authorId: { in: authorIds } },
  });
  console.log(`Cleared ${deleted.count} old seeded posts`);

  const allPosts = [...POSTS, ...POSTS_BY_CATEGORY, ...POSTS_BY_NEW_TOPIC];
  for (const post of allPosts) {
    const authorId = usernameToId.get(post.author);
    if (!authorId) throw new Error(`Khong tim thay tac gia ${post.author}`);
    await prisma.post.create({
      data: {
        authorId,
        kind: toDbKind(post.kind),
        category: post.category,
        data: post.data as Prisma.InputJsonValue,
        likesCount: 3 + Math.floor(Math.random() * 340),
        commentsCount: Math.floor(Math.random() * 45),
        repostsCount: Math.floor(Math.random() * 20),
        createdAt: post.at,
        updatedAt: post.at,
      },
    });
  }

  console.log(
    `Seeded ${allPosts.length} posts across ${PERSONAS.length + 1} authors.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
