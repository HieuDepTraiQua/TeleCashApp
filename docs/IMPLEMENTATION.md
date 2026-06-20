# TeleCashApp — Implementation Playbook (cho agent thực thi)

> ⚠️ **Cập nhật:** Dự án thực tế dùng **npm workspaces** (không phải pnpm). Mọi lệnh `pnpm ...` bên dưới → chạy bằng `npm ...`. Trạng thái: P0–P7 đã xong + verify; P6 (Google) & P8 (deploy) còn lại.

> Tài liệu **HOW**: chia nhỏ thành phase P0→P8 để **agent chạy implement tuần tự**. Bản thiết kế tổng thể (WHAT/WHY) ở [`PLAN.md`](./PLAN.md).

---

## 0. Cách dùng tài liệu này với agent

**Mỗi phase = 1 agent (1 phiên làm việc tập trung).** Chạy tuần tự, không nhảy cóc. Prompt mẫu:

```
Implement Phase P1 trong docs/IMPLEMENTATION.md.
- Làm theo đúng thứ tự mục "Việc cần làm".
- Tạo/sửa đúng các file ở mục "File".
- Tuân thủ spec ở phần Appendix khi được tham chiếu.
- Đáp ứng TẤT CẢ "Tiêu chí nghiệm thu"; chạy lệnh/test để tự kiểm chứng.
- KHÔNG động sang phase khác. Cuối cùng báo cáo việc đã làm + output test.
```

**Quy tắc bắt buộc cho agent:**
1. Phase chỉ "Done" khi **mọi tiêu chí nghiệm thu pass** và **`pnpm -w typecheck` + test xanh**.
2. Logic thuần (parser, categorizer, format) đặt ở `packages/core`, **không I/O**, **phải có unit test** (Vitest).
3. Validate mọi input ngoài (tin nhắn bot, body API, env) bằng **Zod**.
4. Không hardcode secret — đọc từ `.env` qua schema Zod.
5. Tiền tệ: số nguyên VND; ngày: theo `Asia/Ho_Chi_Minh`.
6. Commit cuối mỗi phase với message `feat(Px): ...`.

**Phụ thuộc giữa các phase:** P0 → P1 → P2 → P3 → (P4, P5, P7 song song được sau P3) → P6 → P8.

---

