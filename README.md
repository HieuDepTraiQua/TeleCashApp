# TeleCashApp

TeleCashApp là ứng dụng quản lý thu/chi cá nhân qua **Telegram Bot** và **Telegram Mini App**.

Người dùng có thể nhắn giao dịch trực tiếp cho bot, ví dụ `50k ăn trưa` hoặc `+10m lương tháng`. Bot sẽ parse nội dung, lưu vào database, tự phân loại theo từ khóa, rồi hiển thị lại trong Mini App để xem/sửa/xóa, tìm kiếm, báo cáo và export.

## 1. Repo này có gì

### Công nghệ chính

- **TypeScript**
- **npm workspaces**
- **Node.js >= 20**
- **Telegram Bot** bằng `grammy`
- **API backend** bằng `Hono`
- **Telegram Mini App** bằng `React + Vite`
- **Database**: SQLite qua `Prisma`
- **Test**: `Vitest`
- **Deploy**: VPS/VM chạy Node service bằng `PM2`, reverse proxy HTTPS bằng `Caddy`

### Cấu trúc thư mục

```text
.
├── apps
│   ├── server          # Telegram bot + API Hono
│   └── miniapp         # React/Vite Telegram Mini App
├── packages
│   ├── core            # Logic thuần: parser, categorizer, period, csv, format
│   ├── db              # Prisma schema, migrations, repo helpers
│   └── types           # Types/constants dùng chung
├── deploy
│   └── oracle-setup.sh # Script setup/deploy nhanh trên Ubuntu VPS
├── docs
│   ├── DEPLOY.md
│   ├── IMPLEMENTATION.md
│   └── PLAN.md
├── Dockerfile
├── fly.toml
├── package.json
└── README.md
```

## 2. Tính năng chính

### Telegram Bot

- Nhận tin nhắn thu/chi dạng tự nhiên.
- Parse số tiền dạng `k`, `m`, `tr`, ví dụ:
  - `50k ăn trưa`
  - `1k5 trà đá`
  - `1.500.000 tiền học`
  - `+10m lương tháng`
  - `12/06 1m5 đóng tiền nhà`
  - `500k siêu thị (mua đồ cả tuần)`
- Tự xác định loại giao dịch:
  - Có dấu `+` ở đầu: thu nhập.
  - Không có `+`: chi tiêu.
- Tự sinh mã giao dịch `GDxxx`.
- Tự phân loại giao dịch theo từ khóa.
- Trả thẻ xác nhận sau khi ghi giao dịch.
- Có lệnh mở Mini App.

### Telegram Mini App

- Xem giao dịch theo ngày.
- Thêm/sửa/xóa giao dịch.
- Xem báo cáo tuần/tháng/năm/tùy chọn.
- Biểu đồ thu/chi và danh mục.
- Tìm kiếm giao dịch.
- Quản lý danh mục/từ khóa.
- Export CSV/PDF.

## 3. Yêu cầu môi trường

Cần có:

- Node.js >= 20
- npm
- Git
- Telegram bot token lấy từ `@BotFather`

Kiểm tra:

```bash
node -v
npm -v
git --version
```

## 4. Cài đặt local

Clone repo:

```bash
git clone <URL_REPO_CUA_BAN> telecash
cd telecash
```

Cài dependencies:

```bash
npm install
```

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Trên Windows PowerShell có thể dùng:

```powershell
Copy-Item .env.example .env
```

Cập nhật `.env`:

```env
BOT_TOKEN=your-telegram-bot-token
DATABASE_URL="file:./dev.db"
PORT=3000
WEBAPP_URL=https://your-miniapp-url
TZ=Asia/Ho_Chi_Minh
```

## 5. Database

Generate Prisma client:

```bash
npm run db:generate
```

Chạy migration local:

```bash
npm run db:migrate
```

Mở Prisma Studio nếu cần xem dữ liệu:

```bash
npm run db:studio
```

## 6. Chạy app local

### Chạy backend + bot

```bash
npm run dev
```

Lệnh này chạy server từ:

```text
apps/server/src/index.ts
```

Backend sẽ gồm:

- Telegram bot long polling.
- API Hono.
- Serve Mini App build nếu đã build frontend.

### Chạy frontend Mini App riêng trong dev mode

Mở terminal khác:

```bash
npm run dev:web
```

Vite thường chạy ở:

```text
http://localhost:5173
```

### Build frontend

```bash
npm run build:web
```

### Build toàn bộ

```bash
npm run build
```

## 7. Test và kiểm tra code

Chạy typecheck:

```bash
npm run typecheck
```

Chạy test:

```bash
npm run test
```

Trước khi commit/push nên chạy tối thiểu:

```bash
npm run typecheck
npm run test
npm run build
```

## 8. Cách commit và đẩy code lên Git

Kiểm tra thay đổi:

