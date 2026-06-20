export type RangeKind = "week" | "month" | "year" | "custom";
export type Granularity = "day" | "month";

export interface Period {
  start: Date; // inclusive
  end: Date; // exclusive (đầu kỳ kế tiếp)
  label: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const dateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Số tuần ISO (tuần bắt đầu Thứ 2, tuần chứa Thứ 5 đầu tiên là tuần 1). */
export function isoWeek(d: Date): number {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3); // Thứ 5 của tuần hiện tại
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86400000));
}

/** Kỳ báo cáo chứa ngày `ref` (hoặc from..to cho custom). */
export function getPeriod(kind: RangeKind, ref: Date, from?: string, to?: string): Period {
  if (kind === "custom") {
    const start = from ? parseDateOnly(from) : startOfDay(ref);
    const endIncl = to ? parseDateOnly(to) : start;
    return {
      start,
      end: addDays(endIncl, 1),
      label: `${pad(start.getDate())}/${pad(start.getMonth() + 1)} - ${pad(endIncl.getDate())}/${pad(endIncl.getMonth() + 1)}`,
    };
  }
  if (kind === "week") {
    const day = (ref.getDay() + 6) % 7; // Thứ 2 = 0
    const start = addDays(startOfDay(ref), -day);
    return { start, end: addDays(start, 7), label: `Tuần ${isoWeek(start)}, ${start.getFullYear()}` };
  }
  if (kind === "year") {
    return {
      start: new Date(ref.getFullYear(), 0, 1),
      end: new Date(ref.getFullYear() + 1, 0, 1),
      label: `Năm ${ref.getFullYear()}`,
    };
  }
  return {
    start: new Date(ref.getFullYear(), ref.getMonth(), 1),
    end: new Date(ref.getFullYear(), ref.getMonth() + 1, 1),
    label: `Tháng ${pad(ref.getMonth() + 1)}/${ref.getFullYear()}`,
  };
}

/** Kỳ liền trước (để so sánh). */
export function prevPeriod(kind: RangeKind, period: Period): { start: Date; end: Date } {
  const { start } = period;
  if (kind === "week") return { start: addDays(start, -7), end: start };
  if (kind === "year") return { start: new Date(start.getFullYear() - 1, 0, 1), end: start };
  if (kind === "custom") {
    const len = period.end.getTime() - period.start.getTime();
    return { start: new Date(start.getTime() - len), end: start };
  }
  return { start: new Date(start.getFullYear(), start.getMonth() - 1, 1), end: start };
}

/** Danh sách "cột" cho biểu đồ: theo ngày (week/month) hoặc theo tháng (year). */
export function buildBuckets(period: Period, granularity: Granularity): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  if (granularity === "month") {
    let y = period.start.getFullYear();
    let m = period.start.getMonth();
    while (y < period.end.getFullYear() || (y === period.end.getFullYear() && m < period.end.getMonth())) {
      out.push({ key: `${y}-${pad(m + 1)}`, label: `Th${m + 1}` });
      if (++m > 11) {
        m = 0;
        y++;
      }
    }
    return out;
  }
  for (let d = new Date(period.start); d < period.end; d = addDays(d, 1)) {
    out.push({ key: dateKey(d), label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` });
  }
  return out;
}

export function bucketKeyOf(date: Date, granularity: Granularity): string {
  return granularity === "month" ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}` : dateKey(date);
}
