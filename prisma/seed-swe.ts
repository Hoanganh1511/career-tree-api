import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  CardKind,
  ResourceType,
} from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ---------- helpers ----------

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function doc(...paragraphs: string[]) {
  return {
    type: 'doc',
    content: paragraphs.map((text) => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    })),
  };
}

type CardSeed = { text: string; kind: CardKind; daysAgo: number };
type ResourceSeed = { type: ResourceType; title: string; url: string };
type IssueSeed = { question: string; resolved: boolean };

type LeafSeed = {
  title: string;
  goal: string;
  content: string[];
  cards: CardSeed[];
  resources: ResourceSeed[];
  issues: IssueSeed[];
};

type BranchSeed = {
  title: string;
  goal: string;
  content: string[];
  children: (LeafSeed | BranchSeed)[];
};

function isBranch(n: LeafSeed | BranchSeed): n is BranchSeed {
  return Array.isArray((n as BranchSeed).children);
}

// ---------- data ----------

const TREE: BranchSeed = {
  title: 'Lộ trình phát triển Software Engineer',
  goal: 'Trở thành Senior Software Engineer trong 2 năm tới — vững cả chiều rộng (fullstack) lẫn chiều sâu (system design, distributed systems).',
  content: [
    'Cây này ghi lại toàn bộ quá trình học tập và làm việc trong 3 năm qua với vai trò Software Engineer, chủ yếu backend/fullstack với Node.js và React.',
    'Mục tiêu 2 năm tới: lên Senior, dẫn dắt được 1 module lớn end-to-end, tự tin phỏng vấn system design.',
  ],
  children: [
    {
      title: 'Backend Engineering',
      goal: 'Thành thạo thiết kế và vận hành backend service ở quy mô production, không chỉ code chạy được mà còn chịu tải, dễ bảo trì.',
      content: [
        'Trục kỹ năng chính trong công việc hàng ngày. Đa số dự án công ty dùng NestJS + PostgreSQL.',
      ],
      children: [
        {
          title: 'Node.js & NestJS',
          goal: 'Nắm vững kiến trúc NestJS (DI, module, pipe, guard, interceptor) và áp dụng đúng chỗ trong dự án thực tế, không lạm dụng.',
          content: [
            'NestJS là framework chính dùng ở công ty từ năm thứ 2. Trước đó dùng Express thuần.',
            'Điểm mạnh: cấu trúc rõ ràng, DI container tốt cho testing. Điểm cần lưu ý: dễ over-engineer với quá nhiều layer nếu team nhỏ.',
          ],
          cards: [
            { text: 'Refactor UserModule sang dùng custom provider thay vì inject trực tiếp PrismaService ở mọi nơi — dễ mock hơn khi viết unit test.', kind: 'NOTE', daysAgo: 640 },
            { text: 'Viết lại AuthGuard dùng CanActivate thay vì middleware cũ, xử lý được cả GraphQL context lẫn REST.', kind: 'PRACTICE', daysAgo: 610 },
            { text: 'Đọc lại NestJS execution context docs — hiểu ra Interceptor chạy được cả trước và sau handler (giống middleware kiểu onion), khác Guard chỉ chạy trước.', kind: 'NOTE', daysAgo: 520 },
            { text: 'Setup ValidationPipe global với whitelist:true + forbidNonWhitelisted — bắt được vài chỗ FE gửi thừa field mà trước giờ không biết.', kind: 'PRACTICE', daysAgo: 400 },
          ],
          resources: [
            { type: 'DOC', title: 'NestJS — Custom providers', url: 'https://docs.nestjs.com/fundamentals/custom-providers' },
            { type: 'ARTICLE', title: 'Bulletproof Node.js Architecture', url: 'https://softwareontheroad.com/ideal-nodejs-project-structure/' },
            { type: 'DOC', title: 'NestJS — Execution context', url: 'https://docs.nestjs.com/fundamentals/execution-context' },
          ],
          issues: [
            { question: 'Chưa rõ khi nào nên dùng Interceptor vs Middleware vs Guard cho từng use-case cụ thể (logging, auth, transform response).', resolved: true },
            { question: 'Circular dependency giữa AuthModule và UserModule khi cả hai đều cần inject lẫn nhau — đang tạm dùng forwardRef(), chưa chắc là cách hay nhất.', resolved: false },
          ],
        },
        {
          title: 'Dependency Injection sâu',
          goal: 'Hiểu cơ chế DI container của NestJS đủ sâu để debug được khi có lỗi resolve provider phức tạp.',
          content: [
            'Đào sâu sau khi gặp bug "Nest can not resolve dependencies" nhiều lần ở các module lớn.',
          ],
          cards: [
            { text: 'Note lại thứ tự resolve: Nest build dependency graph lúc bootstrap, lỗi resolve thường do thiếu @Injectable() hoặc thiếu module export.', kind: 'NOTE', daysAgo: 500 },
            { text: 'Thử tạo custom scope REQUEST cho 1 provider cần chứa request-specific data (tenantId) — thấy performance giảm nhẹ vì tạo instance mới mỗi request.', kind: 'PRACTICE', daysAgo: 480 },
          ],
          resources: [
            { type: 'DOC', title: 'NestJS — Injection scopes', url: 'https://docs.nestjs.com/fundamentals/injection-scopes' },
          ],
          issues: [],
        },
        {
          title: 'Testing với Jest',
          goal: 'Viết unit test + e2e test có ý nghĩa, không chỉ để tăng coverage.',
          content: [
            'Công ty yêu cầu coverage tối thiểu 70% cho service layer trước khi merge.',
          ],
          cards: [
            { text: 'Setup jest-mock-extended để mock PrismaService gọn hơn thay vì tự viết mock class tay.', kind: 'PRACTICE', daysAgo: 300 },
            { text: 'Viết e2e test cho luồng checkout — phát hiện race condition khi 2 request giảm tồn kho cùng lúc, chưa lock đúng.', kind: 'PRACTICE', daysAgo: 250 },
            { text: 'Đọc về test pyramid — nhận ra team đang viết quá nhiều e2e test chậm, nên chuyển bớt xuống unit test.', kind: 'NOTE', daysAgo: 240 },
          ],
          resources: [
            { type: 'DOC', title: 'NestJS — Testing', url: 'https://docs.nestjs.com/fundamentals/testing' },
            { type: 'ARTICLE', title: 'The Testing Pyramid', url: 'https://martinfowler.com/articles/practical-test-pyramid.html' },
          ],
          issues: [
            { question: 'E2E test suite chạy 8 phút, chậm CI — chưa tìm được cách chạy song song an toàn với DB dùng chung.', resolved: false },
          ],
        },
        {
          title: 'Database & SQL',
          goal: 'Thiết kế schema chuẩn hoá hợp lý, viết query hiệu quả, hiểu rõ index và transaction.',
          content: [
            'PostgreSQL là DB chính. Trước đây quen MySQL hồi mới ra trường, chuyển sang Postgres từ công ty thứ 2.',
          ],
          cards: [
            { text: 'So sánh EXPLAIN ANALYZE trước/sau khi thêm composite index (workspaceId, parentId) cho bảng Node — query list tree nhanh hơn ~15 lần.', kind: 'PRACTICE', daysAgo: 200 },
            { text: 'Học lại 3 dạng chuẩn hoá (1NF-3NF) — áp dụng để tách bảng OrderItem ra khỏi Order thay vì lưu JSON array.', kind: 'NOTE', daysAgo: 700 },
          ],
          resources: [
            { type: 'BOOK', title: 'Designing Data-Intensive Applications', url: 'https://dataintensive.net/' },
          ],
          issues: [],
        },
        {
          title: 'PostgreSQL Indexing',
          goal: 'Đọc được query plan và biết khi nào cần thêm/bỏ index.',
          content: [],
          cards: [
            { text: 'Ghi chú: B-tree index mặc định tốt cho equality/range, cần GIN index riêng cho tìm kiếm trong JSONB column.', kind: 'NOTE', daysAgo: 190 },
            { text: 'Thử thêm GIN index cho cột content (JSONB) của bảng Node để search full-text — chưa dùng vì chưa có yêu cầu search thật.', kind: 'PRACTICE', daysAgo: 180 },
          ],
          resources: [
            { type: 'DOC', title: 'PostgreSQL — Index Types', url: 'https://www.postgresql.org/docs/current/indexes-types.html' },
            { type: 'VIDEO', title: 'Use The Index, Luke!', url: 'https://use-the-index-luke.com/' },
          ],
          issues: [
            { question: 'Chưa chắc index composite (a,b) có tận dụng được khi query chỉ filter theo b — cần đọc lại phần leftmost prefix rule.', resolved: true },
          ],
        },
        {
          title: 'Prisma ORM',
          goal: 'Dùng Prisma hiệu quả — biết khi nào raw query tốt hơn, tránh N+1.',
          content: [],
          cards: [
            { text: 'Phát hiện N+1 query khi load workspace tree kèm cardCount cho từng node — sửa bằng groupBy thay vì loop include.', kind: 'PRACTICE', daysAgo: 30 },
            { text: 'Đọc docs về cursor-based pagination trong Prisma — áp dụng cho API list card thay vì offset pagination cũ (chậm dần khi data lớn).', kind: 'NOTE', daysAgo: 25 },
          ],
          resources: [
            { type: 'DOC', title: 'Prisma — Pagination', url: 'https://www.prisma.io/docs/orm/prisma-client/queries/pagination' },
          ],
          issues: [],
        },
        {
          title: 'System Design',
          goal: 'Thiết kế được hệ thống chịu tải cao: caching, queue, load balancing, sharding cơ bản.',
          content: [
            'Bắt đầu học nghiêm túc từ ~6 tháng gần đây để chuẩn bị phỏng vấn Senior. Trước đó chỉ biết lý thuyết sơ sài.',
          ],
          cards: [
            { text: 'Vẽ lại kiến trúc hệ thống notification hiện tại của công ty — nhận ra đang thiếu queue, gửi email đồng bộ trong request khiến API chậm.', kind: 'NOTE', daysAgo: 90 },
            { text: 'Đề xuất thêm BullMQ cho notification queue trong buổi kỹ thuật — được chấp nhận, đang triển khai.', kind: 'PRACTICE', daysAgo: 80 },
          ],
          resources: [
            { type: 'COURSE', title: 'Grokking the System Design Interview', url: 'https://www.designgurus.io/course/grokking-the-system-design-interview' },
            { type: 'VIDEO', title: 'System Design Interview — playlist', url: 'https://www.youtube.com/c/SystemDesignInterview' },
          ],
          issues: [
            { question: 'Chưa tự tin ước lượng capacity (QPS, storage) trong buổi phỏng vấn — cần luyện thêm bài tập ước lượng.', resolved: false },
          ],
        },
        {
          title: 'Caching Strategies (Redis)',
          goal: 'Hiểu rõ cache-aside, write-through, write-behind và khi nào dùng cái nào.',
          content: [],
          cards: [
            { text: 'Thêm Redis cache-aside cho API getWorkspaceTree — giảm p95 latency từ 220ms xuống 40ms cho request lặp lại.', kind: 'PRACTICE', daysAgo: 60 },
            { text: 'Note: phải xử lý cache invalidation khi update node — quên mất 1 chỗ revalidate lúc đầu, dữ liệu stale ~5 phút.', kind: 'NOTE', daysAgo: 58 },
          ],
          resources: [
            { type: 'ARTICLE', title: 'Caching Strategies and How to Choose the Right One', url: 'https://codeahoy.com/2017/08/11/caching-strategies-and-how-to-choose-the-right-one/' },
          ],
          issues: [
            { question: 'Cache invalidation cho tree structure phức tạp hơn dự kiến khi node có thể bị move sang parent khác — chưa có giải pháp gọn.', resolved: false },
          ],
        },
        {
          title: 'Message Queue (Kafka/RabbitMQ)',
          goal: 'Hiểu cơ bản producer/consumer, delivery guarantee, và khi nào cần MQ thay vì gọi API trực tiếp.',
          content: [],
          cards: [
            { text: 'Setup RabbitMQ local bằng Docker, thử publish/consume message đơn giản với amqplib.', kind: 'PRACTICE', daysAgo: 45 },
            { text: 'Đọc về sự khác nhau giữa at-least-once và exactly-once delivery — hiểu vì sao consumer cần idempotent.', kind: 'NOTE', daysAgo: 40 },
          ],
          resources: [
            { type: 'DOC', title: 'RabbitMQ Tutorials', url: 'https://www.rabbitmq.com/tutorials' },
          ],
          issues: [],
        },
        {
          title: 'API Design',
          goal: 'Thiết kế REST API rõ ràng, versioning hợp lý, backward-compatible khi thay đổi.',
          content: [
            'Team hiện chỉ dùng REST, chưa có nhu cầu GraphQL thật sự dù đã đọc qua.',
          ],
          cards: [
            { text: 'Chuẩn hoá lại convention response error trong toàn bộ API — dùng chung 1 format {statusCode, message, error} qua ExceptionFilter.', kind: 'PRACTICE', daysAgo: 350 },
            { text: 'Đọc về Richardson Maturity Model — nhận ra API hiện tại mới ở level 2, chưa dùng HATEOAS (thấy cũng không thật sự cần).', kind: 'NOTE', daysAgo: 340 },
          ],
          resources: [
            { type: 'ARTICLE', title: 'REST API Design Best Practices', url: 'https://swagger.io/resources/articles/best-practices-in-api-design/' },
          ],
          issues: [],
        },
      ],
    },
    {
      title: 'Frontend Engineering',
      goal: 'Xây dựng UI production-grade, hiệu năng tốt, dễ bảo trì — không chỉ "làm cho chạy".',
      content: ['Bắt đầu làm frontend nghiêm túc hơn từ năm thứ 2, trước đó chủ yếu backend.'],
      children: [
        {
          title: 'React & Next.js',
          goal: 'Thành thạo App Router, Server Components, và tối ưu performance thực tế.',
          content: ['Migrate 1 dự án từ Pages Router sang App Router năm ngoái — rút ra nhiều bài học.'],
          cards: [
            { text: 'Note: Server Component không thể dùng hook/state, nhưng có thể fetch data trực tiếp async — bỏ được nhiều loading spinner thừa.', kind: 'NOTE', daysAgo: 150 },
            { text: 'Migrate trang danh sách sản phẩm sang Server Component, giảm bundle JS gửi về client ~35%.', kind: 'PRACTICE', daysAgo: 140 },
          ],
          resources: [
            { type: 'DOC', title: 'Next.js — Server Components', url: 'https://nextjs.org/docs/app/building-your-application/rendering/server-components' },
          ],
          issues: [
            { question: 'Chưa rõ ranh giới nên đặt "use client" ở component cha hay chỉ ở leaf component nhỏ nhất để tối ưu bundle.', resolved: true },
          ],
        },
        {
          title: 'Server Components & App Router',
          goal: 'Hiểu sâu ranh giới client/server boundary và data-fetching pattern mới.',
          content: [],
          cards: [
            { text: 'Thử Parallel Routes (@slot) để tránh flash sai UI khi chuyển route — áp dụng thành công cho header của career-tree-api project cá nhân.', kind: 'PRACTICE', daysAgo: 20 },
          ],
          resources: [
            { type: 'DOC', title: 'Next.js — Parallel Routes', url: 'https://nextjs.org/docs/app/building-your-application/routing/parallel-routes' },
          ],
          issues: [],
        },
        {
          title: 'Performance Optimization',
          goal: 'Đo và cải thiện Core Web Vitals cho sản phẩm thật, không chỉ tối ưu lý thuyết.',
          content: [],
          cards: [
            { text: 'Dùng Lighthouse audit trang chủ — LCP 4.2s do ảnh hero không optimize, chuyển sang next/image giảm còn 1.8s.', kind: 'PRACTICE', daysAgo: 170 },
            { text: 'Đọc về code-splitting tự động của Next.js theo route — hiểu vì sao không cần tự làm React.lazy thủ công như trước.', kind: 'NOTE', daysAgo: 160 },
          ],
          resources: [
            { type: 'ARTICLE', title: 'Web Vitals', url: 'https://web.dev/articles/vitals' },
          ],
          issues: [],
        },
        {
          title: 'TypeScript nâng cao',
          goal: 'Dùng generic, utility type, discriminated union để code an toàn hơn thay vì lạm dụng any.',
          content: [
            'Trước đây hay dùng any khi gấp deadline — đang cố sửa thói quen này.',
          ],
          cards: [
            { text: 'Refactor 1 hàm xử lý response API dùng discriminated union {status:"ok"|"error"} thay vì optional field rời rạc — bắt lỗi sớm hơn ở compile-time.', kind: 'PRACTICE', daysAgo: 220 },
            { text: 'Học generic constraint <T extends {id: string}> để viết hàm findById dùng chung cho nhiều entity.', kind: 'NOTE', daysAgo: 210 },
          ],
          resources: [
            { type: 'DOC', title: 'TypeScript Handbook — Generics', url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html' },
          ],
          issues: [],
        },
        {
          title: 'State Management',
          goal: 'Chọn đúng công cụ quản lý state theo scope (local/server/global) thay vì mặc định Redux cho mọi thứ.',
          content: [],
          cards: [
            { text: 'Bỏ Redux cho phần data từ server, chuyển sang React Query — code ngắn hơn hẳn, tự có cache/refetch.', kind: 'PRACTICE', daysAgo: 380 },
            { text: 'Note: Context API dễ gây re-render thừa nếu để state đổi liên tục ở Provider cao — nên tách nhỏ context theo domain.', kind: 'NOTE', daysAgo: 370 },
          ],
          resources: [
            { type: 'DOC', title: 'TanStack Query', url: 'https://tanstack.com/query/latest' },
          ],
          issues: [],
        },
      ],
    },
    {
      title: 'DevOps & Cloud',
      goal: 'Tự tin deploy, giám sát, và scale hệ thống trên cloud mà không cần nhờ DevOps team cho việc cơ bản.',
      content: ['Công ty dùng AWS + Docker. Team không có DevOps riêng nên dev phải tự lo phần này.'],
      children: [
        {
          title: 'Docker & Kubernetes',
          goal: 'Viết Dockerfile tối ưu, hiểu cơ bản K8s (pod, deployment, service) để đọc hiểu file config có sẵn.',
          content: [],
          cards: [
            { text: 'Multi-stage build cho NestJS app — giảm image size từ 1.2GB xuống 180MB.', kind: 'PRACTICE', daysAgo: 130 },
            { text: 'Đọc về liveness/readiness probe trong K8s — hiểu vì sao pod cứ bị restart do healthcheck sai path.', kind: 'NOTE', daysAgo: 100 },
          ],
          resources: [
            { type: 'DOC', title: 'Docker — Multi-stage builds', url: 'https://docs.docker.com/build/building/multi-stage/' },
            { type: 'COURSE', title: 'Kubernetes for Developers', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/' },
          ],
          issues: [
            { question: 'Chưa tự tin viết Helm chart từ đầu, hiện chỉ sửa được file có sẵn.', resolved: false },
          ],
        },
        {
          title: 'CI/CD',
          goal: 'Thiết lập pipeline build/test/deploy tự động, giảm thao tác tay khi release.',
          content: [],
          cards: [
            { text: 'Viết GitHub Actions workflow: lint + test + build image + push registry, chạy song song job lint/test để giảm thời gian.', kind: 'PRACTICE', daysAgo: 260 },
            { text: 'Thêm cache cho node_modules trong CI — giảm thời gian build từ 6 phút xuống 2 phút.', kind: 'PRACTICE', daysAgo: 255 },
          ],
          resources: [
            { type: 'DOC', title: 'GitHub Actions — Caching dependencies', url: 'https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows' },
          ],
          issues: [],
        },
        {
          title: 'AWS Fundamentals',
          goal: 'Hiểu các service cốt lõi (EC2, RDS, S3, ECS) đủ để tự deploy và debug sự cố cơ bản.',
          content: [
            'Học để thi AWS Certified Developer Associate, dự kiến thi trong 3 tháng tới.',
          ],
          cards: [
            { text: 'Setup RDS Postgres + security group cho app EC2 — mất nửa buổi vì quên mở port trong security group.', kind: 'PRACTICE', daysAgo: 110 },
            { text: 'Đọc về sự khác nhau giữa ECS Fargate và EC2-backed — chọn Fargate cho service nhỏ để đỡ quản lý server.', kind: 'NOTE', daysAgo: 105 },
          ],
          resources: [
            { type: 'COURSE', title: 'AWS Certified Developer - Associate', url: 'https://aws.amazon.com/certification/certified-developer-associate/' },
          ],
          issues: [
            { question: 'Chưa rõ pricing model của NAT Gateway — tháng trước bill tăng bất thường, đang tìm hiểu nguyên nhân.', resolved: false },
          ],
        },
      ],
    },
    {
      title: 'Computer Science Fundamentals',
      goal: 'Củng cố nền tảng CS để pass vòng phỏng vấn Senior và thiết kế thuật toán hiệu quả trong công việc thực tế.',
      content: [
        'Ôn lại nghiêm túc từ 2 tháng nay để chuẩn bị phỏng vấn nhảy việc lên Senior.',
      ],
      children: [
        {
          title: 'Data Structures & Algorithms',
          goal: 'Giải được bài Medium trong 25 phút, Hard trong 45 phút.',
          content: [],
          cards: [
            { text: 'Ôn lại Big-O cho các thao tác cơ bản trên HashMap, Array, LinkedList, Tree — quên khá nhiều so với hồi đại học.', kind: 'NOTE', daysAgo: 60 },
          ],
          resources: [
            { type: 'BOOK', title: 'Cracking the Coding Interview', url: 'https://www.crackingthecodinginterview.com/' },
          ],
          issues: [],
        },
        {
          title: 'LeetCode - Arrays & Strings',
          goal: 'Thành thạo kỹ thuật two-pointer, sliding window, prefix sum.',
          content: [],
          cards: [
            { text: 'Giải "Longest Substring Without Repeating Characters" bằng sliding window + Set — mất 3 lần thử mới tối ưu đúng O(n).', kind: 'PRACTICE', daysAgo: 55 },
            { text: 'Giải "Two Sum II" bằng two-pointer trên mảng đã sort — nhanh hơn hẳn cách dùng HashMap của "Two Sum" gốc.', kind: 'PRACTICE', daysAgo: 50 },
            { text: 'Note: sliding window co giãn (variable size) khác window cố định — cần điều kiện dừng rõ ràng để tránh vòng lặp vô hạn.', kind: 'NOTE', daysAgo: 48 },
          ],
          resources: [
            { type: 'ARTICLE', title: 'Sliding Window Technique', url: 'https://leetcode.com/discuss/study-guide/1773891/sliding-window-technique-and-two-pointer' },
          ],
          issues: [
            { question: 'Vẫn hay nhầm khi nào dùng sliding window co giãn vs cố định — cần làm thêm 5-10 bài nữa để quen pattern.', resolved: false },
          ],
        },
        {
          title: 'LeetCode - Graph & DP',
          goal: 'Nhận diện được bài toán DP qua đề bài, dựng đúng state và transition.',
          content: [],
          cards: [
            { text: 'Giải "Course Schedule" bằng topological sort (BFS Kahn\'s algorithm) — lần đầu tự code được không xem lời giải.', kind: 'PRACTICE', daysAgo: 35 },
            { text: 'Thử "Coin Change" — làm sai đệ quy thường (TLE), sửa lại bằng bottom-up DP với mảng dp[amount+1].', kind: 'PRACTICE', daysAgo: 30 },
          ],
          resources: [
            { type: 'VIDEO', title: 'Dynamic Programming — playlist', url: 'https://www.youtube.com/playlist?list=PLot-Xpze53le35pTA9SNq3ryPEWpDSw6R' },
          ],
          issues: [
            { question: 'DP trên cây (tree DP) vẫn còn yếu — chưa làm bài nào tự tin hoàn toàn.', resolved: false },
          ],
        },
        {
          title: 'Design Patterns',
          goal: 'Nhận diện và áp dụng đúng pattern khi cần, tránh áp dụng pattern chỉ vì "cho giống sách".',
          content: [],
          cards: [
            { text: 'Áp dụng Strategy pattern cho phần tính phí ship (nhiều nhà vận chuyển khác nhau) thay vì if-else dài.', kind: 'PRACTICE', daysAgo: 320 },
            { text: 'Đọc lại Factory pattern — nhận ra trước đây dùng hơi thừa cho trường hợp chỉ có 1 loại object, làm code phức tạp không cần thiết.', kind: 'NOTE', daysAgo: 310 },
          ],
          resources: [
            { type: 'DOC', title: 'Refactoring.Guru — Design Patterns', url: 'https://refactoring.guru/design-patterns' },
          ],
          issues: [],
        },
      ],
    },
    {
      title: 'Soft Skills & Career Growth',
      goal: 'Phát triển kỹ năng mềm cần thiết để tiến lên vai trò Senior/Lead, không chỉ giỏi code.',
      content: [
        'Nhận ra từ năm thứ 2 rằng kỹ năng mềm quyết định phần lớn việc lên level, không chỉ năng lực kỹ thuật.',
      ],
      children: [
        {
          title: 'Code Review',
          goal: 'Review code mang tính xây dựng, tập trung vào vấn đề quan trọng thay vì bắt bẻ style.',
          content: [],
          cards: [
            { text: 'Học cách comment review theo dạng câu hỏi ("Bạn nghĩ sao nếu...") thay vì ra lệnh — giảm hẳn phản ứng phòng thủ từ người được review.', kind: 'NOTE', daysAgo: 180 },
            { text: 'Thử dùng checklist review riêng (security, performance, test coverage) trước khi approve PR lớn.', kind: 'PRACTICE', daysAgo: 175 },
          ],
          resources: [
            { type: 'ARTICLE', title: 'How to Do Code Reviews Like a Human', url: 'https://mtlynch.io/human-code-reviews-1/' },
          ],
          issues: [],
        },
        {
          title: 'Mentoring & Leadership',
          goal: 'Hướng dẫn được 1 intern/fresher hoàn thành task độc lập trong 1 sprint.',
          content: [
            'Bắt đầu mentor 1 bạn intern từ 4 tháng trước — trải nghiệm đầu tiên dẫn dắt người khác.',
          ],
          cards: [
            { text: 'Nhận ra hay giải bài giúp intern quá nhanh thay vì để bạn tự vật lộn — điều chỉnh lại, chỉ gợi ý hướng đi.', kind: 'NOTE', daysAgo: 90 },
            { text: 'Setup buổi 1-1 hàng tuần 30 phút với intern để track tiến độ và gỡ block sớm.', kind: 'PRACTICE', daysAgo: 85 },
          ],
          resources: [
            { type: 'ARTICLE', title: 'The Manager\'s Path (excerpt on mentoring)', url: 'https://www.oreilly.com/library/view/the-managers-path/9781491973882/' },
          ],
          issues: [
            { question: 'Chưa biết cách feedback khi intern lặp lại lỗi cũ nhiều lần mà không làm bạn nản.', resolved: false },
          ],
        },
        {
          title: 'Technical Writing',
          goal: 'Viết tài liệu kỹ thuật (RFC, design doc) rõ ràng để người khác đọc hiểu mà không cần hỏi lại.',
          content: [],
          cards: [
            { text: 'Viết design doc đầu tiên cho việc tách notification service — dùng template có sẵn: Context, Goals, Non-goals, Proposal, Alternatives.', kind: 'PRACTICE', daysAgo: 75 },
            { text: 'Học cách viết "Non-goals" trong design doc — giúp tránh scope creep khi review với team.', kind: 'NOTE', daysAgo: 70 },
          ],
          resources: [
            { type: 'ARTICLE', title: 'Design Docs at Google', url: 'https://www.industrialempathy.com/posts/design-docs-at-google/' },
          ],
          issues: [],
        },
      ],
    },
  ],
};

// ---------- seeding ----------

async function createTree(
  workspaceId: string,
  node: LeafSeed | BranchSeed,
  parentId: string | null,
  depth: number,
  orderIndex: number,
): Promise<void> {
  const created = await prisma.node.create({
    data: {
      workspaceId,
      parentId,
      title: node.title,
      goal: node.goal,
      content: node.content.length ? doc(...node.content) : undefined,
      depth,
      orderIndex,
    },
  });

  if (!isBranch(node)) {
    for (const c of node.cards) {
      const when = daysAgo(c.daysAgo);
      await prisma.card.create({
        data: {
          nodeId: created.id,
          content: doc(c.text),
          kind: c.kind,
          createdAt: when,
          updatedAt: when,
        },
      });
    }
    for (let i = 0; i < node.resources.length; i++) {
      const r = node.resources[i];
      await prisma.resource.create({
        data: { nodeId: created.id, type: r.type, title: r.title, url: r.url, orderIndex: i },
      });
    }
    for (const i of node.issues) {
      await prisma.issue.create({
        data: { nodeId: created.id, question: i.question, resolved: i.resolved },
      });
    }
    return;
  }

  for (let i = 0; i < node.children.length; i++) {
    await createTree(workspaceId, node.children[i], created.id, depth + 1, i);
  }
}

async function main() {
  const workspace = await prisma.workspace.create({
    data: { name: 'Software Engineer — 3 năm kinh nghiệm' },
  });
  console.log(`Created workspace ${workspace.id} (${workspace.name})`);

  await createTree(workspace.id, TREE, null, 0, 0);

  const systemNotifications = [
    {
      title: 'Career Tree vừa hỗ trợ theo dõi Buổi thực hành',
      body: 'Giờ bạn có thể đánh dấu 1 hoạt động là "Thực hành" thay vì ghi chú thường trong Nhật ký hoạt động.',
      daysAgo: 5,
    },
    {
      title: 'Đã thêm tab "Tài liệu sử dụng"',
      body: 'Lưu lại link bài viết, video, khoá học ngay trong từng chủ đề.',
      daysAgo: 20,
    },
    {
      title: 'Chào mừng đến với Career Tree',
      body: 'Bắt đầu bằng cách khám phá cây chủ đề đã được seed sẵn cho lộ trình Software Engineer.',
      daysAgo: 30,
    },
  ];
  for (const n of systemNotifications) {
    const when = daysAgo(n.daysAgo);
    await prisma.notification.create({
      data: {
        workspaceId: workspace.id,
        type: 'SYSTEM',
        title: n.title,
        body: n.body,
        createdAt: when,
        updatedAt: when,
      },
    });
  }

  const nodeCount = await prisma.node.count({ where: { workspaceId: workspace.id } });
  const cardCount = await prisma.card.count({ where: { node: { workspaceId: workspace.id } } });
  const resourceCount = await prisma.resource.count({ where: { node: { workspaceId: workspace.id } } });
  const issueCount = await prisma.issue.count({ where: { node: { workspaceId: workspace.id } } });
  console.log(
    `Seeded ${nodeCount} nodes, ${cardCount} cards, ${resourceCount} resources, ${issueCount} issues.`,
  );
  console.log(`Workspace URL: /w/${workspace.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
