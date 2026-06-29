import type { TxType } from "@telecash/types";
import { normalize } from "@telecash/core";
import { prisma } from "./index";
import { seedDefaultCategories } from "./seed";

function dayRange(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function sumByType(userId: string, start: Date, end: Date) {
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === "INCOME") income = r._sum.amount ?? 0;
    else if (r.type === "EXPENSE") expense = r._sum.amount ?? 0;
  }
  return { income, expense };
}

/** Tạo user nếu chưa có (cập nhật username/firstName mỗi lần). */
export async function ensureUser(input: {
  id: string;
  username?: string | null;
  firstName?: string | null;
}) {
  return prisma.user.upsert({
    where: { id: input.id },
    update: { username: input.username ?? undefined, firstName: input.firstName ?? undefined },
    create: { id: input.id, username: input.username ?? null, firstName: input.firstName ?? null },
  });
}

/** Seed danh mục mặc định nếu user chưa có danh mục nào. Trả true nếu vừa seed. */
export async function ensureSeeded(userId: string): Promise<boolean> {
  const count = await prisma.category.count({ where: { userId } });
  if (count > 0) return false;
  await seedDefaultCategories(userId);
  return true;
}

/** Tăng seq atomic -> sinh mã GDxxx -> tạo giao dịch. */
export async function createTransaction(input: {
  userId: string;
  type: TxType;
  amount: number;
  content: string;
  date: Date;
  note?: string | null;
  categoryId?: string | null;
  categorySource?: string;
  subCategory?: string | null;
  source?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: input.userId },
      data: { seq: { increment: 1 } },
      select: { seq: true },
    });
    const code = "GD" + String(u.seq).padStart(3, "0");
    return tx.transaction.create({
      data: {
        code,
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        content: input.content,
        date: input.date,
        note: input.note ?? null,
        categoryId: input.categoryId ?? null,
        categorySource: input.categorySource ?? "MANUAL",
        subCategory: input.subCategory ?? null,
        source: input.source ?? "BOT",
      },
    });
  });
}

/** Tổng thu/chi trong tháng chứa ngày `ref`. */
export async function monthlyTotals(userId: string, ref: Date) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  const { income, expense } = await sumByType(userId, start, end);
  return { income, expense, month: ref.getMonth() + 1 };
}

/** Danh sách giao dịch theo ngày (kèm danh mục) — mới nhất lên đầu. */
export async function listTransactionsByDay(userId: string, dateStr: string) {
  const { start, end } = dayRange(dateStr);
  return prisma.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    orderBy: { createdAt: "desc" },
    include: { category: { select: { id: true, name: true, icon: true } } },
  });
}

/** Tổng quan 1 ngày + so sánh ngày trước. */
export async function daySummary(userId: string, dateStr: string) {
  const { start, end } = dayRange(dateStr);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - 1);
  const cur = await sumByType(userId, start, end);
  const prev = await sumByType(userId, prevStart, start);
  return {
    date: dateStr,
    income: cur.income,
    expense: cur.expense,
    balance: cur.income - cur.expense,
    prevExpense: prev.expense,
    expenseDiff: cur.expense - prev.expense,
  };
}

/** Cập nhật giao dịch (chỉ của chính user). Trả null nếu không tìm thấy. */
export async function updateTransaction(
  userId: string,
  id: string,
  data: {
    type?: TxType;
    amount?: number;
    content?: string;
    note?: string | null;
    categoryId?: string | null;
    categorySource?: string;
    date?: Date;
  },
) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return null;
  return prisma.transaction.update({
    where: { id },
    data: {
      type: data.type,
      amount: data.amount,
      content: data.content,
      note: data.note,
      categoryId: data.categoryId,
      categorySource: data.categorySource,
      date: data.date,
    },
  });
}

/** Xóa giao dịch (chỉ của chính user). Trả true nếu có xóa. */
export async function deleteTransaction(userId: string, id: string): Promise<boolean> {
  const res = await prisma.transaction.deleteMany({ where: { id, userId } });
  return res.count > 0;
}

