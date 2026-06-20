import type { Bot } from "grammy";
import { parseMessage } from "@telecash/core";
import { ensureUser, ensureSeeded, createTransaction, monthlyTotals } from "@telecash/db";
import { resolveCategory } from "../categorize";
import { buildConfirmation } from "./card";

/** Đăng ký handler cho tin nhắn text thường (không phải lệnh /...). */
export function registerMessageHandler(bot: Bot) {
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith("/")) return; // để các bot.command xử lý
    if (!ctx.from) return;

    const parsed = parseMessage(text, new Date());
    if (!parsed) {
      await ctx.reply(
        "🤔 Mình chưa hiểu cú pháp. Ví dụ:\n• 50k ăn trưa\n• +10m lương tháng\n• 12/06 1m5 đóng tiền nhà",
      );
      return;
    }

    const userId = String(ctx.from.id);
    await ensureUser({ id: userId, username: ctx.from.username, firstName: ctx.from.first_name });
    await ensureSeeded(userId);

    const cat = await resolveCategory(userId, parsed.content, parsed.type);
    const tx = await createTransaction({
      userId,
      type: parsed.type,
      amount: parsed.amount,
      content: parsed.content,
      date: parsed.date,
      note: parsed.note,
      categoryId: cat.categoryId,
    });
    const totals = await monthlyTotals(userId, parsed.date);
    await ctx.reply(buildConfirmation({ ...tx, categoryName: cat.name }, totals));
  });
}
