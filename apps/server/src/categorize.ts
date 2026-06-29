import { categorize, type KeywordEntry } from "@telecash/core";
import { prisma } from "@telecash/db";
import type { TxType } from "@telecash/types";

interface CatCache {
  keywords: KeywordEntry[];
  nameById: Map<string, string>;
  fallback: Record<TxType, string | null>; // categoryId của "Khác" / "Thu nhập khác"
}

export type CategorySource = "KEYWORD" | "FALLBACK" | "MANUAL";

const cache = new Map<string, CatCache>();

/** Xóa cache khi danh mục/từ khóa của user thay đổi (dùng ở P7). */
export function invalidateCategoryCache(userId: string): void {
  cache.delete(userId);
}

async function load(userId: string): Promise<CatCache> {
  const cats = await prisma.category.findMany({
    where: { userId },
    include: { keywords: true },
  });
  const keywords: KeywordEntry[] = [];
  const nameById = new Map<string, string>();
  const fallback: Record<TxType, string | null> = { INCOME: null, EXPENSE: null };

  for (const c of cats) {
    const type = c.type as TxType;
    nameById.set(c.id, c.name);
    if (type === "EXPENSE" && c.name === "Khác") fallback.EXPENSE = c.id;
    if (type === "INCOME" && c.name === "Thu nhập khác") fallback.INCOME = c.id;
    for (const k of c.keywords) keywords.push({ categoryId: c.id, normalized: k.normalized, type });
  }

  const data: CatCache = { keywords, nameById, fallback };
  cache.set(userId, data);
  return data;
}

/** Phân loại nội dung -> category metadata. Không khớp -> fallback "Khác" / "Thu nhập khác". */
export async function resolveCategory(
  userId: string,
  content: string,
  type: TxType,
): Promise<{ categoryId: string | null; name: string | null; source: CategorySource; isFallback: boolean }> {
  const data = cache.get(userId) ?? (await load(userId));

  const matchedCategoryId = categorize(content, data.keywords, type);
  const source: CategorySource = matchedCategoryId ? "KEYWORD" : "FALLBACK";
  const categoryId = matchedCategoryId ?? data.fallback[type];

  const name = categoryId ? data.nameById.get(categoryId) ?? null : null;
  return { categoryId, name, source, isFallback: source === "FALLBACK" };
}
