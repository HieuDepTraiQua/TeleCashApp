import { formatVND, formatDate } from "@telecash/core";

export interface CardTx {
  code: string;
  type: string;
  content: string;
  amount: number;
  date: Date;
  categoryName?: string | null;
}

export interface CardTotals {
  income: number;
  expense: number;
  month: number;
}

/** Thẻ xác nhận sau mỗi giao dịch (plain text để tránh lỗi escape nội dung user). */
export function buildConfirmation(tx: CardTx, totals: CardTotals): string {
  const isIncome = tx.type === "INCOME";
  const label = isIncome ? "Thu nhập" : "Chi tiêu";
  const emoji = isIncome ? "💰" : "💸";
  const mm = String(totals.month).padStart(2, "0");
  return [
    "✅ Đã ghi nhận:",
    `🔢 Mã giao dịch: ${tx.code}`,
    `${emoji} ${label} - ${tx.content || "(không nội dung)"} - ${formatVND(tx.amount)}`,
    `📅 Ngày: ${formatDate(tx.date)}`,
    `🏷️ Phân loại: ${tx.categoryName ?? "Chưa phân loại"}`,
    "———————————————",
    `📈 Tổng thu tháng ${mm}: ${formatVND(totals.income)}`,
    `📉 Tổng chi tháng ${mm}: ${formatVND(totals.expense)}`,
  ].join("\n");
}
