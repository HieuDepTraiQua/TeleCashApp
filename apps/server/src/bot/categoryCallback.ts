import type { Bot } from "grammy";
import { chooseTransactionCategory } from "@telecash/db";
import { invalidateCategoryCache } from "../categorize";

/** Handle category choice buttons for fallback transactions. */
export function registerCategoryCallback(bot: Bot) {
  bot.callbackQuery(/^cat:([^:]+):([^:]+)$/, async (ctx) => {
    if (!ctx.from) return;
    const [, txId, categoryId] = ctx.match;
    const userId = String(ctx.from.id);

    const result = await chooseTransactionCategory(userId, txId, categoryId);
    if (!result) {
      await ctx.answerCallbackQuery({ text: "Không cập nhật được danh mục", show_alert: true });
      return;
    }

    if (result.learned) invalidateCategoryCache(userId);

    await ctx.answerCallbackQuery({ text: `Đã chọn ${result.category.icon ?? "🏷️"} ${result.category.name}` });
    await ctx.editMessageText(
      result.learned
        ? `✅ Đã cập nhật danh mục: ${result.category.icon ?? "🏷️"} ${result.category.name}\nMình đã ghi nhớ nội dung này để lần sau tự phân loại.`
        : `✅ Đã giữ danh mục: ${result.category.icon ?? "🏷️"} ${result.category.name}`,
    );
  });
}
