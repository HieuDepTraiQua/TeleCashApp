# TeleCashApp — Kế hoạch phát triển

> ⚠️ **Cập nhật quan trọng:** Dự án dùng **npm workspaces** (KHÔNG phải pnpm như mô tả bên dưới) do xung đột Prisma + pnpm. Mọi lệnh `pnpm ...` → đọc là `npm ...`. Deploy: xem [`DEPLOY.md`](./DEPLOY.md).

> Hệ thống quản lý chi tiêu cá nhân gồm **Telegram Bot** (nhập liệu nhanh bằng tin nhắn) + **Telegram Mini App** (xem báo cáo, biểu đồ, quản lý giao dịch). Dữ liệu lưu ở **SQLite** (qua Prisma) và đồng bộ **tùy chọn** với **Google Sheets**.
>
> Quy mô mục tiêu: 1 người dùng → tối đa ~10 người. Yêu cầu: **chạy 24/7, máy cá nhân tắt vẫn chạy, chi phí ~0đ.**
>
> 📌 File này là **bản thiết kế (WHAT/WHY)**. Để **thực thi từng phase (HOW)** xem [`IMPLEMENTATION.md`](./IMPLEMENTATION.md).

---

## 1. Phân tích hệ thống

```
                    ┌─────────────────────────────┐
   Tin nhắn  ───►   │  TELEGRAM BOT (grammY)      │
   "50k ăn trưa"    │  - Parse số tiền/ngày/ghi chú│
                    │  - Tự động phân loại         │   ┌──────────────┐
                    │  - Trả về xác nhận + tổng    │──►│              │
                    └─────────────────────────────┘   │   SQLite     │
                                                       │  (1 file)    │
                    ┌─────────────────────────────┐   │              │
   Mini App  ◄───►  │  API (Hono)                 │◄─►│  Giao dịch   │
   (WebView)        │  - Auth bằng Telegram initData│  │  Người dùng  │
                    │  - CRUD giao dịch            │   │  Danh mục    │
                    │  - Báo cáo, biểu đồ, export  │   └──────┬───────┘
                    └─────────────────────────────┘          │ sync (tùy chọn)
                                                              ▼
                                                       ┌──────────────┐
                                                       │ GOOGLE SHEETS│
                                                       │ (Drive user) │
                                                       └──────────────┘
```

**Luồng chính:**
1. User gõ tin nhắn → Bot parse → lưu giao dịch → trả thẻ xác nhận (mã `GDxxx`, danh mục, ngày, số tiền) + tổng thu/chi tháng.
2. User mở Mini App (`/miniapp`) → xem chi tiêu theo ngày, báo cáo tuần/tháng/năm, biểu đồ, sửa/xóa, export CSV/PDF.
3. `/ketnoi` kết nối Google Drive (OAuth) tạo Sheet cá nhân; `/dongbo` đồng bộ từ khóa danh mục từ Sheet về Bot.

---

## 2. Tech Stack

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| Ngôn ngữ | **TypeScript** (toàn bộ) | 1 ngôn ngữ cho bot + API + frontend, share logic |
| Quản lý repo | **pnpm workspaces** (monorepo) | Share package `core` (parser, categorizer) |
| Bot | **grammY** (long polling) | TS-first, hỗ trợ Mini App; long polling = không cần URL public |
| API | **Hono** (chạy chung process bot) | Nhẹ, đơn giản cho MVP |
| **Database** | **SQLite** (file, qua Prisma) | **$0, không cần DB server**; thừa sức cho 1–10 user; đổi Postgres sau dễ |
| ORM | **Prisma** | Type-safe, migration dễ. ⚠️ SQLite **không hỗ trợ `enum` & scalar list** (xem §5) |
| Frontend | **React + Vite + TypeScript** | Chuẩn Telegram Mini App |
| CSS | **Tailwind CSS** | UI custom giống ảnh, dựng nhanh |
| Biểu đồ | **Recharts** | Bar + Donut dễ làm |
| Data fetching | **TanStack Query** | Cache, loading/error state |
| Telegram SDK | **@twa-dev/sdk** | initData, theme, MainButton |
| Validate | **Zod** | Validate payload API + env (thay vai trò type-check runtime cho enum) |
| Google | **googleapis** | Sheets + Drive + OAuth2 |
| Export PDF | **Puppeteer** (server) | Render HTML→PDF khớp bản xem trước |
| Test | **Vitest** | Unit test cho `core` (parser/categorizer) |
| Frontend host | **Cloudflare Pages** | $0, HTTPS, URL cố định (xem §4) |
| Backend host | **Oracle Free VM** (mặc định) / Fly.io | $0 always-on (xem §4) |

