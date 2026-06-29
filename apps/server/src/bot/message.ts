import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import { parseMessage } from "@telecash/core";
import { ensureUser, ensureSeeded, createTransaction, monthlyTotals, listCategories } from "@telecash/db";
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
      categorySource: cat.source,
    });
    const totals = await monthlyTotals(userId, parsed.date);
    await ctx.reply(buildConfirmation({ ...tx, categoryName: cat.name }, totals));

    if (cat.isFallback) {
      const categories = await listCategories(userId);
      const sameType = categories.filter((c) => c.type === parsed.type);
      const keyboard = new InlineKeyboard();
      sameType.forEach((c, index) => {
        keyboard.text(`${c.icon ?? "🏷️"} ${c.name}`, `cat:${tx.id}:${c.id}`);
        if (index % 2 === 1) keyboard.row();
      });
      await ctx.reply("🏷️ Mình chưa xác định chắc danh mục. Chọn giúp mình để lần sau tự phân loại đúng hơn:", {
        reply_markup: keyboard,
      });
    }
  });
}
