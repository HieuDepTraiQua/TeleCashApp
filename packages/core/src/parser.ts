import type { TxType } from "@telecash/types";

export interface ParsedMessage {
  type: TxType;
  amount: number; // VND, số nguyên
  content: string;
  date: Date;
  note: string | null;
}

const NOTE_RE = /\(([^)]*)\)\s*$/;
const DATE_RE = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;

function unitMul(u: string): number {
  // k / nghìn / ng -> ×1.000 ; m / tr / triệu -> ×1.000.000
  return u === "k" || u.startsWith("ng") ? 1_000 : 1_000_000;
}

/**
 * Parse 1 token số tiền. Hỗ trợ: 50k, 1m, 1tr, 1m5, 1.5m, 1k5, 35.000, 35000, 1.500.000
 * Trả về số nguyên VND, hoặc null nếu không phải số tiền.
 */
export function parseAmount(raw: string): number | null {
  const t = raw.trim().toLowerCase().replace(/^\+/, "");
  if (!t) return null;

  // Dạng A: <nguyên><đơn vị><thập phân>  vd 1m5, 1k5, 2tr75
  let m = t.match(/^(\d+)(k|m|tr|trieu|triệu|nghìn|nghin|ng)(\d+)$/);
  if (m) return Math.round(parseFloat(`${m[1]}.${m[3]}`) * unitMul(m[2]));

  // Dạng B: <số[.,thập phân]><đơn vị>  vd 50k, 1.5m, 1,5m, 10m
  m = t.match(/^(\d+(?:[.,]\d+)?)(k|m|tr|trieu|triệu|nghìn|nghin|ng)$/);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * unitMul(m[2]));

  // Dạng C: số thuần, dấu . , là ngăn cách nghìn  vd 35.000, 1.500.000, 35000
  if (/^\d[\d.,]*$/.test(t)) {
    const digits = t.replace(/[.,]/g, "");
    return digits ? parseInt(digits, 10) : null;
  }
  return null;
}

function extractNote(text: string): { note: string | null; rest: string } {
  const m = text.match(NOTE_RE);
  if (!m || m.index === undefined) return { note: null, rest: text };
  const note = m[1].trim() || null;
  const rest = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim();
  return { note, rest };
}

function parseDatePrefix(text: string, now: Date): { date: Date; rest: string } {
  const m = text.match(DATE_RE);
  if (!m) return { date: now, rest: text };
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { date: now, rest: text }; // không phải ngày hợp lệ -> coi như nội dung
  }
  return { date: new Date(year, month - 1, day), rest: text.slice(m[0].length).trim() };
}

/**
 * Parse 1 dòng tin nhắn thành giao dịch. Trả null nếu không tìm thấy số tiền.
 * Thứ tự: (+ thu nhập) -> ghi chú (...) -> ngày dd/MM -> số tiền -> nội dung còn lại.
 */
export function parseMessage(input: string, now: Date): ParsedMessage | null {
  let text = input.trim();
  if (!text) return null;

  let type: TxType = "EXPENSE";
  if (text.startsWith("+")) {
    type = "INCOME";
    text = text.slice(1).trim();
  }

  const noteRes = extractNote(text);
  text = noteRes.rest;

  const dateRes = parseDatePrefix(text, now);
  text = dateRes.rest;

  const tokens = text.split(/\s+/).filter(Boolean);
  let amount: number | null = null;
  let amountIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    const v = parseAmount(tokens[i]);
    if (v !== null && v > 0) {
      amount = v;
      amountIdx = i;
      break;
    }
  }
  if (amount === null) return null;

  const content = tokens.filter((_, i) => i !== amountIdx).join(" ").trim();
  return { type, amount, content, date: dateRes.date, note: noteRes.note };
}
