import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type PlannerCategory,
  type PlannerItemType,
  type PlannerPriority,
  type PlannerScheduleKind,
  type PlannerStatus,
} from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// [2026-10-09] Seed Planner - thay the HOAN TOAN du lieu mau cu (SAMPLE_EVENTS/
// SAMPLE_REMINDERS hardcode trong trang /planner/preview ben FE).
//
// DETERMINISTIC: moi id va moi moc thoi gian deu tinh TU 1 NGAY NEO co dinh
// (ANCHOR, mac dinh la thu Hai cua tuan hien tai) chu khong dung Math.random()
// hay Date.now() rai rac - chay lai bao nhieu lan cung ra dung bo du lieu do,
// so sanh/chup man hinh/kiem thu deu lap lai duoc.
//
// Script XOA SACH PlannerItem cua DUNG user nay truoc khi seed (idempotent).
// KHONG dung toi bat ky bang nao khac.

// ---------------------------------------------------------------------------
// Moc thoi gian
// ---------------------------------------------------------------------------

// Thu Hai cua tuan chua hom nay, 00:00 UTC - moi thu khac tinh tu day.
function anchorMonday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const dow = d.getUTCDay(); // 0 = CN
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d;
}
const ANCHOR = anchorMonday();

/** Ngay thu `offset` tinh tu ANCHOR, tai 00:00 UTC. */
function day(offset: number): Date {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}
/** Ngay thu `offset` tinh tu ANCHOR, tai gio:phut UTC. */
function at(offset: number, hour: number, minute = 0): Date {
  const d = day(offset);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

type SeedItem = {
  id: string;
  type: PlannerItemType;
  title: string;
  description?: string;
  category: PlannerCategory;
  status: PlannerStatus;
  priority: PlannerPriority;
  scheduleKind: PlannerScheduleKind;
  startAt?: Date;
  endAt?: Date;
  dueAt?: Date;
  location?: string;
  meetingUrl?: string;
  checklist?: { id: string; title: string; done: boolean }[];
  /** Ghi chu kich ban nay dung de kiem thu dieu gi (khong luu vao DB). */
  scenario: string;
};

// ---------------------------------------------------------------------------
// Bo kich ban - bam sat danh sach o spec muc E
// ---------------------------------------------------------------------------
const ITEMS: SeedItem[] = [
  // 1. Task co lich binh thuong
  {
    id: 'seed-task-scheduled',
    type: 'TASK',
    title: 'Viết báo cáo tuần',
    description: 'Tổng hợp tiến độ 3 đầu việc chính và gửi cho team lead.',
    category: 'STUDY',
    status: 'SCHEDULED',
    priority: 'MEDIUM',
    scheduleKind: 'TIMED',
    startAt: at(1, 9, 0),
    endAt: at(1, 10, 30),
    scenario: 'Task co khung gio binh thuong',
  },
  // 2. Task chua xep lich
  {
    id: 'seed-task-unscheduled',
    type: 'TASK',
    title: 'Tìm hiểu gói bảo hiểm sức khoẻ',
    category: 'PERSONAL',
    status: 'SCHEDULED',
    priority: 'LOW',
    scheduleKind: 'UNSCHEDULED',
    scenario: 'Task CHUA xep lich - khong thuoc ngay nao tren luoi',
  },
  // 3. Task chi co han chot, khong co khung gio lam
  {
    id: 'seed-task-deadline-only',
    type: 'TASK',
    title: 'Nộp hồ sơ gia hạn hợp đồng',
    description: 'Bản scan + bản cứng nộp phòng hành chính.',
    category: 'DEADLINE',
    status: 'SCHEDULED',
    priority: 'HIGH',
    scheduleKind: 'DEADLINE',
    dueAt: at(3, 17, 0),
    scenario: 'Task co deadline nhung KHONG co khung gio lam',
  },
  // 4. Event ngan
  {
    id: 'seed-event-short',
    type: 'EVENT',
    title: 'Standup',
    category: 'MEETING',
    status: 'SCHEDULED',
    priority: 'NONE',
    scheduleKind: 'TIMED',
    startAt: at(1, 8, 30),
    endAt: at(1, 8, 45),
    scenario: 'Event RAT NGAN (15 phut) - kiem tra compact rendering',
  },
  // 5. Event ca ngay
  {
    id: 'seed-event-allday',
    type: 'EVENT',
    title: 'Ngày nghỉ công ty',
    category: 'BREAK',
    status: 'SCHEDULED',
    priority: 'NONE',
    scheduleKind: 'ALL_DAY',
    startAt: day(2),
    endAt: day(2),
    scenario: 'Event CA NGAY (1 ngay)',
  },
  // 6. Event nhieu ngay
  {
    id: 'seed-event-multiday',
    type: 'EVENT',
    title: 'Hội thảo thường niên',
    description: 'Ba ngày liên tiếp tại trung tâm hội nghị.',
    category: 'STUDY',
    status: 'SCHEDULED',
    priority: 'MEDIUM',
    scheduleKind: 'ALL_DAY',
    startAt: day(3),
    endAt: day(5),
    location: 'Trung tâm Hội nghị Quốc gia',
    scenario: 'Event NHIEU NGAY - bar keo dai qua nhieu o',
  },
  // 7. Hop online co link
  {
    id: 'seed-event-online',
    type: 'EVENT',
    title: 'Phỏng vấn ứng viên Backend',
    category: 'CALL',
    status: 'SCHEDULED',
    priority: 'HIGH',
    scheduleKind: 'TIMED',
    startAt: at(2, 14, 0),
    endAt: at(2, 15, 0),
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    scenario: 'Hop ONLINE - co meetingUrl, khong co location',
  },
  // 8. Hop truc tiep co dia diem
  {
    id: 'seed-event-onsite',
    type: 'EVENT',
    title: 'Gặp khách hàng ABC',
    category: 'MEETING',
    status: 'SCHEDULED',
    priority: 'HIGH',
    scheduleKind: 'TIMED',
    startAt: at(2, 10, 0),
    endAt: at(2, 11, 30),
    location: '72 Lê Thánh Tôn, Quận 1',
    scenario: 'Hop TRUC TIEP - co location, khong co meetingUrl',
  },
  // 9. Task dang lam
  {
    id: 'seed-task-inprogress',
    type: 'TASK',
    title: 'Refactor module thanh toán',
    category: 'STUDY',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    scheduleKind: 'TIMED',
    startAt: at(0, 13, 0),
    endAt: at(0, 17, 0),
    scenario: 'Task DANG LAM (IN_PROGRESS)',
  },
  // 10. Task da xong
  {
    id: 'seed-task-completed',
    type: 'TASK',
    title: 'Dọn backlog sprint trước',
    category: 'OTHER',
    status: 'COMPLETED',
    priority: 'LOW',
    scheduleKind: 'TIMED',
    startAt: at(0, 9, 0),
    endAt: at(0, 10, 0),
    scenario: 'Task DA HOAN THANH',
  },
  // 11. Task qua han (status luu SCHEDULED - OVERDUE duoc SUY RA luc doc)
  {
    id: 'seed-task-overdue',
    type: 'TASK',
    title: 'Trả lời email đối tác',
    category: 'DEADLINE',
    status: 'SCHEDULED',
    priority: 'HIGH',
    scheduleKind: 'DEADLINE',
    dueAt: at(-2, 12, 0),
    scenario: 'Task QUA HAN - status luu SCHEDULED, API tra ve OVERDUE',
  },
  // 12. Item da huy
  {
    id: 'seed-event-cancelled',
    type: 'EVENT',
    title: 'Team building (hoãn)',
    category: 'SPORTS',
    status: 'CANCELLED',
    priority: 'NONE',
    scheduleKind: 'TIMED',
    startAt: at(4, 15, 0),
    endAt: at(4, 18, 0),
    scenario: 'Item DA HUY (CANCELLED)',
  },
  // 13. Item can chu y
  {
    id: 'seed-task-attention',
    type: 'TASK',
    title: 'Chờ phản hồi từ bộ phận pháp chế',
    category: 'OTHER',
    status: 'NEEDS_ATTENTION',
    priority: 'MEDIUM',
    scheduleKind: 'DEADLINE',
    dueAt: at(4, 9, 0),
    scenario: 'Item BI CHAN / CAN CHU Y (NEEDS_ATTENTION)',
  },
  // 14. Task co checklist (progress)
  {
    id: 'seed-task-checklist',
    type: 'TASK',
    title: 'Chuẩn bị buổi demo sản phẩm',
    description: 'Checklist 5 bước, đã xong 2.',
    category: 'MEETING',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    scheduleKind: 'TIMED',
    startAt: at(3, 9, 0),
    endAt: at(3, 11, 0),
    checklist: [
      { id: 'c1', title: 'Chốt kịch bản demo', done: true },
      { id: 'c2', title: 'Chuẩn bị dữ liệu mẫu', done: true },
      { id: 'c3', title: 'Dựng slide', done: false },
      { id: 'c4', title: 'Chạy thử end-to-end', done: false },
      { id: 'c5', title: 'Gửi lời mời cho khách', done: false },
    ],
    scenario: 'Task co CHECKLIST - hien thanh tien do 2/5',
  },
  // 15 + 16. Hai item TRUNG GIO nhau
  {
    id: 'seed-overlap-a',
    type: 'EVENT',
    title: 'Review thiết kế',
    category: 'MEETING',
    status: 'SCHEDULED',
    priority: 'NONE',
    scheduleKind: 'TIMED',
    startAt: at(1, 14, 0),
    endAt: at(1, 15, 30),
    scenario: 'Trung gio (A) - chia cot voi B',
  },
  {
    id: 'seed-overlap-b',
    type: 'EVENT',
    title: 'Call với nhà cung cấp',
    category: 'CALL',
    status: 'SCHEDULED',
    priority: 'NONE',
    scheduleKind: 'TIMED',
    startAt: at(1, 14, 30),
    endAt: at(1, 16, 0),
    scenario: 'Trung gio (B) - chia cot voi A',
  },
  // 17. Trung gio 3 lop (them C de kiem tra chia 3)
  {
    id: 'seed-overlap-c',
    type: 'TASK',
    title: 'Ghi chú sau cuộc họp',
    category: 'OTHER',
    status: 'SCHEDULED',
    priority: 'LOW',
    scheduleKind: 'TIMED',
    startAt: at(1, 15, 0),
    endAt: at(1, 15, 45),
    scenario: 'Trung gio (C) - 3 item cung khung -> chia 3 cot',
  },
  // 18. Tieu de + mo ta RAT DAI
  {
    id: 'seed-task-long-text',
    type: 'TASK',
    title:
      'Rà soát toàn bộ quy trình onboarding nhân sự mới của khối kỹ thuật và đề xuất phương án rút ngắn thời gian hoà nhập xuống dưới hai tuần',
    description:
      'Phần mô tả cố tình viết rất dài để kiểm tra khả năng xuống dòng, cắt chữ và giãn dòng của thẻ trên lịch, của panel chi tiết và của danh sách. '.repeat(
        4,
      ),
    category: 'STUDY',
    status: 'SCHEDULED',
    priority: 'LOW',
    scheduleKind: 'TIMED',
    startAt: at(4, 10, 0),
    endAt: at(4, 11, 0),
    scenario: 'Tieu de + mo ta RAT DAI - kiem tra truncate/wrap',
  },
  // 19. Khong co metadata tuy chon nao
  {
    id: 'seed-task-bare',
    type: 'TASK',
    title: 'Việc tối giản',
    category: 'OTHER',
    status: 'SCHEDULED',
    priority: 'NONE',
    scheduleKind: 'TIMED',
    startAt: at(5, 9, 0),
    endAt: at(5, 9, 30),
    scenario: 'KHONG mo ta/location/checklist - kiem tra field optional rong',
  },
  // 20-21. Reminder
  {
    id: 'seed-reminder-pill',
    type: 'REMINDER',
    title: 'Uống thuốc',
    category: 'SPORTS',
    status: 'SCHEDULED',
    priority: 'MEDIUM',
    scheduleKind: 'DEADLINE',
    dueAt: at(1, 7, 30),
    scenario: 'Reminder co gio cu the',
  },
  {
    id: 'seed-reminder-birthday',
    type: 'REMINDER',
    title: 'Sinh nhật mẹ',
    category: 'PERSONAL',
    status: 'SCHEDULED',
    priority: 'HIGH',
    scheduleKind: 'DEADLINE',
    dueAt: at(5, 8, 0),
    scenario: 'Reminder ca nhan',
  },
  // 22. Category con thieu: BREAK da co (#5), bo sung ban than BREAK dang timed
  {
    id: 'seed-task-break',
    type: 'TASK',
    title: 'Nghỉ trưa + đi bộ',
    category: 'BREAK',
    status: 'SCHEDULED',
    priority: 'NONE',
    scheduleKind: 'TIMED',
    startAt: at(1, 12, 0),
    endAt: at(1, 13, 0),
    scenario: 'Category BREAK dang TIMED',
  },
  // 23. SPORTS dang timed (phu kin 8 category)
  {
    id: 'seed-event-gym',
    type: 'EVENT',
    title: 'Tập gym',
    category: 'SPORTS',
    status: 'SCHEDULED',
    priority: 'LOW',
    scheduleKind: 'TIMED',
    startAt: at(0, 18, 0),
    endAt: at(0, 19, 30),
    location: 'California Fitness',
    scenario: 'Category SPORTS - phu du 8 category',
  },
];

async function main() {
  const email = 'anhht.fe@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    throw new Error(
      `Khong tim thay user ${email}. Dang nhap 1 lan truoc roi chay lai seed.`,
    );
  }

  const removed = await prisma.plannerItem.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Da xoa ${removed.count} PlannerItem cu cua ${email}.`);

  let order = 0;
  for (const it of ITEMS) {
    const { scenario, ...data } = it;
    await prisma.plannerItem.create({
      data: {
        ...data,
        userId: user.id,
        checklist: data.checklist ?? [],
        orderIndex: order++,
      },
    });
    console.log(`  + ${it.type.padEnd(8)} ${it.title.slice(0, 48).padEnd(50)} ${scenario}`);
  }

  // Thong ke de doi chieu nhanh
  const byKind = await prisma.plannerItem.groupBy({
    by: ['scheduleKind'],
    where: { userId: user.id },
    _count: true,
  });
  const byStatus = await prisma.plannerItem.groupBy({
    by: ['status'],
    where: { userId: user.id },
    _count: true,
  });
  const byCategory = await prisma.plannerItem.groupBy({
    by: ['category'],
    where: { userId: user.id },
    _count: true,
  });
  console.log(`\nTong: ${ITEMS.length} item (neo tu ${ANCHOR.toISOString().slice(0, 10)})`);
  console.log('scheduleKind:', byKind.map((r) => `${r.scheduleKind}=${r._count}`).join(' '));
  console.log('status     :', byStatus.map((r) => `${r.status}=${r._count}`).join(' '));
  console.log('category   :', byCategory.map((r) => `${r.category}=${r._count}`).join(' '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
