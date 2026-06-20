export { formatVND } from "@telecash/core";

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return todayStr(new Date(y, m - 1, d + delta));
}

export function displayDate(dateStr: string): string {
  const t = todayStr();
  const yesterday = shiftDay(t, -1);
  const [yyyy, mm, dd] = dateStr.split("-");
  const dmy = `${dd}/${mm}/${yyyy}`;
  if (dateStr === t) return `Hôm nay, ${dmy}`;
  if (dateStr === yesterday) return `Hôm qua, ${dmy}`;
  return dmy;
}