/** Danh sách danh mục của user. */
export async function listCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, icon: true, type: true },
  });
}

/** Giao dịch trong khoảng [start, end) — dùng cho báo cáo. */
export async function listTransactionsInRange(userId: string, start: Date, end: Date) {
  return prisma.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    include: { category: { select: { id: true, name: true, icon: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

/** Tổng thu/chi trong khoảng [start, end). */
export async function rangeTotals(userId: string, start: Date, end: Date) {
  return sumByType(userId, start, end);
}

/** Tìm kiếm giao dịch theo nhiều tiêu chí (tối đa 200 dòng). */
export async function searchTransactions(
  userId: string,
  f: { q?: string; type?: TxType; from?: Date; to?: Date; min?: number; max?: number; categoryId?: string },
) {
  return prisma.transaction.findMany({
    where: {
      userId,
      ...(f.type ? { type: f.type } : {}),
      ...(f.categoryId ? { categoryId: f.categoryId } : {}),
      ...(f.q ? { content: { contains: f.q } } : {}),
      ...(f.from || f.to ? { date: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lt: f.to } : {}) } } : {}),
      ...(f.min != null || f.max != null
        ? { amount: { ...(f.min != null ? { gte: f.min } : {}), ...(f.max != null ? { lte: f.max } : {}) } }
        : {}),
    },
    include: { category: { select: { id: true, name: true, icon: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

/** Danh mục kèm từ khóa (cho tab Từ khóa). */
export async function listCategoriesWithKeywords(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { keywords: { select: { id: true, text: true }, orderBy: { text: "asc" } } },
  });
}

/** Tạo danh mục mới. */
export async function createCategory(userId: string, input: { name: string; icon?: string; type: TxType }) {
  return prisma.category.create({
    data: { userId, name: input.name, icon: input.icon ?? "🏷️", type: input.type },
  });
}

/** Thêm từ khóa vào danh mục (của chính user). null nếu danh mục không thuộc user. */
export async function addKeyword(userId: string, categoryId: string, text: string) {
  const normalized = normalize(text);
  if (!normalized) return null;
  const cat = await prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
  if (!cat) return null;
  const existing = await prisma.keyword.findFirst({ where: { categoryId, normalized } });
  if (existing) return existing;
  return prisma.keyword.create({ data: { categoryId, text: text.trim(), normalized } });
}

export async function getTransactionForUser(userId: string, id: string) {
  return prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: { select: { id: true, name: true, icon: true, type: true } } },
  });
}

export async function getCategoryForUser(userId: string, categoryId: string) {
  return prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true, name: true, icon: true, type: true },
  });
}

export async function isFallbackCategory(userId: string, categoryId: string): Promise<boolean> {
  const cat = await getCategoryForUser(userId, categoryId);
  return !!cat && (cat.name === "Khác" || cat.name === "Thu nhập khác");
}

export async function chooseTransactionCategory(userId: string, txId: string, categoryId: string) {
  const [tx, cat] = await Promise.all([getTransactionForUser(userId, txId), getCategoryForUser(userId, categoryId)]);
  if (!tx || !cat || tx.type !== cat.type) return null;

  const fallback = cat.name === "Khác" || cat.name === "Thu nhập khác";
  const updated = await updateTransaction(userId, txId, {
    categoryId,
    categorySource: "MANUAL",
  });

  let keyword = null;
  if (!fallback) keyword = await addKeyword(userId, categoryId, tx.content);

  return { transaction: updated, category: cat, learned: !!keyword && !fallback };
}

/** Xóa từ khóa (của chính user). */
export async function deleteKeyword(userId: string, keywordId: string): Promise<boolean> {
  const res = await prisma.keyword.deleteMany({ where: { id: keywordId, category: { userId } } });
  return res.count > 0;
}

/** Thông tin user (cho tab Về app). */
export async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, username: true, googleConnected: true, createdAt: true },
  });
}
