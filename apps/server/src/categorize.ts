import { categorize, type KeywordEntry } from "@telecash/core";
import { prisma } from "@telecash/db";
import type { TxType } from "@telecash/types";

interface CatCache {
  keywords: KeywordEntry[];
  nameById: Map<string, string>;
  fallback: Record<TxType, string | null>; // categoryId của "Khác" / "Thu nhập khác"
}

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

/** Phân loại nội dung -> { categoryId, name }. Không khớp -> fallback "Khác". */
export async function resolveCategory(
  userId: string,
  content: string,
  type: TxType,
): Promise<{ categoryId: string | null; name: string | null }> {
  const data = cache.get(userId) ?? (await load(userId));

  let categoryId = categorize(content, data.keywords, type);
  // TODO(v2): nếu categoryId === null -> gọi AI (Claude) phân loại tại đây trước khi fallback.
  if (!categoryId) categoryId = data.fallback[type];

  const name = categoryId ? data.nameById.get(categoryId) ?? null : null;
  return { categoryId, name };
}
