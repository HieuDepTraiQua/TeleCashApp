#!/usr/bin/env bash
set -euo pipefail

# Ubuntu VPS deploy script for TeleCashApp.
# Usage:
#   DOMAIN=telecash.example.com BOT_TOKEN=123:abc REPO_URL=https://github.com/you/TeleCashApp.git bash deploy/oracle-setup.sh
# Optional:
#   APP_DIR=$HOME/telecash NODE_MAJOR=22 bash deploy/oracle-setup.sh

REPO_URL="${REPO_URL:-https://github.com/HieuDepTraiQua/TeleCashApp.git}"
DOMAIN="${DOMAIN:-}"
BOT_TOKEN="${BOT_TOKEN:-}"
APP_DIR="${APP_DIR:-$HOME/telecash}"
NODE_MAJOR="${NODE_MAJOR:-22}"
PORT="${PORT:-3000}"

if [[ -z "$DOMAIN" ]]; then
  read -r -p "Nhap domain/subdomain cho app (vd telecash.duckdns.org): " DOMAIN
fi

if [[ -z "$BOT_TOKEN" ]]; then
  read -r -p "Nhap BOT_TOKEN Telegram: " BOT_TOKEN
fi

if [[ -z "$DOMAIN" || -z "$BOT_TOKEN" ]]; then
  echo "DOMAIN va BOT_TOKEN la bat buoc."
  exit 1
fi

echo "==> 1. Cai Node.js, git, PM2, Caddy"
sudo apt-get update
sudo apt-get install -y curl git unzip build-essential
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
sudo apt-get update
sudo apt-get install -y caddy

echo "==> 2. Lay ma nguon"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

echo "==> 3. Cai dependency + build"
npm install
npm run db:generate
npm run build:web

echo "==> 4. Tao .env"
cat > "$APP_DIR/.env" <<EOF
BOT_TOKEN=$BOT_TOKEN
DATABASE_URL="file:./dev.db"
PORT=$PORT
WEBAPP_URL=https://$DOMAIN
TZ=Asia/Ho_Chi_Minh
EOF

echo "==> 5. Chay migration production"
npm run db:deploy

echo "==> 6. Chay app bang PM2"
pm2 describe telecash >/dev/null 2>&1 && pm2 delete telecash || true
pm2 start "npm start" --name telecash --cwd "$APP_DIR"
pm2 save
PM2_STARTUP_CMD="$(sudo env PATH=$PATH pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 || true)"
if [[ -n "$PM2_STARTUP_CMD" ]]; then
  bash -lc "$PM2_STARTUP_CMD" || true
fi

echo "==> 7. Cau hinh Caddy"
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$DOMAIN {
    reverse_proxy 127.0.0.1:$PORT
}
EOF
sudo systemctl restart caddy
sudo systemctl enable caddy

echo "==> 8. Hoan tat"
echo "URL: https://$DOMAIN"
echo "Kiem tra log app: pm2 logs telecash"
echo "Kiem tra Caddy: sudo systemctl status caddy"
