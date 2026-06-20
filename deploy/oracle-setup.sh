#!/usr/bin/env bash
# Chạy script này TRÊN Oracle VM (Ubuntu 22.04) qua SSH. Sửa các biến bên dưới trước.
set -euo pipefail

REPO_URL="https://github.com/HieuDepTraiQua/TeleCashApp.git" # <-- repo của bạn
DOMAIN="telecash.duckdns.org"                                 # <-- domain (DuckDNS free hoặc domain riêng)
APP_DIR="$HOME/telecash"

echo "==> 1. Cài Node 22, git, Caddy, PM2"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2
# Caddy (reverse proxy + HTTPS tự động qua Let's Encrypt)
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy

echo "==> 2. Lấy mã nguồn + cài đặt"
[ -d "$APP_DIR" ] || git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"
npm install
npm run db:generate
npm run build:web

echo "==> 3. Tạo .env (ĐIỀN secrets thật vào file này!)"
cat > .env <<EOF
BOT_TOKEN=DIEN_TOKEN_CUA_BAN
DATABASE_URL="file:./dev.db"
PORT=3000
WEBAPP_URL=https://$DOMAIN
TZ=Asia/Ho_Chi_Minh
EOF
echo "   -> Nhớ: nano $APP_DIR/.env để điền BOT_TOKEN!"

echo "==> 4. Migration + chạy bằng PM2 (tự khởi động lại khi reboot)"
npm run db:deploy
pm2 start "npm start" --name telecash
pm2 save
sudo env PATH=$PATH pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | bash || true

echo "==> 5. Caddy: HTTPS cho $DOMAIN -> localhost:3000"
echo "$DOMAIN {
    reverse_proxy localhost:3000
}" | sudo tee /etc/caddy/Caddyfile
sudo systemctl restart caddy

echo "==> XONG. Mở https://$DOMAIN để kiểm tra. Đặt WEBAPP_URL=$DOMAIN trong .env rồi: pm2 restart telecash"
