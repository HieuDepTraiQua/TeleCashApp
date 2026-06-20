import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { InputFile } from "grammy";
import {
  getPeriod,
  prevPeriod,
  buildBuckets,
  bucketKeyOf,
  dateKey,
  toCsv,
  type RangeKind,
  type Granularity,
} from "@telecash/core";
import { env } from "../env";
import { verifyInitData } from "../auth/verifyInitData";
import { bot } from "../bot/bot";
import {
  ensureUser,
  ensureSeeded,
  createTransaction,
  listTransactionsByDay,
  daySummary,
  updateTransaction,
  deleteTransaction,
  listCategories,
  listTransactionsInRange,
  rangeTotals,
  searchTransactions,
  listCategoriesWithKeywords,
  createCategory,
  addKeyword,
  deleteKeyword,
  getUser,
} from "@telecash/db";
import { resolveCategory, invalidateCategoryCache } from "../categorize";

type Vars = { Variables: { userId: string } };

export const api = new Hono<Vars>();

api.use("*", cors());

// Xác thực mọi request bằng Telegram initData.
api.use("*", async (c, next) => {
  const auth = c.req.header("Authorization") ?? "";
  const initData = auth.startsWith("tma ") ? auth.slice(4) : c.req.header("X-Init-Data") ?? "";
  const verified = verifyInitData(initData, env.BOT_TOKEN);
  if (!verified) return c.json({ error: "unauthorized" }, 401);
  const userId = String(verified.user.id);
  await ensureUser({ id: userId, username: verified.user.username, firstName: verified.user.first_name });
  await ensureSeeded(userId);
  c.set("userId", userId);
  await next();
});

api.onError((err, c) => {
  if (err instanceof z.ZodError) return c.json({ error: "invalid", details: err.issues }, 400);
  console.error("API error:", err);
  return c.json({ error: "server_error" }, 500);
});

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}
function parseKind(s?: string): RangeKind {
  return s === "week" || s === "year" || s === "custom" ? s : "month";
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function fmtDMY(d: Date) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const txBody = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().int().positive(),
  content: z.string().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().nullish(),
  categoryId: z.string().nullish(),
});

api.get("/transactions", async (c) => {
  const date = c.req.query("date") ?? todayStr();
  return c.json({ transactions: await listTransactionsByDay(c.get("userId"), date) });
});

api.get("/day-summary", async (c) => {
  const date = c.req.query("date") ?? todayStr();
  return c.json(await daySummary(c.get("userId"), date));
});

api.get("/categories", async (c) => {
  return c.json({ categories: await listCategories(c.get("userId")) });
});

api.get("/search", async (c) => {
  const userId = c.get("userId");
  const type = c.req.query("type");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const min = c.req.query("min");
  const max = c.req.query("max");
  const rows = await searchTransactions(userId, {
    q: c.req.query("q") || undefined,
    type: type === "INCOME" || type === "EXPENSE" ? type : undefined,
    categoryId: c.req.query("categoryId") || undefined,
    from: from ? parseDateOnly(from) : undefined,
    to: to ? new Date(parseDateOnly(to).getTime() + 86400000) : undefined,
    min: min ? Number(min) : undefined,
    max: max ? Number(max) : undefined,
  });
  return c.json({ transactions: rows });
});

api.get("/categories-full", async (c) => {
  return c.json({ categories: await listCategoriesWithKeywords(c.get("userId")) });
});

api.get("/me", async (c) => {
  return c.json({ user: await getUser(c.get("userId")) });
});

const categoryBody = z.object({
  name: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().optional(),
});
api.post("/categories", async (c) => {
  const b = categoryBody.parse(await c.req.json());
  const cat = await createCategory(c.get("userId"), b);
  invalidateCategoryCache(c.get("userId"));
  return c.json({ category: cat }, 201);
});

const keywordBody = z.object({ text: z.string().min(1) });
api.post("/categories/:id/keywords", async (c) => {
  const b = keywordBody.parse(await c.req.json());
  const kw = await addKeyword(c.get("userId"), c.req.param("id"), b.text);
  if (!kw) return c.json({ error: "not_found" }, 404);
  invalidateCategoryCache(c.get("userId"));
  return c.json({ keyword: kw }, 201);
});

api.delete("/keywords/:id", async (c) => {
  const ok = await deleteKeyword(c.get("userId"), c.req.param("id"));
  if (!ok) return c.json({ error: "not_found" }, 404);
  invalidateCategoryCache(c.get("userId"));
  return c.json({ ok: true });
});