---

## 3. Lưu trữ dữ liệu: SQLite + đồng bộ Google Sheets

Bản app gốc dùng Google Sheets làm kho chính. **Quyết định: dùng SQLite làm nguồn sự thật, Google Sheets là tính năng đồng bộ/backup tùy chọn.**

| Tiêu chí | Google Sheets làm DB chính | **SQLite (Prisma) + Sheets sync** ✅ |
|---|---|---|
| Chi phí / hạ tầng | Free nhưng phụ thuộc Google API | **$0, chỉ là 1 file**, không cần DB server |
| Tốc độ báo cáo/biểu đồ | Chậm (~1–2s/call), rate limit | Nhanh (mili-giây), aggregate bằng SQL |
| Ghi đồng thời (bot + app) | Dễ race condition | An toàn (transaction) |
| Tìm kiếm/lọc | Phải tải hết về | `WHERE`/`LIKE`/index |
| Quy mô 1–10 user | OK nhưng chậm | **Thừa sức**, đơn giản |

→ **Hybrid**: SQLite chạy app (CRUD, báo cáo, search nhanh). Google Sheets giữ vai trò: (1) nơi user xem dữ liệu thô, (2) backup, (3) nguồn cấu hình từ khóa danh mục cho `/dongbo`. Đồng bộ SQLite→Sheet khi tạo giao dịch hoặc theo lịch.

> SQLite thừa sức cho quy mô này. Khi cần nhiều user/đa vùng mới cân nhắc đổi `provider` Prisma sang PostgreSQL (sửa schema tối thiểu).

---

## 4. Hosting & Chi phí (mục tiêu $0, always-on, máy cá nhân tắt vẫn chạy)

**Nguyên tắc tách 2 phần:** Frontend (tĩnh) host free vĩnh viễn; Backend (bot+API+SQLite) cần 1 chỗ "luôn bật".

### Kiến trúc deploy đề xuất
```
Cloudflare Pages (frontend, $0, HTTPS) ──► Oracle Free VM ($0, always-on, máy ở data center)
                                            ├── Bot (grammY, long polling)
                                            ├── API (Hono) ── Caddy (HTTPS tự động)
                                            └── SQLite (file dev.db trên ổ đĩa VM)
```
> Oracle VM là **máy ở data center của Oracle**, KHÔNG dùng tài nguyên máy cá nhân. Máy cá nhân chỉ là "điều khiển từ xa" (SSH), tắt mở tùy ý.

### So sánh nơi đặt backend (cho ~10 user đều thừa sức)
| | **Oracle Free VM** ⭐ | **Fly.io** | **Cloudflare Workers+D1** |
|---|---|---|---|
| Chi phí 24/7 | **0đ vĩnh viễn** | ~$2–3/tháng, cần thẻ | **0đ** |
| Always-on | ✅ | ✅ | ✅ (serverless) |
| Giữ nguyên stack (Prisma, Puppeteer, long-polling) | ✅ chạy hết | ✅ chạy hết | ❌ đổi: webhook + Drizzle + PDF client |
| Công sức vận hành | Cao (Linux/SSH/Caddy) | Thấp (`fly deploy`) | Trung bình (serverless) |
| HTTPS | Tự dựng (Caddy + DuckDNS/domain) | Tự động | Tự động |

