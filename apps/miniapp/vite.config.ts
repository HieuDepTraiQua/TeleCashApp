import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// base "./" -> đường dẫn asset tương đối để chạy được dù phục vụ ở origin/đường dẫn nào.
// alias -> tái dùng @telecash/core (parseAmount, formatVND) ngay trong frontend.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@telecash/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@telecash/types": path.resolve(__dirname, "../../packages/types/src/index.ts"),
    },
  },
  server: { port: 5173 },
  build: { outDir: "dist", emptyOutDir: true },
});