api.get("/reports", async (c) => {
  const userId = c.get("userId");
  const kind = parseKind(c.req.query("range"));
  const ref = c.req.query("ref") ? parseDateOnly(c.req.query("ref")!) : new Date();
  const period = getPeriod(kind, ref, c.req.query("from"), c.req.query("to"));
  const prev = prevPeriod(kind, period);
  const granularity: Granularity = kind === "year" ? "month" : "day";

  const txns = await listTransactionsInRange(userId, period.start, period.end);
  const prevSum = await rangeTotals(userId, prev.start, prev.end);

  let income = 0;
  let expense = 0;
  const buckets = buildBuckets(period, granularity);
  const series = new Map(buckets.map((b) => [b.key, { label: b.label, income: 0, expense: 0 }]));
  const catMap = new Map<string, { name: string; icon: string | null; amount: number }>();

  for (const t of txns) {
    const s = series.get(bucketKeyOf(t.date, granularity));
    if (t.type === "INCOME") {
      income += t.amount;
      if (s) s.income += t.amount;
    } else {
      expense += t.amount;
      if (s) s.expense += t.amount;
      const name = t.category?.name ?? "Khác";
      const cm = catMap.get(name) ?? { name, icon: t.category?.icon ?? null, amount: 0 };
      cm.amount += t.amount;
      catMap.set(name, cm);
    }
  }

  const byCategory = [...catMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((cm) => ({ ...cm, percent: expense ? Math.round((cm.amount / expense) * 1000) / 10 : 0 }));

  return c.json({
    period: { label: period.label, start: dateKey(period.start), end: dateKey(period.end) },
    totals: { income, expense, balance: income - expense },
    prevExpense: prevSum.expense,
    expenseDiff: expense - prevSum.expense,
    series: buckets.map((b) => series.get(b.key)!),
    byCategory,
    transactions: txns.map((t) => ({
      id: t.id,
      code: t.code,
      type: t.type,
      amount: t.amount,
      content: t.content,
      date: t.date,
      category: t.category,
    })),
  });
});

api.post("/export/csv", async (c) => {
  const userId = c.get("userId");
  const kind = parseKind(c.req.query("range"));
  const ref = c.req.query("ref") ? parseDateOnly(c.req.query("ref")!) : new Date();
  const period = getPeriod(kind, ref, c.req.query("from"), c.req.query("to"));
  const txns = await listTransactionsInRange(userId, period.start, period.end);

  const headers = ["NGÀY", "PHÂN LOẠI", "ID", "DANH MỤC", "SỐ TIỀN", "PHÂN LOẠI CHI TIẾT", "GHI CHÚ"];
  const rows = txns.map((t) => [
    fmtDMY(t.date),
    t.type === "INCOME" ? "Thu nhập" : "Chi tiêu",
    t.code,
    t.category?.name ?? "Khác",
    t.amount,
    t.subCategory ?? "",
    t.note ?? "",
  ]);
  const csv = toCsv(headers, rows, { bom: true });
  const filename = `baocao-${period.label.replace(/[^\p{L}\p{N}]+/gu, "-")}.csv`;

  await bot.api.sendDocument(userId, new InputFile(Buffer.from(csv, "utf8"), filename), {
    caption: `📄 Báo cáo ${period.label} — ${txns.length} giao dịch`,
  });
  return c.json({ ok: true, count: txns.length });
});

api.post("/transactions", async (c) => {
  const body = txBody.parse(await c.req.json());
  const userId = c.get("userId");
  let categoryId = body.categoryId ?? null;
  if (!categoryId) categoryId = (await resolveCategory(userId, body.content, body.type)).categoryId;
  const tx = await createTransaction({
    userId,
    type: body.type,
    amount: body.amount,
    content: body.content,
    date: parseDateOnly(body.date),
    note: body.note ?? null,
    categoryId,
    source: "MINIAPP",
  });
  return c.json({ transaction: tx }, 201);
});

api.put("/transactions/:id", async (c) => {
  const body = txBody.partial().parse(await c.req.json());
  const tx = await updateTransaction(c.get("userId"), c.req.param("id"), {
    type: body.type,
    amount: body.amount,
    content: body.content,
    note: body.note,
    categoryId: body.categoryId,
    date: body.date ? parseDateOnly(body.date) : undefined,
  });
  if (!tx) return c.json({ error: "not_found" }, 404);
  return c.json({ transaction: tx });
});

api.delete("/transactions/:id", async (c) => {
  const ok = await deleteTransaction(c.get("userId"), c.req.param("id"));
  if (!ok) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});