**Khuyến nghị:** **Oracle Free VM** — $0 thật, giữ nguyên toàn bộ plan. Chọn **Fly.io** nếu ngại Linux (đổi lại tốn ~vài chục nghìn/tháng).

### Lúc đang dev (trên máy cá nhân) = 0đ, không cần internet public
- DB = SQLite file. Bot = **long polling** (không cần URL public). API = `localhost`.
- Test Mini App thật: **Cloudflare Tunnel** (`cloudflared tunnel --url http://localhost:3000`) → HTTPS tạm thời, $0.

### Bảng chi phí
| | Dev (máy cá nhân) | Chạy thật 24/7 |
|---|---|---|
| DB | SQLite — 0đ | SQLite trên VM — 0đ |
| Bot + API | localhost — 0đ | Oracle VM — 0đ |
| Frontend HTTPS | Cloudflare Tunnel — 0đ | Cloudflare Pages — 0đ |
| Domain (tùy chọn) | không cần | DuckDNS 0đ, hoặc domain ~25–60k đ/năm |
| **Tổng** | **0đ** | **0đ** |

⚠️ **Bẫy:** Render/Railway free + SQLite = **mất data** (ổ ephemeral). Nếu dùng host kiểu đó phải đổi sang **Turso/Neon** (DB cloud).

---

## 5. Mô hình dữ liệu (Prisma — SQLite-safe)

> ⚠️ **3 lưu ý Prisma + SQLite** (khác Postgres):
> 1. **Không hỗ trợ `enum`** → dùng `String` + validate bằng Zod ở tầng app.
> 2. **Không hỗ trợ scalar list** (`String[]`) → tách bảng `Keyword` riêng.
> 3. `DATABASE_URL` dạng `file:./dev.db`.

```prisma
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }   // "file:./dev.db"
generator client { provider = "prisma-client-js" }

model User {
  id              String   @id                     // Telegram user id (string)
  username        String?
  firstName       String?
  timezone        String   @default("Asia/Ho_Chi_Minh")
  currency        String   @default("VND")
  googleConnected Boolean  @default(false)
  googleTokens    String?                          // JSON string (refresh token...), MÃ HÓA
  sheetId         String?                          // Google Sheet cá nhân
  seq             Int      @default(0)             // bộ đếm sinh mã GDxxx
  createdAt       DateTime @default(now())
  transactions    Transaction[]
  categories      Category[]
}

model Transaction {
  id          String    @id @default(cuid())
  code        String                              // "GD036" (hiển thị)
  userId      String
  type        String                              // "INCOME" | "EXPENSE"  (validate bằng Zod)
  amount      Int                                 // VND, số nguyên
  content     String                              // "ăn trưa"
  categoryId  String?
  subCategory String?                             // "phân loại chi tiết"
  note        String?                             // ghi chú trong ()
  date        DateTime                            // ngày giao dịch
  source      String    @default("BOT")           // "BOT" | "MINIAPP"
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id])
  category    Category? @relation(fields: [categoryId], references: [id])

  @@unique([userId, code])
  @@index([userId, date])
}

model Category {
  id           String    @id @default(cuid())
  userId       String
  name         String                             // "Ăn uống"
  icon         String?                            // emoji
  type         String                             // "INCOME" | "EXPENSE"
  user         User      @relation(fields: [userId], references: [id])
  keywords     Keyword[]
  transactions Transaction[]
}

model Keyword {
  id         String   @id @default(cuid())
  categoryId String
  text       String                               // "ăn trưa"
  normalized String                               // "an trua" (bỏ dấu, để match)
  category   Category @relation(fields: [categoryId], references: [id])
  @@index([categoryId])
}
```

Map cột Google Sheet: `NGÀY→date · PHÂN LOẠI→type · ID→code · DANH MỤC→category.name · SỐ TIỀN→amount · PHÂN LOẠI CHI TIẾT→subCategory · GHI CHÚ→note`.

---

## 6. Chi tiết tính năng

