const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 오늘(한국 기준) + offsetDays일의 날짜 "YYYY-MM-DD" */
export function kstDate(offsetDays = 0): string {
  const d = new Date(Date.now() + KST_OFFSET_MS);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD"의 요일 (월=1 ... 일=7) */
export function isoDow(dateStr: string): number {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay(); // 일=0
  return day === 0 ? 7 : day;
}

/** Prisma의 time 컬럼(Date 객체) → "HH:mm:ss" */
export function timeStr(t: Date): string {
  return t.toISOString().slice(11, 19);
}
