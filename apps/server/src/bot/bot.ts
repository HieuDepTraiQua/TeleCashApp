import { Bot } from "grammy";
import { env } from "../env";

// Instance bot dùng chung (index.ts đăng ký handler + start; api dùng để sendDocument).
export const bot = new Bot(env.BOT_TOKEN);