### 6.1. Bot Parser (trái tim hệ thống)
| Bước | Quy tắc | Ví dụ |
|---|---|---|
| 1. Loại | `+` ở đầu → **Thu nhập**, ngược lại **Chi tiêu** | `+10m lương` |
| 2. Ngày | `^(\d{1,2})/(\d{1,2})(/\d{2,4})?` ở đầu → ngày GD | `12/06 1m5 ...` |
| 3. Ghi chú | `(...)` ở cuối → note | `500k siêu thị (mua cả tuần)` |
| 4. Số tiền | token số đầu tiên (k/m/tr/dấu chấm) | xem bảng dưới |
| 5. Nội dung | phần còn lại | `ăn trưa` |

**Quy tắc số tiền:**
| Input | Kết quả | Quy tắc |
|---|---|---|
| `50k` / `500k` | 50.000 / 500.000 | k = ×1.000 |
| `1m` / `1tr` | 1.000.000 | m/tr = ×1.000.000 |
| `1m5` / `1.5m` / `1tr5` | 1.500.000 | phần sau đơn vị = thập phân |
| `10m` | 10.000.000 | |
| `1k5` | 1.500 | 1.5×1.000 |
| `35.000` / `35000` | 35.000 | không đơn vị → bỏ `.` = số nguyên |
| `1.500.000` | 1.500.000 | dấu `.` = ngăn cách nghìn |

> Thuật toán: có chữ đơn vị `k|m|tr` → `value = parseFloat("<int>.<frac>") × unit`. Không có đơn vị → bỏ `.`/`,` rồi parse integer.

### 6.2. Engine phân loại tự động
- Map `keyword → category` (đồng bộ từ Sheet qua `/dongbo`), lưu ở bảng `Keyword`.
- Chuẩn hóa: lowercase + bỏ dấu tiếng Việt (`gửi xe` ~ `gui xe`) → so với `Keyword.normalized`.
- Khớp nội dung với keyword → trả category; không khớp → "Khác".
- **v2:** fallback **Claude API** phân loại fuzzy khi không match.

### 6.3. Lệnh Bot
| Lệnh | Chức năng |
|---|---|
| (tin nhắn thường) | Ghi giao dịch theo cú pháp |
| `/start` | Chào mừng + tạo user + seed danh mục mặc định + hướng dẫn |
| `/ketnoi` | OAuth Google Drive → tạo Sheet cá nhân |
| `/dongbo` | Đọc danh mục/từ khóa từ Sheet → cập nhật DB |
| `/miniapp` | Gửi nút mở Mini App |
| `/huongdan` | Xem lại hướng dẫn |

**Thẻ xác nhận** sau mỗi giao dịch: `✅ Đã ghi nhận` + Mã GD · Nội dung · Số tiền · Ngày · Phân loại + `Tổng thu/chi tháng`.

### 6.4. Mini App (5 tab — khớp ảnh)
**Giao dịch · Báo cáo · Tìm kiếm · Từ khóa · Về app**
- **Giao dịch:** thẻ chi tiêu trong ngày + điều hướng ngày, thu nhập/số dư, so sánh ngày trước, danh sách (icon danh mục, STT, mã GD, Sửa/Xóa), modal Thêm/Sửa.
- **Báo cáo:** Theo tuần/tháng/năm/tùy chọn; 3 thẻ tổng (thu/chi/số dư + so kỳ trước); **Bar chart** (thu-chi theo ngày); **Donut** (chi theo danh mục); **Xuất CSV/PDF**; bảng chi tiết.
- **Tìm kiếm:** theo nội dung/danh mục/khoảng tiền/khoảng ngày.
- **Từ khóa:** CRUD danh mục + từ khóa, đồng bộ 2 chiều với Sheet.
- **Về app:** thông tin, hướng dẫn, trạng thái kết nối Google.

### 6.5. Auth Mini App
Telegram cấp `initData` (ký HMAC bằng bot token). Backend **validate chữ ký** → xác định `userId`. **Không** tin `user.id` client nếu chưa verify. (Chi tiết thuật toán ở `IMPLEMENTATION.md` §Appendix.)

