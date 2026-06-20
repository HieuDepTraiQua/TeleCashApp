import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { InlineKeyboard } from "grammy";
import { env } from "./env";
import { bot } from "./bot/bot";
import { registerMessageHandler } from "./bot/message";
import { api } from "./api/app";

const HELP = [
  "👋 *TeleCashApp* — quản lý chi tiêu siêu nhanh!",
  "",
  "📝 *NHẬP GIAO DỊCH* (gõ thẳng tin nhắn):",
  "• `50k ăn trưa` — chi tiêu hôm nay",
  "• `12/06 1m5 tiền nhà` — theo ngày cụ thể",
  "• `500k chợ (mua cả tuần)` — kèm ghi chú",
  "• `+10m lương tháng` — thu nhập (thêm dấu +)",
  "💡 `k` = nghìn, `m` = triệu (vd `1m5` = 1.500.000đ)",
  "🏷️ Bot *tự động phân loại* (Ăn uống, Đi lại, Y tế…)",
  "",
  "📊 *XEM BÁO CÁO* — bấm /miniapp:",
  "• Giao dịch theo ngày · thêm/sửa/xóa",
  "• Báo cáo tuần/tháng/năm + biểu đồ cột & tròn",
  "• Xuất CSV/PDF · tìm kiếm · quản lý từ khóa",
  "",
  "⚙️ *LỆNH:*",
  "/huongdan — xem lại hướng dẫn",
  "/miniapp — mở ứng dụng",
].join("\n");

bot.command("start", (ctx) => ctx.reply(HELP, { parse_mode: "Markdown" }));
bot.command("huongdan", (ctx) => ctx.reply(HELP, { parse_mode: "Markdown" }));
bot.command("miniapp", async (ctx) => {
  if (!env.WEBAPP_URL) {
    await ctx.reply("⚠️ Chưa cấu hình WEBAPP_URL trong .env (sẽ có khi chạy tunnel/deploy).");
    return;
  }
  await ctx.reply("Mở ứng dụng quản lý chi tiêu:", {
    reply_markup: new InlineKeyboard().webApp("📊 Mở Mini App", env.WEBAPP_URL),
  });
});

registerMessageHandler(bot);
bot.catch((err) => console.error("❌ Bot error:", err));

// HTTP: API (/api/*) + frontend tĩnh (cùng 1 origin)
const app = new Hono();
app.route("/api", api);
app.use("/*", serveStatic({ root: "./apps/miniapp/dist" }));
app.get("*", serveStatic({ path: "./apps/miniapp/dist/index.html" }));

serve({ fetch: app.fetch, port: env.PORT }, (info) =>
  console.log(`🌐 API + web: http://localhost:${info.port}`),
);

console.log("🤖 Đang khởi động bot (long polling)...");
void bot.start({
  onStart: async (info) => {
    console.log(`✅ Bot @${info.username} đã sẵn sàng!`);
    // Menu lệnh hiện khi gõ "/" hoặc bấm nút menu trong Telegram
    try {
      await bot.api.setMyCommands([
        { command: "start", description: "Bắt đầu & hướng dẫn" },
        { command: "huongdan", description: "Cú pháp nhập chi tiêu nhanh" },
        { command: "miniapp", description: "Mở ứng dụng: báo cáo, biểu đồ, tìm kiếm" },
      ]);
    } catch (e) {
      console.error("setMyCommands:", e);
    }
    if (env.WEBAPP_URL) {
      try {
        await bot.api.setChatMenuButton({
          menu_button: { type: "web_app", text: "Mini App", web_app: { url: env.WEBAPP_URL } },
        });
      } catch (e) {
        console.error("setChatMenuButton:", e);
      }
    }
  },
});
