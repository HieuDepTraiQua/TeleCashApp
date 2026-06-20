/** Tạo chuỗi CSV (escape dấu phẩy/nháy/xuống dòng). bom=true để Excel đọc đúng tiếng Việt. */
export function toCsv(
  headers: string[],
  rows: (string | number)[][],
  opts: { bom?: boolean } = {},
): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers, ...rows].map((r) => r.map(esc).join(","));
  return (opts.bom ? "﻿" : "") + lines.join("\r\n");
}
