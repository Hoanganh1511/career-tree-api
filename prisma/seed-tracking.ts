import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Seed du lieu da dang cho toan bo khu vuc /tracking (7 module) - CHI cho
// CHINH CHU (dang nhap that qua Google, cung pattern voi seed-posts.ts) -
// khong dung DEMO_USER_ID vi Tracking la khong gian rieng tu, khong co khai
// niem persona "nguoi khac" nhu feed. Script XOA SACH du lieu Tracking cu
// cua user nay truoc khi seed lai (an toan chay nhieu lan).

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
function atUtcHour(date: Date, hour: number, minute = 0): Date {
  const d = new Date(date);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const realUser = await prisma.user.findUnique({
    where: { email: 'anhht.fe@gmail.com' },
    select: { id: true },
  });
  if (!realUser) {
    throw new Error(
      'Khong tim thay user that (anhht.fe@gmail.com) - dang nhap it nhat 1 lan roi chay lai seed nay.',
    );
  }
  const userId = realUser.id;

  // ---------- Don dep du lieu Tracking cu cua user nay ----------
  const oldGroups = await prisma.trackingGroup.findMany({
    where: { createdById: userId },
    select: { id: true },
  });
  const oldGroupIds = oldGroups.map((g) => g.id);
  await prisma.trackingGroupSession.deleteMany({
    where: { OR: [{ userId }, { groupId: { in: oldGroupIds } }] },
  });
  await prisma.trackingGroupMember.deleteMany({ where: { groupId: { in: oldGroupIds } } });
  await prisma.trackingGroup.deleteMany({ where: { id: { in: oldGroupIds } } });
  await prisma.trackingGoal.deleteMany({ where: { userId } }); // cascade Milestone + Step
  await prisma.trackingTimeBlock.deleteMany({ where: { userId } });
  await prisma.trackingTask.deleteMany({ where: { userId } });
  await prisma.trackingEnergyCheckin.deleteMany({ where: { userId } });
  await prisma.trackingWellnessLog.deleteMany({ where: { userId } });
  await prisma.trackingSettings.deleteMany({ where: { userId } });
  console.log('Da xoa du lieu Tracking cu.');

  // ---------- Settings (Reality Check) ----------
  // Co tinh de THAP hon tong gio can (~15h) de demo canh bao qua tai that.
  await prisma.trackingSettings.create({ data: { userId, weeklyAvailableHours: 10 } });

  // ========== A. Goal Compass - 5 goal, du 4 goc phan tu Ma tran + du kieu han chot ==========
  const g1 = await prisma.trackingGoal.create({
    data: {
      userId,
      title: 'Xây dựng kênh nội dung cá nhân',
      category: 'Sự nghiệp',
      why: 'Xây dựng thương hiệu cá nhân và tạo nền tảng để sau này phát triển sản phẩm riêng.',
      estimatedHoursPerWeek: 8,
      targetDate: daysFromNow(45),
      important: true,
      controllable: true,
    },
  });
  const g1m1 = await prisma.trackingMilestone.create({
    data: { goalId: g1.id, title: 'Xuất bản 10 bài viết đầu tiên', orderIndex: 0 },
  });
  await prisma.trackingGoalStep.createMany({
    data: [
      {
        goalId: g1.id,
        milestoneId: g1m1.id,
        title: 'Nghiên cứu 3 chủ đề tiềm năng',
        done: true,
        estimatedMinutes: 90,
        orderIndex: 0,
      },
      {
        goalId: g1.id,
        milestoneId: g1m1.id,
        title: 'Viết bài #1: Vì sao tôi bắt đầu viết',
        done: true,
        estimatedMinutes: 120,
        orderIndex: 1,
      },
      {
        goalId: g1.id,
        milestoneId: g1m1.id,
        title: 'Viết bài #2',
        done: false,
        estimatedMinutes: 120,
        dueDate: daysFromNow(5),
        orderIndex: 2,
      },
      {
        goalId: g1.id,
        milestoneId: g1m1.id,
        title: 'Thiết kế thumbnail mẫu',
        done: false,
        estimatedMinutes: 60,
        orderIndex: 3,
      },
    ],
  });
  const g1m2 = await prisma.trackingMilestone.create({
    data: { goalId: g1.id, title: 'Xây kênh mạng xã hội', orderIndex: 1 },
  });
  await prisma.trackingGoalStep.createMany({
    data: [
      {
        goalId: g1.id,
        milestoneId: g1m2.id,
        title: 'Tạo trang Facebook/X',
        done: true,
        estimatedMinutes: 30,
        orderIndex: 0,
      },
      {
        goalId: g1.id,
        milestoneId: g1m2.id,
        title: 'Đăng bài đầu tiên lên kênh',
        done: false,
        estimatedMinutes: 30,
        orderIndex: 1,
      },
    ],
  });
  // Step chua gan milestone - test nhom "Khac".
  await prisma.trackingGoalStep.create({
    data: {
      goalId: g1.id,
      title: 'Mua tên miền cá nhân',
      done: false,
      estimatedMinutes: 20,
      orderIndex: 0,
    },
  });

  const g2 = await prisma.trackingGoal.create({
    data: {
      userId,
      title: 'Cải thiện sức khoẻ tim mạch',
      category: 'Sức khoẻ',
      why: 'Bác sĩ khuyến nghị vận động nhiều hơn sau đợt khám tổng quát gần nhất.',
      estimatedHoursPerWeek: 5,
      targetDate: daysFromNow(90),
      important: true,
      controllable: true,
    },
  });
  const g2m1 = await prisma.trackingMilestone.create({
    data: { goalId: g2.id, title: 'Chạy bộ đều đặn', orderIndex: 0 },
  });
  await prisma.trackingGoalStep.createMany({
    data: [
      {
        goalId: g2.id,
        milestoneId: g2m1.id,
        title: 'Chạy 5km lần đầu',
        done: true,
        estimatedMinutes: 40,
        orderIndex: 0,
      },
      {
        goalId: g2.id,
        milestoneId: g2m1.id,
        title: 'Duy trì 3 buổi chạy/tuần trong 1 tháng',
        done: false,
        estimatedMinutes: 600,
        orderIndex: 1,
      },
    ],
  });
  await prisma.trackingGoalStep.create({
    data: {
      goalId: g2.id,
      title: 'Khám lại sau 3 tháng',
      done: false,
      estimatedMinutes: 60,
      dueDate: daysFromNow(90),
      orderIndex: 0,
    },
  });

  const g3 = await prisma.trackingGoal.create({
    data: {
      userId,
      title: 'Học tiếng Anh giao tiếp',
      category: 'Học tập',
      // targetDate bo trong co y - muc tieu mo, khong han chot cu the.
      important: true,
      controllable: false, // phu thuoc lich lop/giao vien - ngoai kiem soat
    },
  });
  const g3m1 = await prisma.trackingMilestone.create({
    data: { goalId: g3.id, title: 'Hoàn thành khoá Speaking cơ bản', orderIndex: 0 },
  });
  await prisma.trackingGoalStep.createMany({
    data: [
      {
        goalId: g3.id,
        milestoneId: g3m1.id,
        title: 'Hoàn thành 5 buổi đầu',
        done: true,
        estimatedMinutes: 300,
        orderIndex: 0,
      },
      {
        goalId: g3.id,
        milestoneId: g3m1.id,
        title: 'Luyện phản xạ với AI 15 phút/ngày',
        done: false,
        estimatedMinutes: 15,
        orderIndex: 1,
      },
    ],
  });

  // Han chot DA QUA (test mau canh bao "qua han").
  await prisma.trackingGoal.create({
    data: {
      userId,
      title: 'Dọn dẹp và sắp xếp nhà cửa',
      category: 'Sinh hoạt',
      targetDate: daysFromNow(-2),
      important: false,
      controllable: true,
    },
  });

  // Han chot SAP TOI (test mau canh bao amber) - co tinh de RONG (khong
  // milestone/step) test empty-state trong 1 card da co du lieu khac.
  await prisma.trackingGoal.create({
    data: {
      userId,
      title: 'Mở rộng mạng lưới quan hệ ngành',
      category: 'Sự nghiệp',
      targetDate: daysFromNow(6),
      important: false,
      controllable: false,
    },
  });

  console.log('Da seed 5 Goal (du 4 goc Ma tran uu tien + da dang han chot).');

  // ========== C. Weekly Planner - FOCUSED can/khong can gio nang luong tot nhat (UTC 9h) ==========
  const blockData: {
    date: Date;
    startMinute: number;
    endMinute: number;
    label: string;
    kind: 'FOCUSED' | 'GENERAL' | 'LIFE' | 'BUFFER';
  }[] = [
    // Hom nay (T+0) - FOCUSED LECH gio (15h) -> se bi Analytics de xuat doi.
    { date: daysFromNow(0), startMinute: 15 * 60, endMinute: 17 * 60, label: 'Viết bài #2', kind: 'FOCUSED' },
    { date: daysFromNow(0), startMinute: 11 * 60, endMinute: 11 * 60 + 30, label: 'Trả lời email', kind: 'GENERAL' },
    { date: daysFromNow(0), startMinute: 12 * 60, endMinute: 13 * 60, label: 'Ăn trưa', kind: 'LIFE' },
    // T+1 - FOCUSED DUNG gio (9h).
    { date: daysFromNow(1), startMinute: 9 * 60, endMinute: 11 * 60, label: 'Luyện Speaking + viết outline', kind: 'FOCUSED' },
    { date: daysFromNow(1), startMinute: 11 * 60, endMinute: 11 * 60 + 15, label: 'Nghỉ giải lao', kind: 'BUFFER' },
    // T+2 - FOCUSED lech gio (20h).
    { date: daysFromNow(2), startMinute: 20 * 60, endMinute: 21 * 60 + 30, label: 'Viết bài #3', kind: 'FOCUSED' },
    { date: daysFromNow(2), startMinute: 18 * 60, endMinute: 19 * 60, label: 'Tập gym', kind: 'LIFE' },
    // T+3 - khong co FOCUSED.
    { date: daysFromNow(3), startMinute: 7 * 60, endMinute: 7 * 60 + 30, label: 'Chạy bộ buổi sáng', kind: 'LIFE' },
    { date: daysFromNow(3), startMinute: 10 * 60, endMinute: 10 * 60 + 30, label: 'Kiểm tra công việc', kind: 'GENERAL' },
    // T+4 - FOCUSED DUNG gio (9h).
    { date: daysFromNow(4), startMinute: 9 * 60, endMinute: 10 * 60 + 30, label: 'Thiết kế thumbnail', kind: 'FOCUSED' },
    { date: daysFromNow(4), startMinute: 10 * 60 + 30, endMinute: 10 * 60 + 45, label: 'Nghỉ giải lao', kind: 'BUFFER' },
    // T+5 - cuoi tuan, chi sinh hoat.
    { date: daysFromNow(5), startMinute: 8 * 60, endMinute: 9 * 60, label: 'Chạy 5km', kind: 'LIFE' },
    // T+6 - FOCUSED lech gio (14h).
    { date: daysFromNow(6), startMinute: 14 * 60, endMinute: 16 * 60, label: 'Đăng bài lên kênh', kind: 'FOCUSED' },
    // Vai block QUA KHU cho phong khi luot lich ve truoc.
    { date: daysFromNow(-1), startMinute: 9 * 60, endMinute: 10 * 60 + 30, label: 'Viết bài #1', kind: 'FOCUSED' },
    { date: daysFromNow(-2), startMinute: 19 * 60, endMinute: 20 * 60, label: 'Đi bộ tối', kind: 'LIFE' },
  ];
  await prisma.trackingTimeBlock.createMany({
    data: blockData.map((b) => ({ userId, ...b })),
  });
  console.log(`Da seed ${blockData.length} Time Block (co ca FOCUSED dung/lech gio nang luong).`);

  // ========== D+C. Energy Tracker - checkin gio 9h (UTC) ro ret cao nhat ==========
  const energyRows: { checkedAt: Date; physical: number; emotional: number; mental: number }[] = [];
  for (let i = 1; i <= 8; i++) {
    energyRows.push({
      checkedAt: atUtcHour(daysFromNow(-i), 9),
      physical: 4,
      emotional: 4,
      mental: i % 3 === 0 ? 4 : 5,
    });
  }
  for (let i = 1; i <= 6; i++) {
    energyRows.push({
      checkedAt: atUtcHour(daysFromNow(-i), 14),
      physical: 3,
      emotional: 3,
      mental: i % 2 === 0 ? 2 : 3,
    });
  }
  for (let i = 1; i <= 4; i++) {
    energyRows.push({
      checkedAt: atUtcHour(daysFromNow(-i), 20),
      physical: 2,
      emotional: 2,
      mental: i % 2 === 0 ? 1 : 2,
    });
  }
  await prisma.trackingEnergyCheckin.createMany({ data: energyRows.map((r) => ({ userId, ...r })) });
  console.log(`Da seed ${energyRows.length} Energy Checkin (gio 9h UTC ro ret cao nhat).`);

  // ========== E (Wellness). Wellness Log + Task tuong ung de co Sleep Insight that ==========
  const goodSleepDays = [3, 5, 7, 9];
  const badSleepDays = [4, 6, 8, 10];
  let wellnessCount = 0;
  let correlatedTaskCount = 0;
  for (const dayOffset of goodSleepDays) {
    const date = daysFromNow(-dayOffset);
    await prisma.trackingWellnessLog.create({
      data: {
        userId,
        date,
        sleepHours: 7 + Math.random() * 1.5,
        sleepQuality: 4,
        napMinutes: 0,
        exerciseMinutes: 30,
        mealsLogged: 3,
        notes: 'Ngủ sớm, dậy tỉnh táo.',
      },
    });
    wellnessCount++;
    const titles = [
      'Viết outline bài mới',
      'Trả lời email',
      'Đọc tài liệu chuyên môn',
      'Tập thể dục buổi sáng',
      'Chuẩn bị báo cáo tuần',
    ];
    for (let i = 0; i < 5; i++) {
      await prisma.trackingTask.create({
        data: { userId, date, title: titles[i], done: i < 4 }, // 4/5 hoan thanh
      });
      correlatedTaskCount++;
    }
  }
  for (const dayOffset of badSleepDays) {
    const date = daysFromNow(-dayOffset);
    await prisma.trackingWellnessLog.create({
      data: {
        userId,
        date,
        sleepHours: 4 + Math.random() * 1.5,
        sleepQuality: 2,
        napMinutes: 20,
        exerciseMinutes: 0,
        mealsLogged: 2,
        notes: 'Thức khuya, mệt cả ngày.',
      },
    });
    wellnessCount++;
    const titles = [
      'Viết outline bài mới',
      'Trả lời email',
      'Đọc tài liệu chuyên môn',
      'Tập thể dục buổi sáng',
      'Chuẩn bị báo cáo tuần',
    ];
    for (let i = 0; i < 5; i++) {
      await prisma.trackingTask.create({
        data: { userId, date, title: titles[i], done: i < 1 }, // chi 1/5 hoan thanh
      });
      correlatedTaskCount++;
    }
  }
  console.log(
    `Da seed ${wellnessCount} Wellness Log + ${correlatedTaskCount} Task tuong quan (Sleep Insight se ro ~80% vs ~20%).`,
  );

  // ========== B (Daily Command Center). Task hom nay + hom qua + ngay mai ==========
  const heroTask = await prisma.trackingTask.create({
    data: {
      userId,
      date: daysFromNow(0),
      title: 'Viết bài #2 cho kênh nội dung',
      pinned: true,
      postponedCount: 2, // >= RESCUE_THRESHOLD -> hien khung "rescue" ngay
      estimatedMinutes: 120,
      done: false,
    },
  });
  await prisma.trackingTask.createMany({
    data: [
      { userId, date: daysFromNow(0), title: 'Trả lời email công việc', estimatedMinutes: 15, done: false },
      { userId, date: daysFromNow(0), title: 'Đọc 20 trang sách', estimatedMinutes: 30, done: true },
      { userId, date: daysFromNow(0), title: 'Uống đủ nước cả ngày', done: true },
      { userId, date: daysFromNow(0), title: 'Chuẩn bị tài liệu họp chiều', estimatedMinutes: 45, done: false },
    ],
  });
  // Hom qua - 1 task chua xong DA CO san ly do bo lo (demo Review/skipReason
  // da luu, xem duoc khi lui ngay).
  await prisma.trackingTask.createMany({
    data: [
      { userId, date: daysFromNow(-1), title: 'Viết bài #1', estimatedMinutes: 90, done: true },
      {
        userId,
        date: daysFromNow(-1),
        title: 'Gọi điện tư vấn dịch vụ',
        estimatedMinutes: 30,
        done: false,
        skipReason: 'OUT_OF_TIME',
      },
    ],
  });
  // Ngay mai - vai task de test dieu huong toi.
  await prisma.trackingTask.createMany({
    data: [
      { userId, date: daysFromNow(1), title: 'Luyện Speaking 30 phút', estimatedMinutes: 30, done: false },
      { userId, date: daysFromNow(1), title: 'Đăng bài lên kênh #3', estimatedMinutes: 20, done: false },
    ],
  });
  console.log(`Da seed Task hom nay/hom qua/ngay mai (co 1 task hero postponedCount=2, id ${heroTask.id}).`);

  // ========== F (Accountability Hub). Nhom + phien lam viec ==========
  const personas = await prisma.user.findMany({
    where: { username: { in: ['lucas.dev', 'jane.design'] } },
    select: { id: true, username: true },
  });
  const group = await prisma.trackingGroup.create({
    data: {
      name: 'Sprint viết lách',
      createdById: userId,
      members: {
        create: [{ userId }, ...personas.map((p) => ({ userId: p.id }))],
      },
    },
  });
  const sessionGoals = [
    'Viết outline bài #2',
    'Chỉnh sửa thumbnail',
    'Trả lời bình luận độc giả',
    'Lên kế hoạch nội dung tuần',
    'Nghiên cứu chủ đề mới',
    'Chạy 5km buổi sáng',
    'Luyện Speaking 30 phút',
    'Đăng bài lên kênh',
  ];
  const sessionUserIds = [userId, ...personas.map((p) => p.id)];
  let sessionCount = 0;
  for (let i = 1; i <= 12; i++) {
    const startedAt = atUtcHour(daysFromNow(-i), 9 + (i % 6));
    const endedAt = new Date(startedAt.getTime() + 45 * 60 * 1000);
    await prisma.trackingGroupSession.create({
      data: {
        groupId: group.id,
        userId: sessionUserIds[i % sessionUserIds.length],
        goalText: sessionGoals[i % sessionGoals.length],
        completed: i % 4 !== 0, // phan lon hoan thanh, xen ke vai buoi bo do
        startedAt,
        endedAt,
      },
    });
    sessionCount++;
  }
  console.log(
    `Da seed 1 Group "${group.name}" (${1 + personas.length} thanh vien) + ${sessionCount} phien lam viec.`,
  );

  console.log('\nHoan tat seed Tracking. Vao /tracking de xem.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
