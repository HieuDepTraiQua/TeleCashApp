# Deploy TeleCashApp

TeleCashApp deploy theo kieu 1 service Node:
- Telegram bot long polling
- API Hono
- frontend Mini App da build
- SQLite tren cung VPS

## Cach nhanh nhat tren Ubuntu VPS

Dieu kien:
- Ubuntu VPS da co IP public
- domain/subdomain da tro ve VPS
- da mo cong `80` va `443`
- co `BOT_TOKEN` tu `@BotFather`

Chay tren VPS:

```bash
sudo apt update
sudo apt install -y git
git clone <URL_REPO_CUA_BAN> telecash
cd telecash
DOMAIN=telecash.duckdns.org BOT_TOKEN=123456:abc bash deploy/oracle-setup.sh
```

Script se:
- cai Node.js
- cai PM2
- cai Caddy
- `npm install`
- `npm run db:generate`
- `npm run build:web`
- tao `.env`
- `npm run db:deploy`
- chay app bang PM2
- reverse proxy HTTPS qua Caddy

Sau khi xong:

```bash
pm2 logs telecash
sudo systemctl status caddy
```

Mini App se mo tai:

```text
https://telecash.duckdns.org
```

## Neu repo da co san tren VPS

Khong can clone lai. Chay:

```bash
cd ~/telecash
git pull --ff-only
DOMAIN=telecash.duckdns.org BOT_TOKEN=123456:abc bash deploy/oracle-setup.sh
```

## Bien moi truong

Script tao file `.env` nhu sau:

```env
BOT_TOKEN=...
DATABASE_URL="file:./dev.db"
PORT=3000
WEBAPP_URL=https://your-domain
TZ=Asia/Ho_Chi_Minh
```

Repo validate env tai [apps/server/src/env.ts](</D:/Hieu/Hieu Hoc Code/TeleCashApp/apps/server/src/env.ts:10>).

## Kiem tra sau deploy

1. Mo `https://your-domain`
2. Nhap `/start` trong Telegram
3. Nhap `50k an trua`
4. Nhap `/miniapp`
5. Bam nut mo Mini App

## Lenh huu ich

Xem log:

```bash
pm2 logs telecash
```

Restart app:

```bash
pm2 restart telecash
```

Cap nhat code:

```bash
cd ~/telecash
git pull --ff-only
npm install
npm run build:web
npm run db:deploy
pm2 restart telecash
```

## Luu y

- Neu domain chua tro dung IP, Caddy se khong cap duoc HTTPS.
- Neu mo ngoai Telegram, mot so API Mini App se bi `401` vi repo verify `initData`.
- SQLite dang nam tren VPS, nen nho backup file `dev.db` dinh ky.
