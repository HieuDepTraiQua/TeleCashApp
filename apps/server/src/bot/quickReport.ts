import type { Bot, Context } from "grammy";
import { formatVND } from "@telecash/core";
import { ensureSeeded, ensureUser, rangeTotals } from "@telecash/db";

function startOfToday(ref: Date): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function formatRange(start: Date, endExclusive: Date): string {
  const end = addDays(endExclusive, -1);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(start)}–${fmt(end)}`;
}

async function quickReportText(userId: string, now = new Date()): Promise<string> {
  const todayStart = startOfToday(now);
  const tomorrow = addDays(todayStart, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [today, thisMonth, lastMonth, yearToDate] = await Promise.all([
    rangeTotals(userId, todayStart, tomorrow),
    rangeTotals(userId, monthStart, nextMonthStart),
    rangeTotals(userId, lastMonthStart, monthStart),
    rangeTotals(userId, yearStart, tomorrow),
  ]);

  const line = (label: string, range: string, data: { income: number; expense: number }) => {
    const balance = data.income - data.expense;
    return [
      `*${label}* (${range})`,
      `  📈 Thu: ${formatVND(data.income)}`,
      `  📉 Chi: ${formatVND(data.expense)}`,
      `  ⚖️ Số dư: ${formatVND(balance)}`,
    ].join("\n");
  };

  return [
    "📊 *Báo cáo nhanh*",
    "",
    line("Hôm nay", formatRange(todayStart, tomorrow), today),
    "",
    line("Tháng này", formatRange(monthStart, nextMonthStart), thisMonth),
    "",
    line("Tháng trước", formatRange(lastMonthStart, monthStart), lastMonth),
    "",
    line("Từ đầu năm đến giờ", formatRange(yearStart, tomorrow), yearToDate),
  ].join("\n");
}

async function replyQuickReport(ctx: Context) {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);
  await ensureUser({ id: userId, username: ctx.from.username, firstName: ctx.from.first_name });
  await ensureSeeded(userId);
  await ctx.reply(await quickReportText(userId), { parse_mode: "Markdown" });
}

export function registerQuickReportHandler(bot: Bot) {
  bot.command("baocao", replyQuickReport);
  bot.callbackQuery("quick_report", async (ctx) => {
    await ctx.answerCallbackQuery();
    await replyQuickReport(ctx);
  });
}
