// Cua so toi da nhin lai qua khu de tinh streak dai nhat / pattern 7 ngay -
// gioi han de query "recentCards" trong node.service.ts khong phai quet toan
// bo lich su Card cua workspace.
export const STREAK_LOOKBACK_DAYS = 90;

export type NodeStreak = {
  current: number;
  longest: number;
  last7: boolean[]; // index 0 = 6 ngay truoc, index 6 = hom nay
};

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function computeStreak(
  activeDays: Set<string>,
  today: Date = new Date(),
): NodeStreak {
  const last7: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    last7.push(activeDays.has(toDateKey(addDays(today, -i))));
  }

  // Streak hien tai: dem lui tu hom nay. Neu hom nay chua co hoat dong,
  // bat dau dem tu hom qua - streak coi nhu chua "gay" cho toi khi qua
  // het tron 1 ngay khong co hoat dong (dung UX quen thuoc cua app streak).
  let cursor = activeDays.has(toDateKey(today)) ? today : addDays(today, -1);
  let current = 0;
  while (activeDays.has(toDateKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }

  // Streak dai nhat trong cua so da truy van (STREAK_LOOKBACK_DAYS ngay gan nhat).
  let longest = 0;
  let running = 0;
  for (let i = STREAK_LOOKBACK_DAYS - 1; i >= 0; i--) {
    if (activeDays.has(toDateKey(addDays(today, -i)))) {
      running++;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  return { current, longest: Math.max(longest, current), last7 };
}
