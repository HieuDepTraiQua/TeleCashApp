# Deploy TeleCashApp (chạy 24/7, máy cá nhân tắt vẫn chạy)

Kiến trúc: **1 service Node** (bot long-polling + API + phục vụ frontend tĩnh) + **SQLite**. Chọn 1 trong 2 cách.

> Trước khi deploy, đảm bảo đã commit code lên GitHub (cho cách Oracle) và app chạy ổn ở local.

---

## ⭐ Cách A — Fly.io (dễ nhất, ~$0–3/tháng)
Cần: tài khoản Fly.io + thẻ (để verify). Mọi thứ đã có sẵn (`Dockerfile`, `fly.toml`).

1. Cài flyctl (Windows PowerShell): `pwr -c "iwr https://fly.io/install.ps1 -useb | iex"`
2. `fly auth login`
3. Sửa `app = "telecashapp"` trong **fly.toml** → tên duy nhất của bạn (vd `telecash-hieu`).
4. Tạo app + volume lưu SQLite:
   ```bash
   fly apps create telecash-hieu
   fly volumes create telecash_data --size 1 --region sin --app telecash-hieu
   ```
5. Đặt secrets:
   ```bash
   fly secrets set BOT_TOKEN=token_cua_ban --app telecash-hieu
   fly secrets set WEBAPP_URL=https://telecash-hieu.fly.dev --app telecash-hieu
   ```
   (DATABASE_URL, PORT, TZ đã nằm trong fly.toml)
6. `fly deploy`
7. ✅ App chạy 24/7 tại `https://telecash-hieu.fly.dev` — URL Mini App **cố định mãi**, không cần tunnel.

---

## Cách B — Oracle Cloud Free VM ($0 vĩnh viễn)
Cần: tài khoản Oracle (thẻ verify, không tính phí) + 1 domain (DuckDNS free hoặc .id.vn).

1. Tạo VM **Always Free** (Ubuntu 22.04, ARM Ampere) trên Oracle Cloud.
2. Mở port 80 & 443: trong **Security List** của VCN + trên VM `sudo ufw allow 80 && sudo ufw allow 443`.
3. Trỏ domain (DuckDNS) về **IP public** của VM.
4. SSH vào VM, sửa `REPO_URL` & `DOMAIN` trong `deploy/oracle-setup.sh`, rồi:
   ```bash
   bash deploy/oracle-setup.sh
   nano ~/telecash/.env       # điền BOT_TOKEN thật
   cd ~/telecash && pm2 restart telecash
   ```
5. ✅ `https://yourdomain` chạy 24/7. Caddy tự cấp HTTPS (Let's Encrypt). PM2 tự chạy lại khi reboot.

---

## Sau khi deploy (cả 2 cách)
- `WEBAPP_URL` = URL thật (fly.dev / domain) → bot tự gắn nút **Menu** mở Mini App khi khởi động.
- Mini App + API cùng 1 origin nên **không cần lo CORS / tunnel** nữa.
- Mở khoá **P6 (Google)**: dùng URL cố định này làm OAuth redirect (`{WEBAPP_URL}/google/callback`).

## Backup dữ liệu
- File SQLite: Fly = trên volume `/data/dev.db`; Oracle = `~/telecash/packages/db/prisma/dev.db`.
- Cron sao lưu định kỳ, hoặc (sau P6) dùng `/ketnoi` để đẩy lên Google Sheet.

## ⚠️ Tránh
- **Render / Railway free**: mất file SQLite khi restart (ổ ephemeral) — đừng dùng với SQLite local.
