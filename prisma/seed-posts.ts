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

// 3 kind da co anh THAT rieng trong data (image/gallery/video) - khong can
// them coverImage cho cac kind nay, tranh trung lap gay hieu lam ("anh nao
// moi la anh that cua bai").
const NATIVE_IMAGE_KINDS = new Set<PostKindApi>(['image', 'gallery', 'video']);

// Anh dai dien chung cho MOI kind con lai (text/note/resource/achievement/
// question/...) - enggo/src/components/discover/home-feed/NoteCard.tsx +
// ContentTile.tsx fallback ve gradient+icon khi khong co anh, seed them field
// nay de feed moi luon co anh that thay vi toan gradient. Seed picsum theo
// topic + index de moi bai ra 1 anh khac nhau, ty le dung 1280:670 khop
// aspect-1280/670 dang dung o NoteCard.
function buildCoverImageSeed(
  topicPath: string[] | undefined,
  index: number,
): string {
  const base = (topicPath?.join('-') ?? 'career-tree').toLowerCase();
  const slug = base.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `https://picsum.photos/seed/${slug}-${index}/1280/670`;
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
  // --- Them cung luc voi he thong category nghe nghiep 2 tang (7 nhom) ---
  Data: '#60a5fa',
  Testing: '#34d399',
  Branding: '#c084fc',
  Video: '#fb923c',
  Writing: '#fbbf24',
  SEO: '#4ade80',
  Social: '#38bdf8',
  PR: '#f87171',
  Sales: '#fb7185',
  Project: '#818cf8',
  Operations: '#2dd4bf',
  Strategy: '#a78bfa',
  'Kế toán': '#5eead4',
  'Tài chính': '#34d399',
  'Đầu tư': '#facc15',
  'Tuyển dụng': '#f0abfc',
  'Lãnh đạo': '#93c5fd',
  'Đào tạo': '#86efac',
  'Ngoại ngữ': '#67e8f9',
  'Giao tiếp': '#fdba74',
  'Tư duy': '#c4b5fd',
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
  // 4 persona NGOAI nganh tech - them cung luc voi he thong category nghe
  // nghiep 2 tang: 7 nhom cha phu ca Marketing/Tai chinh/Nhan su/Ky nang nen
  // tang, ma 5 persona cu deu la dev/designer nen de ho viet bai ke toan hay
  // tuyen dung se rat gia. Cung upsert theo googleId nhu tren.
  {
    googleId: 'seed-thao-marketing',
    email: 'thao.marketing.seed@example.com',
    name: 'Thảo Nguyễn',
    username: 'thao.marketing',
    avatarUrl: 'https://i.pravatar.cc/150?img=45',
    verified: true,
  },
  {
    googleId: 'seed-hung-finance',
    email: 'hung.finance.seed@example.com',
    name: 'Hưng Lê',
    username: 'hung.finance',
    avatarUrl: 'https://i.pravatar.cc/150?img=15',
    verified: false,
  },
  {
    googleId: 'seed-mai-hr',
    email: 'mai.hr.seed@example.com',
    name: 'Mai Phạm',
    username: 'mai.hr',
    avatarUrl: 'https://i.pravatar.cc/150?img=49',
    verified: true,
  },
  {
    googleId: 'seed-khoa-content',
    email: 'khoa.content.seed@example.com',
    name: 'Khoa Đặng',
    username: 'khoa.content',
    avatarUrl: 'https://i.pravatar.cc/150?img=68',
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
  // Slug nhanh nghe nghiep (CareerCategory.slug) - truc phan loai THU HAI,
  // doc lap voi `category` o tren (`category` = topic Knowledge World). Neu
  // khong set thi main() tu suy ra tu `category` qua CAREER_BY_POST_CATEGORY;
  // suy ra khong duoc thi de null = bai thuoc muc "Chia se chung".
  careerCategory?: string;
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
      content:
        '3 tuần làm ngoài giờ, khách hàng hài lòng và đã hẹn job tiếp theo.',
      // milestone BAT BUOC co `items` (xem union Post trong home-feed-mock.ts)
      // - bai nay truoc day dung `description` nen MilestoneCard vo khi render.
      items: [
        { label: 'Thời gian', value: '3 tuần' },
        { label: 'Giá trị hợp đồng', value: '18tr' },
        { label: 'Job tiếp theo', value: 'Đã hẹn' },
      ],
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

// ---------- category nghe nghiep (2 tang) ----------
// 7 nhom cha / 26 nhanh con. Dinh nghia SAN o day (user khong tu tao duoc,
// dung scope da chot) - upsert theo slug nen chay lai khong nhan doi.
// `orderIndex` CHI dung lam tie-breaker: thu tu hien thi that do so bai 7
// ngay quyet dinh (xem FeedCategoryService.findTree).
type CareerGroupSeed = {
  slug: string;
  name: string;
  icon: string;
  categories: { slug: string; name: string }[];
};

const CAREER_TAXONOMY: CareerGroupSeed[] = [
  {
    slug: 'cong-nghe-ky-thuat',
    name: 'Công nghệ & Kỹ thuật',
    icon: 'cpu',
    categories: [
      { slug: 'lap-trinh-web-mobile', name: 'Lập trình web/mobile' },
      { slug: 'du-lieu-ai-ml', name: 'Dữ liệu & AI/ML' },
      { slug: 'devops-ha-tang', name: 'DevOps & Hạ tầng' },
      { slug: 'kiem-thu-bao-mat', name: 'Kiểm thử & Bảo mật' },
      { slug: 'quan-ly-san-pham', name: 'Quản lý sản phẩm' },
    ],
  },
  {
    slug: 'thiet-ke-sang-tao',
    name: 'Thiết kế & Sáng tạo',
    icon: 'palette',
    categories: [
      { slug: 'ui-ux', name: 'UI/UX' },
      { slug: 'do-hoa-thuong-hieu', name: 'Đồ hoạ & Thương hiệu' },
      { slug: 'san-xuat-noi-dung-video', name: 'Sản xuất nội dung/Video' },
      { slug: 'viet-bien-tap', name: 'Viết & Biên tập' },
    ],
  },
  {
    slug: 'marketing-truyen-thong',
    name: 'Marketing & Truyền thông',
    icon: 'megaphone',
    categories: [
      { slug: 'digital-marketing', name: 'Digital Marketing' },
      { slug: 'seo-content', name: 'SEO & Content' },
      { slug: 'social-media', name: 'Social Media' },
      { slug: 'quan-he-cong-chung', name: 'Quan hệ công chúng (PR)' },
    ],
  },
  {
    slug: 'kinh-doanh-van-hanh',
    name: 'Kinh doanh & Vận hành',
    icon: 'briefcase',
    categories: [
      { slug: 'ban-hang', name: 'Bán hàng' },
      { slug: 'quan-ly-du-an', name: 'Quản lý dự án' },
      { slug: 'van-hanh-quy-trinh', name: 'Vận hành & Quy trình' },
      { slug: 'chien-luoc', name: 'Chiến lược' },
    ],
  },
  {
    slug: 'tai-chinh-dau-tu',
    name: 'Tài chính & Đầu tư',
    icon: 'wallet',
    categories: [
      { slug: 'ke-toan', name: 'Kế toán' },
      { slug: 'phan-tich-tai-chinh', name: 'Phân tích tài chính' },
      { slug: 'dau-tu-thi-truong', name: 'Đầu tư & Thị trường' },
    ],
  },
  {
    slug: 'nhan-su-lanh-dao',
    name: 'Nhân sự & Lãnh đạo',
    icon: 'users',
    categories: [
      { slug: 'tuyen-dung-hr', name: 'Tuyển dụng & HR' },
      { slug: 'ky-nang-lanh-dao', name: 'Kỹ năng lãnh đạo' },
      { slug: 'dao-tao-noi-bo', name: 'Đào tạo nội bộ' },
    ],
  },
  {
    slug: 'ky-nang-nen-tang',
    name: 'Kỹ năng nền tảng',
    icon: 'graduation-cap',
    categories: [
      { slug: 'ngoai-ngu', name: 'Ngoại ngữ' },
      { slug: 'giao-tiep-thuyet-trinh', name: 'Giao tiếp & Thuyết trình' },
      { slug: 'tu-duy-phan-bien', name: 'Tư duy phản biện' },
    ],
  },
];

// Suy nganh nghe tu topic Knowledge World da gan san cho ~117 bai cu, de
// khong phai sua tay tung bai. Cac gia tri CO Y bo trong (CAREER, RESUME,
// INTERVIEW, FREELANCE, REMOTE, PRODUCTIVITY...) la chuyen phat trien su
// nghiep noi chung, khong thuoc nganh nghe nao -> roi vao "Chia sẻ chung".
const CAREER_BY_POST_CATEGORY: Partial<Record<PostCategory, string>> = {
  [PostCategory.FRONTEND]: 'lap-trinh-web-mobile',
  [PostCategory.BACKEND]: 'lap-trinh-web-mobile',
  [PostCategory.MOBILE]: 'lap-trinh-web-mobile',
  [PostCategory.GAME_DEV]: 'lap-trinh-web-mobile',
  [PostCategory.BLOCKCHAIN]: 'lap-trinh-web-mobile',
  [PostCategory.IOT]: 'lap-trinh-web-mobile',
  [PostCategory.DEV_TOOLS]: 'lap-trinh-web-mobile',
  [PostCategory.DATABASE]: 'lap-trinh-web-mobile',
  [PostCategory.ALGORITHMS]: 'lap-trinh-web-mobile',
  [PostCategory.ARCHITECTURE]: 'lap-trinh-web-mobile',
  [PostCategory.PERFORMANCE]: 'lap-trinh-web-mobile',
  [PostCategory.DISTRIBUTED_SYSTEMS]: 'lap-trinh-web-mobile',
  [PostCategory.SYSTEM_DESIGN]: 'lap-trinh-web-mobile',
  [PostCategory.DATA_AI]: 'du-lieu-ai-ml',
  [PostCategory.LLM]: 'du-lieu-ai-ml',
  [PostCategory.AI_AGENTS]: 'du-lieu-ai-ml',
  [PostCategory.MCP]: 'du-lieu-ai-ml',
  [PostCategory.RAG]: 'du-lieu-ai-ml',
  [PostCategory.COMPUTER_VISION]: 'du-lieu-ai-ml',
  [PostCategory.PROMPT_ENGINEERING]: 'du-lieu-ai-ml',
  [PostCategory.DEVOPS]: 'devops-ha-tang',
  [PostCategory.CLOUD]: 'devops-ha-tang',
  [PostCategory.QA_TEST]: 'kiem-thu-bao-mat',
  [PostCategory.SECURITY]: 'kiem-thu-bao-mat',
  [PostCategory.PRODUCT]: 'quan-ly-san-pham',
  [PostCategory.UI_UX]: 'ui-ux',
  [PostCategory.UI]: 'ui-ux',
  [PostCategory.UX]: 'ui-ux',
  [PostCategory.FIGMA]: 'ui-ux',
  [PostCategory.DESIGN_SYSTEM]: 'ui-ux',
  [PostCategory.MOTION]: 'san-xuat-noi-dung-video',
  [PostCategory.MARKETING]: 'digital-marketing',
  [PostCategory.GROWTH]: 'digital-marketing',
  [PostCategory.STARTUP]: 'chien-luoc',
  [PostCategory.SOFT_SKILLS]: 'giao-tiep-thuyet-trinh',
};

// Bai MOI trong 7 ngay gan nhat, phu DU 26 nhanh con - bat buoc, vi
// GET /feed/categories/tree an moi nhanh khong co bai nao trong 7 ngay.
function careerPost(
  author: PersonaKey,
  kind: PostKindApi,
  careerCategory: string,
  topicPath: [string, string],
  data: Record<string, unknown>,
  hoursOld: number,
): PostSeed {
  return {
    author,
    kind,
    careerCategory,
    data: { topic: topic(...topicPath), ...data },
    at: hoursAgo(hoursOld),
  };
}

const POSTS_BY_CAREER: PostSeed[] = [
  // === Công nghệ & Kỹ thuật ===
  careerPost(
    'lucas.dev',
    'text',
    'lap-trinh-web-mobile',
    ['Frontend', 'React'],
    {
      content:
        'Bỏ hẳn useEffect để đồng bộ state dẫn xuất, tính thẳng trong lúc render. Component từ 180 dòng còn 96, và cái bug "nhấp nháy 1 frame" mà 3 tháng nay không ai tìm ra nguyên nhân cũng biến mất luôn.',
    },
    5,
  ),
  careerPost(
    'linh.dev',
    'question',
    'lap-trinh-web-mobile',
    ['Mobile', 'React Native'],
    {
      title: 'App RN build release chậm gấp 4 lần debug, mọi người gặp chưa?',
      content:
        'Debug build 2 phút, release 8 phút trên cùng máy. Đã bật Hermes, đã tắt source map. Có ai từng khoanh vùng được thủ phạm bằng cách nào không?',
      tags: ['react-native', 'build', 'hermes'],
    },
    27,
  ),
  careerPost(
    'minh.engineer',
    'note',
    'du-lieu-ai-ml',
    ['LLM', 'Evaluation'],
    {
      title: 'Đừng tin điểm eval của chính mình',
      content:
        'Bộ eval tự viết cho con chatbot nội bộ đạt 91%. Đem 50 câu hỏi thật của người dùng vào thì còn 62%. Bài học: tập eval phải lấy từ log thật, không phải từ trí tưởng tượng của người xây hệ thống.',
    },
    12,
  ),
  careerPost(
    'minh.engineer',
    'text',
    'du-lieu-ai-ml',
    ['Data', 'Pipeline'],
    {
      content:
        'Pipeline ETL chạy 6 tiếng mỗi đêm, soi ra 70% thời gian nằm ở một bước join không có index. Thêm index xong còn 50 phút. Chốt lại: đo trước, tối ưu sau — mình suýt đi viết lại bằng Spark.',
    },
    52,
  ),
  careerPost(
    'peter.devops',
    'text',
    'devops-ha-tang',
    ['DevOps', 'Kubernetes'],
    {
      content:
        'Đặt lại resource request/limit cho 23 service theo số liệu thật 30 ngày thay vì con số copy từ template. Hoá đơn cluster giảm 34%, không service nào bị OOM. Việc nhàm chán nhưng hiệu quả nhất quý này.',
    },
    9,
  ),
  careerPost(
    'peter.devops',
    'tutorial',
    'devops-ha-tang',
    ['DevOps', 'CI/CD'],
    {
      title: 'Rút CI từ 14 phút xuống 4 phút',
      description:
        'Ba việc: cache layer Docker theo lockfile, chạy song song test theo shard, và bỏ bước lint trùng lặp đã có trong pre-commit. Không đổi runner, không tốn thêm tiền.',
      steps: 3,
    },
    74,
  ),
  careerPost(
    'linh.dev',
    'text',
    'kiem-thu-bao-mat',
    ['Security', 'AppSec'],
    {
      content:
        'Pentest nội bộ tìm ra endpoint export CSV không kiểm tra quyền — ai có link là tải được dữ liệu phòng ban khác. Nằm im 8 tháng. Từ giờ mọi endpoint mới bắt buộc có test case "user không có quyền".',
    },
    18,
  ),
  careerPost(
    'lucas.dev',
    'note',
    'kiem-thu-bao-mat',
    ['Testing', 'E2E'],
    {
      title: 'Test E2E hay đỏ vặt: 90% là do chờ sai',
      content:
        'Thay toàn bộ sleep cố định bằng chờ theo điều kiện hiển thị. Tỉ lệ test đỏ oan từ 12% xuống 0.8% trong 2 tuần. Không viết thêm test nào mới cả.',
    },
    45,
  ),
  careerPost(
    'jane.design',
    'text',
    'quan-ly-san-pham',
    ['Product', 'Discovery'],
    {
      content:
        'Ngồi xem 8 người dùng thật thao tác trong 2 ngày, gạch được 3 tính năng khỏi roadmap quý. Chi phí: 2 ngày. Tiết kiệm: khoảng 6 tuần công của cả team.',
    },
    31,
  ),
  careerPost(
    'jane.design',
    'question',
    'quan-ly-san-pham',
    ['Product', 'Metrics'],
    {
      title: 'Đo "sản phẩm có hữu ích không" bằng chỉ số nào là hợp lý?',
      content:
        'DAU/MAU đang đẹp nhưng phỏng vấn người dùng thì họ nói dùng vì bắt buộc. Team mọi người dùng chỉ số nào để bắt được khoảng lệch này?',
      tags: ['product', 'analytics'],
    },
    88,
  ),

  // === Thiết kế & Sáng tạo ===
  careerPost(
    'jane.design',
    'text',
    'ui-ux',
    ['UX', 'Research'],
    {
      content:
        'Đổi nhãn nút từ "Gửi" thành "Gửi yêu cầu hỗ trợ", tỉ lệ hoàn thành form tăng 19%. Không đổi một dòng layout nào. Đôi khi vấn đề không nằm ở giao diện mà ở chỗ người ta không biết bấm xong sẽ ra gì.',
    },
    7,
  ),
  careerPost(
    'jane.design',
    'image',
    'ui-ux',
    ['UI', 'Design System'],
    {
      content:
        'Dọn lại bảng màu: từ 47 biến màu rải rác trong Figma xuống 12 token có tên theo ngữ nghĩa. Ảnh trước/sau khi map lại toàn bộ component.',
      image: {
        url: 'https://picsum.photos/seed/career-ui-ux-tokens/1280/670',
        alt: 'Bảng màu trước và sau khi gom về design token',
      },
    },
    36,
  ),
  careerPost(
    'khoa.content',
    'text',
    'do-hoa-thuong-hieu',
    ['Branding', 'Identity'],
    {
      content:
        'Làm bộ nhận diện cho một tiệm bánh nhỏ. Chủ tiệm không cần logo đẹp, họ cần cái biển hiệu đọc được từ bên kia đường lúc 7 giờ tối. Ràng buộc đó quyết định toàn bộ thiết kế.',
    },
    22,
  ),
  careerPost(
    'khoa.content',
    'gallery',
    'do-hoa-thuong-hieu',
    ['Branding', 'Packaging'],
    {
      content:
        '3 phương án bao bì trà thảo mộc, chọn phương án giữa vì in lụa 2 màu rẻ hơn 40%.',
      images: [
        {
          url: 'https://picsum.photos/seed/career-brand-pack-1/1280/670',
          alt: 'Phương án bao bì 1',
        },
        {
          url: 'https://picsum.photos/seed/career-brand-pack-2/1280/670',
          alt: 'Phương án bao bì 2',
        },
        {
          url: 'https://picsum.photos/seed/career-brand-pack-3/1280/670',
          alt: 'Phương án bao bì 3',
        },
      ],
    },
    64,
  ),
  careerPost(
    'khoa.content',
    'video',
    'san-xuat-noi-dung-video',
    ['Video', 'Editing'],
    {
      content:
        'Dựng lại video giới thiệu sản phẩm: cắt 20 giây đầu, vào thẳng vấn đề người xem quan tâm. Tỉ lệ xem hết tăng từ 31% lên 58%.',
      video: {
        thumbnailUrl: 'https://picsum.photos/seed/career-video-edit/1280/670',
        duration: '4:12',
      },
    },
    15,
  ),
  careerPost(
    'khoa.content',
    'note',
    'san-xuat-noi-dung-video',
    ['Video', 'Workflow'],
    {
      title: 'Quy trình dựng video một mình cho kênh nội bộ',
      content:
        'Quay 1 lần, cắt thô bằng transcript trước khi mở phần mềm dựng. Đọc chữ nhanh hơn tua video rất nhiều — thời gian hậu kỳ giảm còn một nửa.',
    },
    97,
  ),
  careerPost(
    'khoa.content',
    'text',
    'viet-bien-tap',
    ['Writing', 'Editing'],
    {
      content:
        'Biên tập bài kỹ thuật cho người không làm kỹ thuật đọc: quy tắc của mình là mỗi đoạn chỉ một ý, và bất kỳ từ viết tắt nào cũng phải được giải thích ngay lần đầu xuất hiện. Nghe đơn giản nhưng làm được thì bài dễ đọc hẳn.',
    },
    41,
  ),
  careerPost(
    'khoa.content',
    'question',
    'viet-bien-tap',
    ['Writing', 'Process'],
    {
      title: 'Mọi người viết bản nháp đầu tiên trong bao lâu?',
      content:
        'Mình hay sa vào sửa câu chữ ngay khi vừa viết xong đoạn đầu, kết quả là 3 tiếng chưa xong bài. Có ai có mẹo tách hẳn giai đoạn viết và giai đoạn sửa không?',
      tags: ['writing', 'productivity'],
    },
    110,
  ),

  // === Marketing & Truyền thông ===
  careerPost(
    'thao.marketing',
    'text',
    'digital-marketing',
    ['Marketing', 'Performance'],
    {
      content:
        'Tắt 6 nhóm quảng cáo tiêu 60% ngân sách nhưng chỉ mang về 9% đơn hàng. Dồn tiền vào 2 nhóm tốt nhất. Doanh thu tháng không đổi, chi phí giảm 41%. Đôi khi tối ưu là bớt đi chứ không phải thêm vào.',
    },
    4,
  ),
  careerPost(
    'thao.marketing',
    'note',
    'digital-marketing',
    ['Marketing', 'Attribution'],
    {
      title: 'Last-click đang nói dối bạn',
      content:
        'Chuyển sang mô hình data-driven, kênh nội dung từ chỗ "không đóng góp gì" thành kênh chạm đầu tiên của 38% đơn hàng. Suýt nữa thì cắt cả team content.',
    },
    29,
  ),
  careerPost(
    'thao.marketing',
    'text',
    'seo-content',
    ['SEO', 'Content'],
    {
      content:
        'Gộp 14 bài viết mỏng cùng chủ đề thành 3 bài đầy đủ, redirect 301 phần còn lại. Sau 6 tuần: traffic tự nhiên tăng 2.3 lần, thứ hạng từ khoá chính từ trang 3 lên top 5.',
    },
    19,
  ),
  careerPost(
    'thao.marketing',
    'resource',
    'seo-content',
    ['SEO', 'Technical'],
    {
      content:
        'Bản rút gọn 22 mục mình dùng nội bộ, đã cắt bớt những mục không còn ảnh hưởng từ 2024.',
      resource: {
        title: 'Checklist SEO kỹ thuật trước khi lên trang mới',
        kindLabel: 'Tài liệu · 22 mục',
        rating: 4.7,
      },
    },
    58,
  ),
  careerPost(
    'thao.marketing',
    'text',
    'social-media',
    ['Social', 'Community'],
    {
      content:
        'Trả lời hết bình luận trong 2 giờ đầu sau khi đăng, đều đặn 1 tháng. Lượt tiếp cận tự nhiên tăng 60%. Không có thủ thuật nào cả, chỉ là có mặt đúng lúc người ta đang nói chuyện.',
    },
    33,
  ),
  careerPost(
    'thao.marketing',
    'idea',
    'social-media',
    ['Social', 'Format'],
    {
      content:
        'Thử format "một ngày làm việc" quay bằng điện thoại, không kịch bản. Ba video đầu tiếp cận gấp 4 lần video dựng công phu. Người xem muốn thấy người thật hơn là thấy quảng cáo đẹp.',
    },
    86,
  ),
  careerPost(
    'thao.marketing',
    'text',
    'quan-he-cong-chung',
    ['PR', 'Crisis'],
    {
      content:
        'Sự cố hệ thống 4 tiếng hôm thứ Ba. Bài học lớn nhất không phải kỹ thuật: đăng thông báo trung thực sau 20 phút thay vì im lặng chờ khắc phục xong. Số lượt huỷ dịch vụ gần như bằng không.',
    },
    50,
  ),
  careerPost(
    'thao.marketing',
    'note',
    'quan-he-cong-chung',
    ['PR', 'Media'],
    {
      title: 'Gửi thông cáo báo chí mà không ai đăng',
      content:
        'Nhìn lại 12 lần gửi: 10 lần viết về việc công ty muốn nói, 2 lần viết về việc độc giả của toà soạn đó quan tâm. Đúng 2 lần đó được đăng.',
    },
    121,
  ),

  // === Kinh doanh & Vận hành ===
  careerPost(
    'hung.finance',
    'text',
    'ban-hang',
    ['Sales', 'B2B'],
    {
      content:
        'Bỏ kịch bản gọi điện dài 2 trang, thay bằng 3 câu hỏi mở về vấn đề khách đang gặp. Tỉ lệ đặt được lịch hẹn từ 8% lên 21%. Khách không muốn nghe mình giới thiệu, họ muốn được hỏi đúng chỗ đau.',
    },
    11,
  ),
  careerPost(
    'hung.finance',
    'question',
    'ban-hang',
    ['Sales', 'Pipeline'],
    {
      title: 'Deal nằm im 3 tháng thì nên theo tiếp hay bỏ?',
      content:
        'Có 6 deal ở giai đoạn thương thảo, khách vẫn trả lời nhưng không tiến. Mọi người đặt mốc bao lâu thì chuyển sang trạng thái đóng - thua để tập trung chỗ khác?',
      tags: ['sales', 'crm'],
    },
    72,
  ),
  careerPost(
    'minh.engineer',
    'project-update',
    'quan-ly-du-an',
    ['Project', 'Delivery'],
    {
      project: 'Di chuyển hệ thống thanh toán',
      version: 'Tuần 6/10',
      changes: [
        'Cắt phạm vi 2 hạng mục phụ để giữ đúng hạn cho phần lõi',
        'Chốt phương án chạy song song 2 hệ thống trong 3 tuần đầu',
        'Ghi lại quyết định để 3 tháng nữa nhìn lại xem đúng hay sai',
      ],
    },
    24,
  ),
  careerPost(
    'minh.engineer',
    'note',
    'quan-ly-du-an',
    ['Project', 'Estimation'],
    {
      title: 'Ước lượng sai 2 lần liên tiếp thì đừng ước lượng lần 3',
      content:
        'Chuyển sang chia nhỏ tới mức mỗi việc dưới 1 ngày. Không chính xác hơn về tổng thời gian, nhưng phát hiện trượt tiến độ sớm hơn 2 tuần.',
    },
    104,
  ),
  careerPost(
    'mai.hr',
    'text',
    'van-hanh-quy-trinh',
    ['Operations', 'Process'],
    {
      content:
        'Vẽ lại quy trình duyệt chi tiêu: 7 bước, 4 người ký. Hỏi từng người "nếu bỏ chữ ký của anh/chị thì rủi ro gì" — 2 người không trả lời được. Còn 5 bước, 2 chữ ký, thời gian duyệt từ 6 ngày xuống 1 ngày.',
    },
    16,
  ),
  careerPost(
    'mai.hr',
    'text',
    'van-hanh-quy-trinh',
    ['Operations', 'Automation'],
    {
      content:
        'Tự động hoá việc tổng hợp báo cáo tuần bằng một bảng tính có kết nối dữ liệu. Tiết kiệm 3 giờ mỗi tuần cho 4 người. Không cần phần mềm mới, không cần xin ngân sách.',
    },
    93,
  ),
  careerPost(
    'hung.finance',
    'text',
    'chien-luoc',
    ['Strategy', 'Planning'],
    {
      content:
        'Kế hoạch năm ban đầu có 14 mục tiêu. Ép xuống 3. Cái khó không phải chọn cái nào giữ, mà là giải thích cho 11 người chủ trì các mục tiêu còn lại vì sao việc của họ bị hoãn.',
    },
    38,
  ),
  careerPost(
    'hung.finance',
    'note',
    'chien-luoc',
    ['Strategy', 'Competition'],
    {
      title: 'Phân tích đối thủ mà không bị ám ảnh bởi đối thủ',
      content:
        'Trước đây mỗi lần đối thủ ra tính năng mới là team lại đổi kế hoạch. Giờ đặt quy tắc: chỉ phản ứng nếu tính năng đó giải quyết vấn đề mà khách của mình cũng đang kêu.',
    },
    130,
  ),

  // === Tài chính & Đầu tư ===
  careerPost(
    'hung.finance',
    'text',
    'ke-toan',
    ['Kế toán', 'Đóng sổ'],
    {
      content:
        'Rút thời gian đóng sổ cuối tháng từ 9 ngày xuống 4 ngày. Cách làm: đối chiếu ngân hàng hằng tuần thay vì dồn cuối tháng, và chốt danh mục hạch toán để không phải hỏi lại từng khoản.',
    },
    6,
  ),
  careerPost(
    'hung.finance',
    'note',
    'ke-toan',
    ['Kế toán', 'Thuế'],
    {
      title: 'Ba lỗi hoá đơn đầu vào hay bị loại nhất',
      content:
        'Sai mã số thuế, thiếu chữ ký số hợp lệ, và nội dung hàng hoá ghi chung chung không khớp hợp đồng. Ba lỗi này chiếm gần hết số hoá đơn bị loại khi quyết toán năm ngoái.',
    },
    47,
  ),
  careerPost(
    'hung.finance',
    'text',
    'phan-tich-tai-chinh',
    ['Tài chính', 'Dòng tiền'],
    {
      content:
        'Công ty lãi trên báo cáo nhưng suýt hết tiền mặt tháng 3. Nguyên nhân: kỳ thu tiền bình quân 74 ngày trong khi phải trả nhà cung cấp trong 30 ngày. Lãi và tiền là hai chuyện khác nhau.',
    },
    21,
  ),
  careerPost(
    'hung.finance',
    'text',
    'phan-tich-tai-chinh',
    ['Tài chính', 'Mô hình'],
    {
      content:
        'Xây mô hình dự báo 3 kịch bản thay vì 1 con số duy nhất. Ban giám đốc hỏi ít hơn hẳn, vì câu hỏi "nếu tệ hơn thì sao" đã có sẵn câu trả lời trong bảng.',
    },
    79,
  ),
  careerPost(
    'hung.finance',
    'text',
    'dau-tu-thi-truong',
    ['Đầu tư', 'Danh mục'],
    {
      content:
        'Nhìn lại 3 năm đầu tư cá nhân: phần lợi nhuận gần như đến từ việc không bán lúc thị trường giảm, chứ không phải từ việc chọn đúng mã. Ghi lại để lần sau đỡ ngứa tay.',
    },
    43,
  ),
  careerPost(
    'hung.finance',
    'question',
    'dau-tu-thi-truong',
    ['Đầu tư', 'Rủi ro'],
    {
      title: 'Người đi làm công nên để bao nhiêu phần trăm vào tài sản rủi ro?',
      content:
        'Thu nhập ổn định, quỹ dự phòng đã đủ 6 tháng chi tiêu. Mọi người phân bổ thế nào giữa gửi tiết kiệm, quỹ mở và cổ phiếu?',
      tags: ['đầu tư', 'tài chính cá nhân'],
    },
    136,
  ),

  // === Nhân sự & Lãnh đạo ===
  careerPost(
    'mai.hr',
    'text',
    'tuyen-dung-hr',
    ['Tuyển dụng', 'Phỏng vấn'],
    {
      content:
        'Bỏ vòng hỏi đố thuật toán, thay bằng buổi 90 phút cùng sửa một lỗi có thật trong codebase mẫu. Tỉ lệ ứng viên nhận offer tăng, và quan trọng hơn: không còn ai nghỉ trong 3 tháng đầu vì "công việc khác với lúc phỏng vấn".',
    },
    8,
  ),
  careerPost(
    'mai.hr',
    'note',
    'tuyen-dung-hr',
    ['Tuyển dụng', 'Tin tuyển dụng'],
    {
      title: 'Viết lại tin tuyển dụng, số hồ sơ phù hợp tăng gấp đôi',
      content:
        'Bỏ đoạn "môi trường trẻ trung năng động", thay bằng mô tả cụ thể 3 việc sẽ làm trong 90 ngày đầu và mức lương thật. Ít hồ sơ hơn 30% nhưng số hồ sơ đạt vòng đầu tăng gấp đôi.',
    },
    55,
  ),
  careerPost(
    'mai.hr',
    'text',
    'ky-nang-lanh-dao',
    ['Lãnh đạo', 'Phản hồi'],
    {
      content:
        'Lần đầu phải góp ý nghiêm khắc với một bạn giỏi hơn mình về chuyên môn. Cách làm được: nói về ảnh hưởng cụ thể tới người khác, không nói về tính cách. Buổi nói chuyện 15 phút, không ai phải phòng thủ.',
    },
    26,
  ),
  careerPost(
    'minh.engineer',
    'milestone',
    'ky-nang-lanh-dao',
    ['Lãnh đạo', 'Chuyển vai'],
    {
      title: '6 tháng đầu làm tech lead',
      items: [
        { label: 'Người trong nhóm', value: '7' },
        { label: 'Giờ code mỗi tuần', value: '6' },
        { label: '1:1 đã làm', value: '84' },
      ],
    },
    68,
  ),
  careerPost(
    'mai.hr',
    'text',
    'dao-tao-noi-bo',
    ['Đào tạo', 'Onboarding'],
    {
      content:
        'Viết lại tài liệu nhập môn theo kiểu "ngày 1 làm gì, tuần 1 làm gì" thay vì một trang danh sách công cụ. Thời gian để người mới hoàn thành task đầu tiên giảm từ 9 ngày xuống 3 ngày.',
    },
    35,
  ),
  careerPost(
    'mai.hr',
    'resource',
    'dao-tao-noi-bo',
    ['Đào tạo', 'Chia sẻ'],
    {
      content:
        'Duy trì được 14 tuần liên tục ở công ty mình, người trình bày không phải chuẩn bị quá 2 giờ.',
      resource: {
        title: 'Mẫu tổ chức buổi chia sẻ nội bộ 30 phút',
        kindLabel: 'Mẫu slide · 8 trang',
        rating: 4.5,
      },
    },
    115,
  ),

  // === Kỹ năng nền tảng ===
  careerPost(
    'linh.dev',
    'text',
    'ngoai-ngu',
    ['Ngoại ngữ', 'Tiếng Anh'],
    {
      content:
        'Đổi cách học tiếng Anh: thay vì luyện đề, mỗi ngày viết 5 câu tóm tắt việc đã làm rồi nhờ đồng nghiệp nước ngoài sửa. Sau 2 tháng, họp bằng tiếng Anh không còn phải chuẩn bị trước từng câu.',
    },
    13,
  ),
  careerPost(
    'khoa.content',
    'note',
    'ngoai-ngu',
    ['Ngoại ngữ', 'Phương pháp'],
    {
      title: 'Nghe hiểu không lên vì nghe sai loại nội dung',
      content:
        'Nghe podcast học thuật 6 tháng vẫn không hiểu đồng nghiệp nói chuyện. Chuyển sang nghe họp nội bộ đã ghi âm — cùng chủ đề, cùng từ vựng, cùng tốc độ. Ba tuần thấy khác hẳn.',
    },
    62,
  ),
  careerPost(
    'mai.hr',
    'text',
    'giao-tiep-thuyet-trinh',
    ['Giao tiếp', 'Thuyết trình'],
    {
      content:
        'Bỏ 30 slide, còn 6. Mỗi slide một câu kết luận thay vì một cái tiêu đề. Buổi báo cáo 45 phút xong trong 20 phút và ban giám đốc quyết được ngay trong buổi.',
    },
    17,
  ),
  careerPost(
    'jane.design',
    'text',
    'giao-tiep-thuyet-trinh',
    ['Giao tiếp', 'Bảo vệ ý tưởng'],
    {
      content:
        'Trình bày phương án thiết kế mà bị phản đối, trước đây mình sẽ giải thích thêm. Giờ mình hỏi lại "anh/chị đang lo điều gì sẽ xảy ra". 8/10 lần hoá ra hai bên đang nói về hai vấn đề khác nhau.',
    },
    82,
  ),
  careerPost(
    'lucas.dev',
    'text',
    'tu-duy-phan-bien',
    ['Tư duy', 'Ra quyết định'],
    {
      content:
        'Trước mỗi quyết định kỹ thuật lớn, team viết ra "điều gì phải đúng thì lựa chọn này mới hợp lý". Ba tháng sau đọc lại, thấy rõ quyết định nào sai vì giả định sai chứ không phải vì thực thi kém.',
    },
    39,
  ),
  careerPost(
    'linh.dev',
    'note',
    'tu-duy-phan-bien',
    ['Tư duy', 'Thiên kiến'],
    {
      title: 'Mình đã tin một con số suốt 4 tháng mà không kiểm tra',
      content:
        'Báo cáo nói tính năng X được 40% người dùng dùng. Hoá ra cách đếm tính cả lần render component chứ không phải lần người dùng bấm. Từ đó bất kỳ con số nào dùng để ra quyết định, mình đều hỏi "đếm thế nào".',
    },
    142,
  ),

  // === Không gắn ngành nghề -> mục "Chia sẻ chung" ===
  {
    author: 'tuananh.fe',
    kind: 'text',
    data: {
      topic: topic('Career', 'Hành trình'),
      content:
        'Ba năm trước mình còn không biết Git là gì. Hôm nay ngồi review pull request cho người khác. Không có bước nhảy nào cả, chỉ là mỗi tuần biết thêm một thứ nhỏ và không bỏ cuộc giữa chừng.',
    },
    at: hoursAgo(3),
  },
  {
    author: 'linh.dev',
    kind: 'text',
    data: {
      topic: topic('Career', 'Nghỉ ngơi'),
      content:
        'Nghỉ phép 5 ngày không mở laptop. Quay lại sửa được trong 40 phút cái bug đã ngồi 2 ngày trước khi nghỉ. Nghỉ ngơi không phải phần thưởng sau khi làm xong việc, nó là một phần của việc.',
    },
    at: hoursAgo(30),
  },
  {
    author: 'khoa.content',
    kind: 'idea',
    data: {
      topic: topic('Career', 'Thói quen'),
      content:
        'Ghi lại mỗi ngày một dòng "hôm nay học được gì". Sau một năm đọc lại thì thấy có những thứ mình tưởng mới học tuần trước, thực ra đã học rồi và quên mất.',
    },
    at: hoursAgo(57),
  },
  {
    author: 'mai.hr',
    kind: 'text',
    data: {
      topic: topic('Career', 'Chuyển việc'),
      content:
        'Từ chối một lời mời lương cao hơn 30%. Lý do: hỏi 4 người từng làm ở đó, cả 4 đều ngập ngừng khi nói về quản lý trực tiếp. Lương bù được nhiều thứ nhưng không bù được chỗ đó.',
    },
    at: hoursAgo(91),
  },
  {
    author: 'hung.finance',
    kind: 'question',
    data: {
      topic: topic('Career', 'Cân bằng'),
      title: 'Mọi người tách công việc và cuộc sống bằng cách nào khi làm từ xa?',
      content:
        'Làm ở nhà 2 năm, dạo này hay mở máy lúc 10 giờ tối vì "xem qua một chút". Có ai có ranh giới nào thực sự hiệu quả không?',
      tags: ['remote', 'cân bằng'],
    },
    at: hoursAgo(120),
  },
  {
    author: 'peter.devops',
    kind: 'text',
    data: {
      topic: topic('Career', 'Sai lầm'),
      content:
        'Xoá nhầm một bảng trên môi trường thật năm 2023. Khôi phục mất 4 tiếng. Điều duy nhất cứu mình là bản sao lưu tự động mà chính mình đã lười thiết lập suốt 3 tháng trước đó và cuối cùng vẫn làm.',
    },
    at: hoursAgo(150),
  },
];

// ---------- chu de & cuoc thi (hashtag) ----------
// CONTEST = co giai thuong/han chot; TOPIC = chu de viet bai thuong truc.
// `careerSlugs` khong luu vao DB - chi dung luc seed de chon bai nao gan vao
// contest nao cho hop chu de (va de GET /contests/:slug/related tra ve bai
// cung nganh cho co nghia).
type ContestSeed = {
  slug: string;
  hashtag: string;
  title: string;
  description: string;
  kind: 'CONTEST' | 'TOPIC';
  status: 'OPEN' | 'JUDGING' | 'CLOSED';
  partnerName?: string;
  accent: string;
  prize?: string;
  deadlineInDays?: number;
  careerSlugs: string[];
  postLimit: number;
};

const CONTESTS: ContestSeed[] = [
  {
    slug: 'cuoc-thi-system-design-2026',
    hashtag: 'CuộcThiSystemDesign2026',
    title: 'Cuộc thi System Design 2026',
    description:
      'Chia sẻ một bài toán thiết kế hệ thống bạn từng giải quyết trong công việc thật: bối cảnh, các phương án đã cân nhắc, và vì sao bạn chọn phương án cuối. Bài dự thi được ban giám khảo gồm kiến trúc sư từ 6 công ty chấm điểm.',
    kind: 'CONTEST',
    status: 'OPEN',
    partnerName: 'Viettel Digital',
    accent: '#0ea5e9',
    prize: 'Giải nhất 50.000.000đ · 3 giải nhì mỗi giải 15.000.000đ',
    deadlineInDays: 24,
    careerSlugs: ['lap-trinh-web-mobile', 'devops-ha-tang'],
    postLimit: 12,
  },
  {
    slug: 'ai-thay-doi-cong-viec-toi',
    hashtag: 'AIThayĐổiCôngViệcTôi',
    title: 'AI đã thay đổi công việc của tôi thế nào',
    description:
      'Không cần bạn là kỹ sư AI. Kể về một việc cụ thể trong ngày làm việc của bạn đã khác đi từ khi có công cụ AI — kể cả khi kết quả là bạn quyết định không dùng nữa.',
    kind: 'CONTEST',
    status: 'JUDGING',
    partnerName: 'FPT Software',
    accent: '#ec4899',
    prize: 'Giải nhất 30.000.000đ · 10 giải khuyến khích',
    deadlineInDays: -3,
    careerSlugs: ['du-lieu-ai-ml', 'quan-ly-san-pham'],
    postLimit: 10,
  },
  {
    slug: 'ngay-dau-di-lam',
    hashtag: 'NgàyĐầuĐiLàm',
    title: 'Ngày đầu đi làm',
    description:
      'Ngày đầu tiên ở công ty đầu tiên của bạn diễn ra thế nào? Bạn đã lo lắng điều gì, và điều đó có thật sự xảy ra không? Chủ đề dành cho tất cả mọi ngành nghề.',
    kind: 'TOPIC',
    status: 'OPEN',
    accent: '#f59e0b',
    careerSlugs: [],
    postLimit: 8,
  },
  {
    slug: 'viet-ve-bug-nho-doi',
    hashtag: 'ViếtVềBugNhớĐời',
    title: 'Viết về một con bug nhớ đời',
    description:
      'Con bug tốn của bạn nhiều thời gian nhất, hoặc dạy bạn nhiều nhất. Càng cụ thể về cách bạn lần ra nguyên nhân càng tốt — phần đó mới là thứ người khác học được.',
    kind: 'TOPIC',
    status: 'OPEN',
    accent: '#f43f5e',
    careerSlugs: ['lap-trinh-web-mobile', 'kiem-thu-bao-mat'],
    postLimit: 10,
  },
  {
    slug: 'portfolio-cua-toi',
    hashtag: 'PortfolioCủaTôi',
    title: 'Portfolio của tôi',
    description:
      'Giới thiệu một sản phẩm trong portfolio của bạn kèm phần khó nhất khi làm nó. Ban giám khảo đánh giá cách bạn kể về quá trình, không chỉ ảnh chụp kết quả.',
    kind: 'CONTEST',
    status: 'OPEN',
    partnerName: 'Behance Việt Nam',
    accent: '#8b5cf6',
    prize: 'Giải nhất gói thiết bị trị giá 25.000.000đ',
    deadlineInDays: 16,
    careerSlugs: ['ui-ux', 'do-hoa-thuong-hieu', 'san-xuat-noi-dung-video'],
    postLimit: 9,
  },
  {
    slug: 'tai-chinh-ca-nhan-tuoi-30',
    hashtag: 'TàiChínhCáNhânTuổi30',
    title: 'Tài chính cá nhân tuổi 30',
    description:
      'Bạn đã sắp xếp tiền bạc thế nào ở tuổi 30? Quỹ dự phòng, khoản đầu tư đầu tiên, hay một quyết định tài chính bạn ước mình làm sớm hơn. Bài viết trung thực về con số được ưu tiên.',
    kind: 'CONTEST',
    status: 'JUDGING',
    partnerName: 'Techcombank',
    accent: '#10b981',
    prize: 'Giải nhất 20.000.000đ · 5 giải phụ mỗi giải 3.000.000đ',
    deadlineInDays: -8,
    careerSlugs: ['dau-tu-thi-truong', 'phan-tich-tai-chinh', 'ke-toan'],
    postLimit: 8,
  },
  {
    slug: 'hoc-ngoai-ngu-moi-ngay',
    hashtag: 'HọcNgoạiNgữMỗiNgày',
    title: 'Học ngoại ngữ mỗi ngày',
    description:
      'Cách bạn duy trì việc học ngoại ngữ khi đi làm bận rộn. Chia sẻ phương pháp thật đã dùng được ít nhất một tháng, kể cả phương pháp thất bại.',
    kind: 'TOPIC',
    status: 'OPEN',
    accent: '#22d3ee',
    careerSlugs: ['ngoai-ngu', 'giao-tiep-thuyet-trinh'],
    postLimit: 6,
  },
  {
    slug: 'lan-dau-lam-lead',
    hashtag: 'LầnĐầuLàmLead',
    title: 'Lần đầu làm lead',
    description:
      'Chuyển từ người làm chuyên môn sang người dẫn dắt là một cú sốc ít ai nói trước. Kể về giai đoạn đầu của bạn: điều gì khó hơn tưởng tượng, điều gì dễ hơn?',
    kind: 'TOPIC',
    status: 'JUDGING',
    accent: '#6366f1',
    careerSlugs: ['ky-nang-lanh-dao', 'quan-ly-du-an', 'dao-tao-noi-bo'],
    postLimit: 7,
  },
  {
    slug: 'chuyen-nganh-sang-it',
    hashtag: 'ChuyểnNgànhSangIT',
    title: 'Chuyển ngành sang IT',
    description:
      'Dành cho những người bắt đầu từ một ngành khác. Bạn đã học lại từ đâu, mất bao lâu để có công việc đầu tiên, và điều gì từ ngành cũ hoá ra lại là lợi thế?',
    kind: 'CONTEST',
    status: 'CLOSED',
    partnerName: 'TopCV',
    accent: '#a855f7',
    prize: 'Đã trao 12 giải · Tổng giá trị 80.000.000đ',
    deadlineInDays: -45,
    careerSlugs: ['lap-trinh-web-mobile', 'tuyen-dung-hr'],
    postLimit: 9,
  },
  {
    slug: 'review-cong-cu-lam-viec',
    hashtag: 'ReviewCôngCụLàmViệc',
    title: 'Review công cụ làm việc',
    description:
      'Một công cụ bạn dùng hằng ngày: nó giải quyết việc gì, giá bao nhiêu, và điểm nào khiến bạn suýt bỏ. Không nhận bài quảng cáo.',
    kind: 'TOPIC',
    status: 'OPEN',
    accent: '#38bdf8',
    careerSlugs: ['van-hanh-quy-trinh', 'digital-marketing', 'devops-ha-tang'],
    postLimit: 8,
  },
  {
    slug: 'san-pham-dau-tay',
    hashtag: 'SảnPhẩmĐầuTay',
    title: 'Sản phẩm đầu tay',
    description:
      'Sản phẩm đầu tiên bạn tự làm và đưa ra cho người khác dùng. Bao nhiêu người dùng thật, bạn học được gì, và bây giờ nó còn sống không?',
    kind: 'CONTEST',
    status: 'CLOSED',
    partnerName: 'Shopee Tech',
    accent: '#fb7185',
    prize: 'Đã trao 5 giải · Giải nhất 40.000.000đ',
    deadlineInDays: -60,
    careerSlugs: ['quan-ly-san-pham', 'lap-trinh-web-mobile', 'chien-luoc'],
    postLimit: 7,
  },
  {
    slug: 'mot-ngay-cua-toi',
    hashtag: 'MộtNgàyCủaTôi',
    title: 'Một ngày làm việc của tôi',
    description:
      'Mô tả một ngày làm việc bình thường của bạn theo giờ. Chủ đề này giúp người ngoài ngành hiểu công việc của bạn thật sự gồm những gì.',
    kind: 'TOPIC',
    status: 'OPEN',
    accent: '#eab308',
    careerSlugs: ['social-media', 'ban-hang', 'viet-bien-tap'],
    postLimit: 8,
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

  // --- Category nghe nghiep 2 tang: upsert theo slug (idempotent) ---
  const careerSlugToId = new Map<string, string>();
  for (const [groupIndex, group] of CAREER_TAXONOMY.entries()) {
    const groupRow = await prisma.careerCategoryGroup.upsert({
      where: { slug: group.slug },
      update: { name: group.name, icon: group.icon, orderIndex: groupIndex },
      create: {
        slug: group.slug,
        name: group.name,
        icon: group.icon,
        orderIndex: groupIndex,
      },
    });
    for (const [catIndex, category] of group.categories.entries()) {
      const categoryRow = await prisma.careerCategory.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          orderIndex: catIndex,
          groupId: groupRow.id,
        },
        create: {
          slug: category.slug,
          name: category.name,
          orderIndex: catIndex,
          groupId: groupRow.id,
        },
      });
      careerSlugToId.set(category.slug, categoryRow.id);
    }
  }
  console.log(
    `Career taxonomy: ${CAREER_TAXONOMY.length} groups / ${careerSlugToId.size} categories`,
  );

  const allPosts = [
    ...POSTS,
    ...POSTS_BY_CATEGORY,
    ...POSTS_BY_NEW_TOPIC,
    ...POSTS_BY_CAREER,
  ];
  // Giu lai id bai da tao de con noi vao contest o buoc sau, kem nganh nghe
  // cua no de chon bai cho dung chu de tung contest.
  const createdPosts: { id: string; careerCategoryId: string | null }[] = [];

  for (const [index, post] of allPosts.entries()) {
    const authorId = usernameToId.get(post.author);
    if (!authorId) throw new Error(`Khong tim thay tac gia ${post.author}`);

    // Nganh nghe: uu tien slug gan tay tren tung bai, khong co thi suy tu
    // topic Knowledge World (`category`). Van khong ra thi de null - bai do
    // thuoc muc "Chia se chung".
    const careerSlug =
      post.careerCategory ??
      (post.category ? CAREER_BY_POST_CATEGORY[post.category] : undefined);
    if (careerSlug && !careerSlugToId.has(careerSlug)) {
      throw new Error(`Career category khong ton tai: ${careerSlug}`);
    }
    const careerCategoryId = careerSlug
      ? (careerSlugToId.get(careerSlug) ?? null)
      : null;

    // Them coverImage cho moi kind CHUA co anh that san (xem
    // NATIVE_IMAGE_KINDS) - lay topic.path lam seed picsum de anh lien quan
    // (tuong doi) toi chu de bai dang thay vi hoan toan ngau nhien.
    const topicData = (post.data as { topic?: { path?: string[] } }).topic;
    const data = NATIVE_IMAGE_KINDS.has(post.kind)
      ? post.data
      : {
          ...post.data,
          coverImage: buildCoverImageSeed(topicData?.path, index),
        };

    const created = await prisma.post.create({
      data: {
        authorId,
        kind: toDbKind(post.kind),
        category: post.category,
        careerCategoryId,
        data: data as Prisma.InputJsonValue,
        likesCount: 3 + Math.floor(Math.random() * 340),
        commentsCount: Math.floor(Math.random() * 45),
        repostsCount: Math.floor(Math.random() * 20),
        createdAt: post.at,
        updatedAt: post.at,
      },
      select: { id: true, careerCategoryId: true },
    });
    createdPosts.push(created);
  }

  console.log(
    `Seeded ${allPosts.length} posts across ${PERSONAS.length + 1} authors.`,
  );

  // --- Chu de & cuoc thi (hashtag) ---
  // Upsert theo slug roi xoa het lien ket cu cua chinh contest do truoc khi
  // noi lai - chay lai script khong nhan doi PostContest.
  for (const contest of CONTESTS) {
    const row = await prisma.contest.upsert({
      where: { slug: contest.slug },
      update: {
        hashtag: contest.hashtag,
        title: contest.title,
        description: contest.description,
        kind: contest.kind,
        status: contest.status,
        partnerName: contest.partnerName ?? null,
        coverImageUrl: `https://picsum.photos/seed/contest-${contest.slug}/1600/500`,
        accent: contest.accent,
        prize: contest.prize ?? null,
        deadline:
          contest.deadlineInDays === undefined
            ? null
            : daysAgo(-contest.deadlineInDays),
      },
      create: {
        slug: contest.slug,
        hashtag: contest.hashtag,
        title: contest.title,
        description: contest.description,
        kind: contest.kind,
        status: contest.status,
        partnerName: contest.partnerName ?? null,
        coverImageUrl: `https://picsum.photos/seed/contest-${contest.slug}/1600/500`,
        accent: contest.accent,
        prize: contest.prize ?? null,
        deadline:
          contest.deadlineInDays === undefined
            ? null
            : daysAgo(-contest.deadlineInDays),
      },
    });

    await prisma.postContest.deleteMany({ where: { contestId: row.id } });

    // Chon bai cho dung chu de: uu tien bai thuoc cac nganh nghe cua contest,
    // thieu thi bu bang bai bat ky (chu de chung nhu #NgàyĐầuĐiLàm khong gan
    // nganh nao nen luon roi vao nhanh nay).
    const targetIds = new Set(
      contest.careerSlugs
        .map((slug) => careerSlugToId.get(slug))
        .filter((id): id is string => Boolean(id)),
    );
    const matched = createdPosts.filter(
      (p) => p.careerCategoryId && targetIds.has(p.careerCategoryId),
    );
    const fallback = createdPosts.filter((p) => !matched.includes(p));
    const picked = [...matched, ...fallback].slice(0, contest.postLimit);

    await prisma.postContest.createMany({
      data: picked.map((p) => ({ postId: p.id, contestId: row.id })),
      skipDuplicates: true,
    });
    await prisma.contest.update({
      where: { id: row.id },
      data: { postCount: picked.length },
    });
  }

  console.log(`Seeded ${CONTESTS.length} contests/topics with post links.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
