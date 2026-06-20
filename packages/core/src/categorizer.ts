import type { TxType } from "@telecash/types";
import { normalize } from "./text";

export interface KeywordEntry {
  categoryId: string;
  normalized: string; // từ khóa đã chuẩn hóa (bỏ dấu)
  type: TxType; // chỉ khớp với giao dịch cùng loại
}

/**
 * Phân loại nội dung dựa trên từ khóa (đã bỏ dấu).
 * - Khớp từ-khóa-1-từ theo TỪ (token) để tránh dính nhầm ("bàn" không match "ăn").
 * - Khớp từ-khóa-nhiều-từ theo chuỗi con ("trà sữa").
 * - Ưu tiên từ khóa DÀI hơn (cụ thể hơn) — vd "thuốc" thắng "mua".
 * Trả categoryId, hoặc null nếu không khớp (caller sẽ fallback "Khác" / sau này gọi AI).
 */
export function categorize(content: string, keywords: KeywordEntry[], type: TxType): string | null {
  const nc = normalize(content);
  if (!nc) return null;
  const tokens = new Set(nc.split(" ").filter(Boolean));

  const candidates = keywords
    .filter((k) => k.type === type && k.normalized)
    .sort((a, b) => b.normalized.length - a.normalized.length);

  for (const k of candidates) {
    const matched = k.normalized.includes(" ") ? nc.includes(k.normalized) : tokens.has(k.normalized);
    if (matched) return k.categoryId;
  }
  return null;
}