```bash
git status
```

Stage file:

```bash
git add .
```

Commit:

```bash
git commit -m "feat: update telecash app"
```

Push lên branch hiện tại, ví dụ `main`:

```bash
git push origin main
```

Nếu branch chưa có upstream:

```bash
git push -u origin main
```

## 9. Deploy lần đầu trên Ubuntu VPS

Điều kiện:

- Có Ubuntu VPS/VM với IP public.
- Domain/subdomain đã trỏ về IP VPS.
- Mở port `80` và `443`.
- Có `BOT_TOKEN`.

SSH vào VPS:

```bash
ssh user@IP_SERVER
```

Cài Git nếu chưa có:

```bash
sudo apt update
sudo apt install -y git
```

Clone repo:

```bash
git clone <URL_REPO_CUA_BAN> telecash
cd telecash
```

Chạy script setup/deploy:

```bash
DOMAIN=your-domain.com BOT_TOKEN=your_bot_token bash deploy/oracle-setup.sh
```

Ví dụ:

```bash
DOMAIN=telecash.duckdns.org BOT_TOKEN=123456:abc bash deploy/oracle-setup.sh
```

Script sẽ tự:

- Cài Node.js.
- Cài PM2.
- Cài Caddy.
- Chạy `npm install`.
- Generate Prisma client.
- Build Mini App.
- Tạo `.env`.
- Chạy database migration.
- Start app bằng PM2.
- Cấu hình reverse proxy HTTPS qua Caddy.

Sau khi chạy xong, kiểm tra:

```bash
pm2 logs telecash
sudo systemctl status caddy
```

Mini App sẽ mở tại:

```text
https://your-domain.com
```

## 10. Deploy code mới đã commit lên Git

Nếu sản phẩm đang chạy trên VPS và repo đã clone sẵn, mỗi lần có code mới đã push lên Git thì SSH vào VPS rồi chạy:

```bash
cd ~/telecash
git pull --ff-only
npm install
npm run build:web
npm run db:deploy
pm2 restart telecash
pm2 logs telecash
```

Ý nghĩa từng bước:

- `git pull --ff-only`: kéo code mới từ Git về server.
- `npm install`: cập nhật dependencies nếu `package.json`/`package-lock.json` đổi.
- `npm run build:web`: build lại Telegram Mini App.
- `npm run db:deploy`: apply Prisma migration trên production.
- `pm2 restart telecash`: restart app để chạy code mới.
- `pm2 logs telecash`: xem log để kiểm tra lỗi.

Nếu chắc chắn không đổi dependency thì vẫn có thể giữ `npm install` cho an toàn. Nếu chắc chắn không đổi database schema thì `npm run db:deploy` thường không làm gì thêm, nhưng vẫn nên chạy để tránh quên migration.

## 11. Lệnh vận hành production hữu ích

Xem danh sách process PM2:

```bash
pm2 status
```

Xem log app:

```bash
pm2 logs telecash
```

Restart app:

```bash
pm2 restart telecash
```

Stop app:

```bash
pm2 stop telecash
```

Start lại app đã cấu hình trong PM2:

```bash
pm2 start telecash
```

Kiểm tra Caddy:

```bash
sudo systemctl status caddy
```

Restart Caddy:

```bash
sudo systemctl restart caddy
```

## 12. Kiểm tra sau deploy

Sau mỗi lần deploy code mới, nên test nhanh:

1. Mở Telegram bot.
2. Gửi `/start`.
3. Gửi thử giao dịch:

```text
50k ăn trưa
```

4. Gửi `/miniapp`.
5. Mở Mini App.
6. Kiểm tra giao diện/code mới đã lên chưa.
7. Xem log:

```bash
pm2 logs telecash
```

## 13. Lưu ý quan trọng

- `git push` chỉ đưa code lên GitHub/Git remote. Server production **không tự cập nhật** nếu chưa có CI/CD.
- Muốn sản phẩm chạy code mới thì phải SSH vào VPS và chạy flow deploy update ở mục 10.
- SQLite đang nằm trên VPS, cần backup file database định kỳ.
- Không commit file `.env` hoặc secret lên Git.
- Nếu đổi domain hoặc URL Mini App thì cần cập nhật `WEBAPP_URL` và cấu hình BotFather/Menu Button nếu cần.
- Nếu API Mini App trả `401`, nguyên nhân thường là mở ngoài Telegram hoặc Telegram `initData` không hợp lệ.

## 14. Flow thường dùng nhất

### Local trước khi push

```bash
npm run typecheck
npm run test
npm run build
git add .
git commit -m "feat: update app"
git push origin main
```

### Trên VPS sau khi push

```bash
cd ~/telecash
git pull --ff-only
npm install
npm run build:web
npm run db:deploy
pm2 restart telecash
pm2 logs telecash
```
