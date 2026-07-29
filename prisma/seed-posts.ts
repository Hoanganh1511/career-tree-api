import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/prisma/client';
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

  for (const post of POSTS) {
    const authorId = usernameToId.get(post.author);
    if (!authorId) throw new Error(`Khong tim thay tac gia ${post.author}`);
    await prisma.post.create({
      data: {
        authorId,
        kind: toDbKind(post.kind),
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
    `Seeded ${POSTS.length} posts across ${PERSONAS.length + 1} authors.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
