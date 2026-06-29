import type { Bot, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import { formatVND } from "@telecash/core";
import { ensureSeeded, ensureUser, listTransactionsInRange } from "@telecash/db";

type QuickReportKind = "today" | "this_month" | "last_month" | "ytd";

interface Period {
  title: string;
  start: Date;
  end: Date;
}

function startOfToday(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatRange(start: Date, endExclusive: Date): string {
  const end = addDays(endExclusive, -1);
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function periodOf(kind: QuickReportKind, now = new Date()): Period {
  const todayStart = startOfToday(now);
  const tomorrow = addDays(todayStart, 1);

  if (kind === "today") return { title: "Hôm nay", start: todayStart, end: tomorrow };
  if (kind === "this_month") {
    return {
      title: "Tháng này",
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }
  if (kind === "last_month") {
    return {
      title: "Tháng trước",
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 1),
    };
  }
  return { title: "Từ đầu năm đến giờ", start: new Date(now.getFullYear(), 0, 1), end: tomorrow };
}

function reportMenuKeyboard() {
  return new InlineKeyboard()
    .text("📅 Hôm nay", "qr:today")
    .text("📆 Tháng này", "qr:this_month")
    .row()
    .text("↩️ Tháng trước", "qr:last_month")
    .text("🗓️ Từ đầu năm", "qr:ytd");
}

function reportBackKeyboard() {
  return new InlineKeyboard().text("📊 Chọn báo cáo khác", "quick_report");
}

async function ensureBotUser(ctx: Context): Promise<string | null> {
  if (!ctx.from) return null;
  const userId = String(ctx.from.id);
  await ensureUser({ id: userId, username: ctx.from.username, firstName: ctx.from.first_name });
  await ensureSeeded(userId);
  return userId;
}

function percent(amount: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((amount / total) * 1000) / 10}%`;
}

function section(title: string, total: number, rows: Map<string, { icon: string; amount: number }>): string[] {
  const sorted = [...rows.entries()].sort((a, b) => b[1].amount - a[1].amount);
  if (!sorted.length) return [`${title}: không có dữ liệu`];

  return [
    `${title}:`,
    ...sorted.map(([name, row]) => `- ${row.icon} ${name}: ${formatVND(row.amount)} (${percent(row.amount, total)})`),
  ];
}

async function quickReportText(userId: string, kind: QuickReportKind): Promise<string> {
  const period = periodOf(kind);
  const txns = await listTransactionsInRange(userId, period.start, period.end);

  let income = 0;
  let expense = 0;
  const incomeByCategory = new Map<string, { icon: string; amount: number }>();
  const expenseByCategory = new Map<string, { icon: string; amount: number }>();

  for (const t of txns) {
    const isIncome = t.type === "INCOME";
    const name = t.category?.name ?? (isIncome ? "Thu nhập khác" : "Khác");
    const icon = t.category?.icon ?? (isIncome ? "➕" : "📦");
    const target = isIncome ? incomeByCategory : expenseByCategory;
    const current = target.get(name) ?? { icon, amount: 0 };
    current.amount += t.amount;
    target.set(name, current);

    if (isIncome) income += t.amount;
    else expense += t.amount;
  }

  return [
    `📊 Báo cáo nhanh - ${period.title}`,
    `📌 Kỳ: ${formatRange(period.start, period.end)}`,
    "",
    `📈 Tổng thu: ${formatVND(income)}`,
    `📉 Tổng chi: ${formatVND(expense)}`,
    `⚖️ Số dư: ${formatVND(income - expense)}`,
    `🔢 Số giao dịch: ${txns.length}`,
    "",
    ...section("📈 Chi tiết khoản thu", income, incomeByCategory),
    "",
    ...section("📉 Chi tiết khoản chi", expense, expenseByCategory),
  ].join("\n");
}

async function replyReportMenu(ctx: Context) {
  const userId = await ensureBotUser(ctx);
  if (!userId) return;
  await ctx.reply("📊 Bạn muốn xem báo cáo nhanh theo kỳ nào?", { reply_markup: reportMenuKeyboard() });
}

export function registerQuickReportHandler(bot: Bot) {
  bot.command("baocao", replyReportMenu);

  bot.callbackQuery("quick_report", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = await ensureBotUser(ctx);
    if (!userId) return;
    await ctx.reply("📊 Bạn muốn xem báo cáo nhanh theo kỳ nào?", { reply_markup: reportMenuKeyboard() });
  });

  bot.callbackQuery(/^qr:(today|this_month|last_month|ytd)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = await ensureBotUser(ctx);
    if (!userId) return;
    const kind = ctx.match[1] as QuickReportKind;
    await ctx.reply(await quickReportText(userId, kind), { reply_markup: reportBackKeyboard() });
  });
}