### 6.6. Export
- **CSV:** stream giao dịch theo kỳ (đúng cột như Sheet).
- **PDF:** server render HTML (giống "Xem trước báo cáo") → Puppeteer xuất PDF.

---

## 7. Lộ trình phát triển (mỗi phase demo được)
| Phase | Nội dung | Demo |
|---|---|---|
| **P0** Setup | Monorepo, Prisma+SQLite, bot rỗng, BotFather | `pnpm dev` chạy, `/start` trả lời |
| **P1** Bot core | Parser + ghi giao dịch + thẻ xác nhận + mã GDxxx + tổng tháng | gõ `50k ăn trưa` → bot ghi |
| **P2** Phân loại | Category + keyword + bỏ dấu TV + seed mặc định | tự gắn "Ăn uống/Đi lại" |
| **P3** Mini App khung | React + verify initData + tab Giao dịch + CRUD | mở app, sửa/xóa |
| **P4** Báo cáo | Aggregate tuần/tháng/năm + Bar + Donut + bảng | tab Báo cáo đủ |
| **P5** Export | CSV + PDF (Puppeteer) | bấm xuất ra file |
| **P6** Google | `/ketnoi` OAuth + `/dongbo` + sync | dữ liệu lên Drive |
| **P7** Tìm kiếm & Từ khóa | tab Search + quản lý danh mục + Về app | tìm & quản lý từ khóa |
| **P8** Polish & Deploy | validate, format VND, deploy Oracle/Fly + Pages | bản chạy thật HTTPS, PC tắt vẫn chạy |
| **V2** | AI categorize (Claude), nhắc nhở định kỳ, hạn mức ngân sách, nhiều ví | |

---

## 8. Cấu trúc thư mục (monorepo)
```
telecashapp/
├── apps/
│   ├── server/                 # bot + api chung 1 service
│   │   └── src/
│   │       ├── bot/           # handlers, commands, keyboards
│   │       ├── api/           # routes mini app (Hono)
│   │       ├── google/        # OAuth, Sheets, Drive
│   │       ├── auth/          # verify Telegram initData
│   │       └── index.ts
│   └── miniapp/                # React + Vite frontend
│       └── src/
│           ├── pages/         # Transactions, Reports, Search, Keywords, About
│           ├── components/    # charts, cards, modals
│           ├── lib/           # twa sdk, api client, format VND
│           └── main.tsx
├── packages/
│   ├── core/                   # parser, categorizer, format (THUẦN logic, có test) — share bot↔api
│   ├── db/                     # prisma schema + client
│   └── types/                  # type/DTO dùng chung
├── docs/{PLAN.md, IMPLEMENTATION.md}
├── package.json                # pnpm workspaces
└── .env.example
```

---

## 9. Bảo mật & vận hành
- **Không commit** bot token / Google secret → `.env` + secret khi deploy.
- Validate **initData** mọi request Mini App (HMAC bot token).
- **Mã hóa** Google refresh token trong DB.
- Rate limit bot + validate input bằng Zod.
- Mini App **bắt buộc HTTPS**.
- Múi giờ `Asia/Ho_Chi_Minh` (UTC+7) khi tính "hôm nay/ngày".
- Tiền VND: dấu `.` ngăn cách nghìn, hậu tố `đ`.
- **Backup**: cron copy `dev.db` định kỳ + export Sheet.

---

## 10. Next steps
1. ✅ Chốt: **SQLite + Sheets sync**, **bot+api chung 1 service**, deploy **Oracle Free VM** (Fly.io dự phòng).
2. Đăng ký bot **@BotFather** → lấy `BOT_TOKEN`, bật Menu Button (Web App URL).
3. Bắt đầu **P0** theo [`IMPLEMENTATION.md`](./IMPLEMENTATION.md).
4. Google Cloud (khi tới P6): bật Sheets API + Drive API + OAuth consent.