## Global conventions (thiết lập 1 lần ở P0)
- **Package manager:** pnpm workspaces. Node ≥ 20.
- **TS:** strict. Base config ở root, các package extends.
- **Env (Zod-parsed):** `BOT_TOKEN`, `DATABASE_URL=file:./dev.db`, `WEBAPP_URL`, `PORT=3000`. (Google thêm ở P6: `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `TOKEN_ENC_KEY`.)
- **Scripts root:** `dev` (chạy server), `typecheck`, `test`, `db:migrate`, `db:studio`.
- **Loại giá trị string (vì SQLite không có enum):** `type ∈ {INCOME, EXPENSE}`, `source ∈ {BOT, MINIAPP}` — enforce bằng Zod enum + hằng số trong `packages/types`.

---

## P0 — Setup & Foundation
**Mục tiêu:** Monorepo chạy được; bot kết nối Telegram (rỗng); SQLite + Prisma sẵn sàng.
**Cần trước:** `BOT_TOKEN` từ @BotFather.

**Việc cần làm:**
1. Khởi tạo pnpm workspace: root `package.json`, `pnpm-workspace.yaml`, `.gitignore` (bỏ `node_modules`, `*.db`, `.env`), `.env.example`, tsconfig base.
2. `packages/types`: hằng số + type chung (`TxType`, `TxSource`, DTO rỗng).
3. `packages/db`: cài Prisma, dán schema SQLite (xem PLAN §5), `prisma migrate dev --name init`, export `prisma` client.
4. `packages/core`: scaffold + cấu hình Vitest (1 test mẫu pass).
5. `apps/server`: grammY bot long polling, lệnh `/start` trả lời tĩnh; load env qua Zod; script `dev` (tsx watch).
6. Root scripts: `dev`, `typecheck`, `test`, `db:migrate`, `db:studio`.

**File:** `package.json`, `pnpm-workspace.yaml`, `.env.example`, `tsconfig.base.json`, `packages/db/{schema.prisma,src/index.ts,package.json}`, `packages/core/{src/index.ts,package.json,vitest.config.ts}`, `packages/types/src/index.ts`, `apps/server/{src/index.ts,src/env.ts,package.json}`.

**Tiêu chí nghiệm thu:**
- [ ] `pnpm install` ok; `pnpm db:migrate` tạo `dev.db`.
- [ ] `pnpm dev` chạy; nhắn `/start` cho bot → bot trả lời.
- [ ] `pnpm -w typecheck` và `pnpm -w test` xanh.

**Demo:** Bot online, trả lời `/start`.

---

## P1 — Bot core: parser + ghi giao dịch + xác nhận
**Mục tiêu:** Nhắn tin → parse → lưu giao dịch → trả thẻ xác nhận + tổng tháng. Sinh mã `GDxxx`.
**Cần trước:** P0.

**Việc cần làm:**
1. `core/parser.ts`: `parseMessage(text, now): { type, amount, content, date, note }` theo **Appendix A**. Tách hàm con: `parseAmount`, `parseDatePrefix`, `extractNote`.
2. `core/format.ts`: `formatVND(n)` ("1.500.000đ"), `formatDate(d)` (`dd/MM`).
3. `core/*.test.ts`: phủ **toàn bộ** ca trong bảng số tiền + ngày + ghi chú + thu/chi (Appendix A).
4. `db`: helper `nextCode(userId)` — tăng `User.seq` atomic trong transaction, trả `"GD"+pad(seq,3)`; `createTransaction(...)`.
5. `server/bot`: handler tin nhắn text → `parseMessage` → tạo giao dịch (categoryId tạm null) → trả thẻ xác nhận (Appendix C) + tổng thu/chi tháng (query theo tháng hiện tại).
6. Tự tạo `User` nếu chưa có (on first message / `/start`).

**File:** `packages/core/src/{parser,format,index}.ts` + test; `packages/db/src/repo.ts`; `apps/server/src/bot/{message,handlers,card}.ts`.

**Tiêu chí nghiệm thu:**
- [ ] Test parser pass 100% bảng Appendix A (gồm `1m5→1500000`, `+10m→income`, `12/06 ...→đúng ngày`, `(...)→note`).
- [ ] `50k ăn trưa` → tạo 1 giao dịch EXPENSE 50.000, content "ăn trưa", date hôm nay, mã `GDxxx` tăng dần.
- [ ] Thẻ xác nhận hiển thị đúng + tổng thu/chi tháng đúng (so với tổng query tay).
- [ ] `+10m lương tháng` → INCOME 10.000.000.

**Demo:** Hội thoại như ảnh 2.

---

## P2 — Phân loại tự động
**Mục tiêu:** Tự gán danh mục theo từ khóa (không dấu); seed danh mục mặc định cho user mới.
**Cần trước:** P1.

**Việc cần làm:**
1. `core/text.ts`: `removeDiacritics(s)`, `normalize(s)` (lowercase + bỏ dấu + trim).
2. `core/categorizer.ts`: `categorize(content, keywords[]): categoryId | null` — match `normalize(content)` chứa `keyword.normalized`; ưu tiên keyword dài nhất; không match → null (→ "Khác").
3. `db`: `seedDefaultCategories(userId)` — tạo danh mục + từ khóa mặc định (Appendix B). Gọi khi tạo user mới.
4. `server`: load + cache keyword theo user (Map, invalidate khi `/dongbo` hoặc sửa ở tab Từ khóa); khi ghi giao dịch → `categorize` → set `categoryId`; thẻ xác nhận hiện "Phân loại".

**File:** `packages/core/src/{text,categorizer}.ts` + test; cập nhật `packages/db/src/seed.ts`, `apps/server/src/bot/message.ts`.

**Tiêu chí nghiệm thu:**
- [ ] `gửi xe gym` → "Đi lại"; `ăn trưa` → "Ăn uống"; chuỗi lạ → "Khác".
- [ ] Match **không phụ thuộc dấu**: `gui xe` cũng ra "Đi lại".
- [ ] User mới được seed đầy đủ danh mục mặc định.
- [ ] Test categorizer pass.

**Demo:** Thẻ xác nhận hiện đúng "Phân loại" như ảnh 2.

---

## P3 — Mini App khung + Auth + tab Giao dịch (CRUD)
**Mục tiêu:** React app trong Telegram, API verify initData, xem giao dịch theo ngày, Thêm/Sửa/Xóa.
**Cần trước:** P2.

**Việc cần làm:**
1. `apps/miniapp`: Vite + React + TS + Tailwind + TanStack Query + @twa-dev/sdk; layout + bottom nav 5 tab (4 tab sau để placeholder).
2. `server/auth/verifyInitData.ts`: theo **Appendix D**. Middleware Hono gắn `userId` vào context; initData sai → 401.
3. API (Hono, mount chung server): 
   - `GET /api/transactions?date=YYYY-MM-DD`
   - `POST /api/transactions` (body Zod: type, amount, content, date, note?, categoryId?)
   - `PUT /api/transactions/:id`, `DELETE /api/transactions/:id`
   - `GET /api/categories`
   - `GET /api/day-summary?date=` (chi/thu/số dư + so ngày trước)
4. Frontend tab **Giao dịch**: thẻ "Chi tiêu trong ngày" + điều hướng ngày (◄ ►), thu nhập/số dư, so sánh ngày trước; danh sách (icon danh mục, STT, mã GD, nút Sửa/Xóa); modal Thêm/Sửa (Appendix E các field).
5. `lib/api.ts`: gắn `initData` vào header mọi request. `lib/format.ts`: VND.
6. Bot `/miniapp` → gửi nút Web App trỏ `WEBAPP_URL`.
7. **Dev:** hướng dẫn `cloudflared tunnel --url http://localhost:3000`, dán URL vào BotFather (Menu Button) để test thật.

**File:** `apps/miniapp/src/**`; `apps/server/src/api/{transactions,categories,summary}.ts`, `apps/server/src/auth/verifyInitData.ts`.

**Tiêu chí nghiệm thu:**
- [ ] Mở Mini App trong Telegram → thấy giao dịch hôm nay (tạo từ bot).
- [ ] Thêm/Sửa/Xóa hoạt động, phản ánh đúng trong DB và khi xem lại từ bot.
- [ ] Request thiếu/sai initData → **401**.
- [ ] Điều hướng ngày + so sánh ngày trước đúng số.

**Demo:** Như ảnh 3.

---

## P4 — Báo cáo & Biểu đồ
**Mục tiêu:** Báo cáo tuần/tháng/năm/tùy chọn + Bar + Donut + bảng chi tiết.
**Cần trước:** P3.

**Việc cần làm:**
1. API `GET /api/reports?range=week|month|year|custom&from=&to=` trả: `{ totals:{income,expense,balance}, prevComparison, perDay:[{date,income,expense}], byCategory:[{name,amount,percent,icon}], transactions:[...] }`.
   - Tuần = **Thứ 2→Chủ nhật** (Appendix F). Aggregate bằng Prisma `groupBy`.
2. Frontend tab **Báo cáo**: tab range + điều hướng kỳ (◄ Tuần 25, 2026 ►); 3 thẻ tổng (thu/chi/số dư + so kỳ trước); **Recharts Bar** (thu-chi theo ngày) + **Donut** (chi theo danh mục %); bảng chi tiết (STT, Mã GD, Nội dung, Danh mục, Ngày, Số tiền).
3. Empty/loading state.

**File:** `apps/server/src/api/reports.ts` + helper kỳ trong `packages/core/src/period.ts` (+ test); `apps/miniapp/src/pages/Reports/**`, `components/charts/**`.

**Tiêu chí nghiệm thu:**
- [ ] Số tổng & breakdown khớp tổng tính tay trên data mẫu.
- [ ] Đổi range/kỳ → dữ liệu & biểu đồ cập nhật đúng.
- [ ] So sánh kỳ trước (tăng/giảm) đúng dấu & giá trị.
- [ ] Test `period.ts` (ranh giới tuần/tháng/năm) pass.

**Demo:** Như ảnh 4.

---

## P5 — Export CSV / PDF
**Mục tiêu:** Xuất CSV và PDF báo cáo.
**Cần trước:** P4.

**Việc cần làm:**
1. API `GET /api/export/csv?range=...` → stream CSV đúng cột Sheet (NGÀY, PHÂN LOẠI, ID, DANH MỤC, SỐ TIỀN, PHÂN LOẠI CHI TIẾT, GHI CHÚ); UTF-8 BOM để Excel đọc tiếng Việt.
2. API `GET /api/export/pdf?range=...` → render HTML template (giống "Xem trước báo cáo": tiêu đề, donut, bảng chi tiết) → **Puppeteer** → trả `application/pdf`.
3. Frontend: nút "Xuất CSV" / "Xuất PDF" + modal xem trước; tải/chia sẻ file.

**File:** `apps/server/src/api/export/{csv,pdf}.ts`, `apps/server/src/templates/report.html.ts`; UI ở tab Báo cáo.

**Tiêu chí nghiệm thu:**
- [ ] CSV mở trong Excel đúng dòng/cột, **không lỗi font tiếng Việt**.
- [ ] PDF sinh ra có tổng + donut + bảng chi tiết, số khớp báo cáo.

**Demo:** Như ảnh 5. ⚠️ Puppeteer cần Chromium — ghi chú cài deps khi deploy (P8). Trên Cloudflare serverless thì phải đổi sang PDF client-side.

---

## P6 — Tích hợp Google (Drive + Sheets)
**Mục tiêu:** `/ketnoi` tạo Sheet cá nhân; `/dongbo` đồng bộ từ khóa; sync giao dịch DB→Sheet.
**Cần trước:** P3 (cần API HTTPS cho OAuth callback). **Cần trước ngoài:** Google Cloud project (Sheets API + Drive API + OAuth consent), `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `TOKEN_ENC_KEY`.

**Việc cần làm:**
1. `server/google/oauth.ts`: `/ketnoi` → bot gửi link OAuth; callback (`GET /api/google/callback`) đổi code→token, **mã hóa** lưu `User.googleTokens`, set `googleConnected=true`.
2. `server/google/sheets.ts`: tạo spreadsheet với header chuẩn; `appendTransaction`; `syncAll`.
3. `/dongbo`: đọc sheet "Danh mục/Từ khóa" → upsert `Category`+`Keyword`, invalidate cache.
4. Khi tạo giao dịch (nếu `googleConnected`) → append vào Sheet (best-effort, lỗi không chặn ghi DB).
5. Util mã hóa token (AES-GCM với `TOKEN_ENC_KEY`).

**File:** `apps/server/src/google/{oauth,sheets,crypto}.ts`, route callback, cập nhật bot commands.

**Tiêu chí nghiệm thu:**
- [ ] `/ketnoi` → tạo Sheet trong Drive user, lưu `sheetId`, token **đã mã hóa**.
- [ ] `/dongbo` → danh mục/từ khóa trong DB cập nhật theo Sheet.
- [ ] Giao dịch mới xuất hiện trong Sheet.

**Demo:** Như ảnh 6.

---

## P7 — Tìm kiếm + Từ khóa + Về app
**Mục tiêu:** Hoàn thiện 3 tab còn lại.
**Cần trước:** P3 (P6 nếu muốn sync 2 chiều).

**Việc cần làm:**
1. API `GET /api/search?q=&from=&to=&min=&max=&type=&categoryId=`.
2. API CRUD danh mục/từ khóa: `GET/POST/PUT/DELETE /api/categories`, `.../keywords`.
3. Frontend **Tìm kiếm**: form lọc + danh sách kết quả.
4. Frontend **Từ khóa**: CRUD danh mục + từ khóa (lưu cả `normalized`), nút đồng bộ Sheet.
5. Frontend **Về app**: thông tin, hướng dẫn cú pháp, trạng thái kết nối Google.

**File:** `apps/server/src/api/{search,categories,keywords}.ts`; `apps/miniapp/src/pages/{Search,Keywords,About}/**`.

**Tiêu chí nghiệm thu:**
- [ ] Tìm kiếm lọc đúng theo mọi tiêu chí.
- [ ] Thêm từ khóa mới → giao dịch sau đó phân loại theo từ khóa đó.
- [ ] Tab Về app hiện đúng trạng thái kết nối Google.

---

## P8 — Polish & Deploy
**Mục tiêu:** Validate, xử lý lỗi, format, **deploy chạy thật 24/7**.
**Cần trước:** P1–P7.

**Việc cần làm:**
1. Zod validate toàn bộ API; error middleware (trả lỗi gọn); rate-limit bot (chống spam).
2. Hoàn thiện format VND/ngày; empty/loading/error state UI.
3. **Frontend → Cloudflare Pages**: build, set `VITE_API_BASE`; lấy URL cố định → đăng ký Menu Button BotFather.
4. **Backend → Oracle Free VM** (hoặc Fly.io): viết script cài (Node, pnpm, build, **PM2/systemd**, **Caddy** HTTPS + DuckDNS/domain, cài Chromium cho Puppeteer); copy `.env` secrets; `dev.db` trên ổ VM.
5. **Cron backup** `dev.db` + export Sheet.
6. Smoke test: PC tắt → bot vẫn trả lời, Mini App vẫn mở.

**Tiêu chí nghiệm thu:**
- [ ] Mini App mở qua HTTPS trong Telegram; bot phản hồi.
- [ ] **Tắt máy cá nhân** → hệ thống vẫn chạy.
- [ ] Data còn nguyên sau khi restart service.
- [ ] PDF/CSV export chạy trên server thật.

---

# Appendix (spec dùng chung)

## A. Spec Parser (chuẩn để viết test)
Input: `text`, `now`. Output: `{ type, amount, content, date, note }`.
1. `type`: trim; nếu bắt đầu `+` → `INCOME`, bỏ `+`; ngược lại `EXPENSE`.
2. `date`: regex `^(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b` ở đầu → `date` (thiếu năm → năm hiện tại theo TZ VN); else `now`. Bỏ phần đã match khỏi text.
3. `note`: regex `\(([^)]*)\)\s*$` → `note`; bỏ khỏi text.
4. `amount`: tìm token số đầu tiên khớp `(\d+(?:[.,]\d+)?)(k|m|tr)?(\d+)?` (sau khi đã tách ngày):
   - Có đơn vị `k` → `parseFloat("int.frac") * 1_000` (frac = nhóm thập phân **hoặc** chữ số sau đơn vị).
   - Có đơn vị `m|tr` → `* 1_000_000`.
   - Không đơn vị → bỏ `.`/`,` → integer.
   - Bỏ token này khỏi text.
5. `content`: phần text còn lại, trim, gộp khoảng trắng.

**Bảng ca test (bắt buộc):**
| text | type | amount | date | content | note |
|---|---|---|---|---|---|
| `50k ăn trưa` | EXPENSE | 50000 | today | ăn trưa | – |
| `+10m lương tháng` | INCOME | 10000000 | today | lương tháng | – |
| `12/06 1m5 đóng tiền nhà` | EXPENSE | 1500000 | 12/06 | đóng tiền nhà | – |
| `500k siêu thị (mua đồ cả tuần)` | EXPENSE | 500000 | today | siêu thị | mua đồ cả tuần |
| `35k gửi xe ô tô Mỹ Đình` | EXPENSE | 35000 | today | gửi xe ô tô Mỹ Đình | – |
| `1.500.000 tiền học` | EXPENSE | 1500000 | today | tiền học | – |
| `1k5 trà đá` | EXPENSE | 1500 | today | trà đá | – |

## B. Danh mục + từ khóa mặc định (seed) — khớp ảnh
| Danh mục | icon | type | keywords (gợi ý) |
|---|---|---|---|
| Ăn uống | 🍴 | EXPENSE | ăn, ăn sáng, ăn trưa, ăn tối, cà phê, trà đá, nước ép |
| Đi lại | 🚗 | EXPENSE | gửi xe, xăng, grab, taxi, xe, rửa xe |
| Y tế | 💊 | EXPENSE | thuốc, khám, viện phí |
| Bảo hiểm | 🛡️ | EXPENSE | bhxh, bảo hiểm |
| Gia đình | 🏠 | EXPENSE | sinh hoạt phí, điện, nước, nhà |
| Sức khỏe & Thể thao | 🏃 | EXPENSE | gym, vitamin, thể thao |
| Mua sắm | 🛒 | EXPENSE | mua, siêu thị, quần áo |
| Khác | 📦 | EXPENSE | (mặc định khi không match) |
| Lương | 💰 | INCOME | lương, thưởng |
> Lưu `normalized` cho mỗi keyword (bỏ dấu).

## C. Mẫu thẻ xác nhận bot
```
✅ Đã ghi nhận:
🔢 Mã giao dịch: {code}
💸 {Chi tiêu|Thu nhập} - {content} - {amountVND}
📅 Ngày: {dd/MM}
🍴 Phân loại: {categoryName}
———————————————
📈 Tổng thu tháng {MM}: {sumIncome}
📉 Tổng chi tháng {MM}: {sumExpense}
```

## D. Verify Telegram initData (bảo mật — quan trọng)
**Khuyến nghị: dùng thư viện đã kiểm chứng** `@telegram-apps/init-data-node` (`validate(initDataRaw, BOT_TOKEN)`) thay vì tự code HMAC. Nếu tự làm, đúng thuật toán:
1. Parse query-string `initData` thành cặp key=value; tách `hash` ra.
2. `data_check_string` = các cặp còn lại **sort theo key**, nối bằng `\n` dạng `key=value`.
3. `secret_key = HMAC_SHA256(key="WebAppData", message=BOT_TOKEN)`.
4. `calc = hex(HMAC_SHA256(key=secret_key, message=data_check_string))`.
5. Hợp lệ khi `calc === hash`. Kiểm thêm `auth_date` không quá cũ (vd > 24h → từ chối).
> Xác minh lại với tài liệu Telegram hiện hành trước khi chốt; ưu tiên thư viện được maintain.

## E. Field modal Thêm/Sửa giao dịch
`type` (Chi/Thu, mặc định Chi) · `amount` (nhập số, hỗ trợ k/m như bot — tái dùng `parseAmount`) · `content` · `categoryId` (chọn) · `date` (mặc định hôm nay) · `note?`.

## F. Tính kỳ báo cáo
- Dùng `date-fns` (hoặc dayjs) với **tuần bắt đầu Thứ 2** (`weekStartsOn: 1`), múi giờ `Asia/Ho_Chi_Minh`.
- `week`: T2→CN chứa ngày mốc. `month`: ngày 1→cuối tháng. `year`: 01/01→31/12. `custom`: `from..to`.
- "Kỳ trước" = cùng độ dài liền trước (so sánh tổng).

## G. Sinh mã GDxxx (tránh race)
```ts
// trong 1 transaction Prisma
const u = await tx.user.update({ where:{id}, data:{ seq:{ increment:1 } }, select:{ seq:true }});
const code = "GD" + String(u.seq).padStart(3, "0");
```
