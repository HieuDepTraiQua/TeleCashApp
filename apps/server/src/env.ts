// Nạp biến môi trường từ .env ở ROOT repo (chạy được dù cwd ở đâu) + validate bằng Zod.
import { config } from "dotenv";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // apps/server/src
config({ path: resolve(here, "../../../.env") }); // -> root/.env

const EnvSchema = z.object({
  BOT_TOKEN: z.string().min(1, "Thiếu BOT_TOKEN trong .env"),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  PORT: z.coerce.number().int().positive().default(3000),
  WEBAPP_URL: z.string().default(""),
});

export const env = EnvSchema.parse(process.env);
