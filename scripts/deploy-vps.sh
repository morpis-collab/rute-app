#!/bin/bash
# ============================================================
# RUTE Coffee - VPS Deploy Script
# Target: Ubuntu 20.04/22.04 atau Debian 11/12
# Jalankan sebagai root: bash deploy-vps.sh
# ============================================================

set -e

REPO_URL="https://github.com/morpis-collab/rute-app.git"
APP_DIR="/opt/rute-app"
DATA_DIR="/data"
NODE_VERSION="20"

echo "======================================"
echo "  RUTE Coffee - VPS Deployment"
echo "======================================"

# ---- 1. Update system ----
echo "[1/8] Update system packages..."
apt-get update -y && apt-get upgrade -y

# ---- 2. Install Node.js via NodeSource ----
echo "[2/8] Install Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v), NPM: $(npm -v)"

# ---- 3. Install PM2 ----
echo "[3/8] Install PM2..."
npm install -g pm2

# ---- 4. Install Git & Nginx ----
echo "[4/8] Install Git, Nginx..."
apt-get install -y git nginx

# ---- 5. Clone / pull repo ----
echo "[5/8] Clone/update repo..."
if [ -d "$APP_DIR/.git" ]; then
  cd $APP_DIR && git pull origin main
else
  git clone $REPO_URL $APP_DIR
fi
cd $APP_DIR

# ---- 6. Install dependencies & build frontend ----
echo "[6/8] npm install + build..."
npm install
npm run build

# ---- 7. Setup data directories ----
echo "[7/8] Setup data directories..."
mkdir -p $DATA_DIR/uploads
chown -R www-data:www-data $DATA_DIR 2>/dev/null || true

# ---- 8. Setup .env jika belum ada ----
if [ ! -f "$APP_DIR/server/.env" ]; then
  echo "[7/8] Creating .env from example..."
  cp $APP_DIR/.env.example $APP_DIR/server/.env 2>/dev/null || cat > $APP_DIR/server/.env << 'ENVEOF'
NODE_ENV=production
PORT=4321
RUTE_BUSINESS_TZ=Asia/Makassar
RUTE_DATA_FILE=/data/rute-db.json
RUTE_UPLOAD_DIR=/data/uploads
JWT_EXPIRES_SECONDS=43200
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
RECEIPT_AI_MODEL=gpt-4o-mini
ENVEOF
  echo ""
  echo "  *** PENTING: Edit /opt/rute-app/server/.env dan isi nilai berikut:"
  echo "  RUTE_CORS_ORIGIN=https://your-frontend-domain.com"
  echo "  JWT_SECRET=isi-dengan-string-acak-panjang"
  echo "  RUTE_OWNER_PIN=isi-pin-owner"
  echo "  RUTE_PARTNER_PIN=isi-pin-partner"
  echo "  OPENAI_API_KEY=opsional"
  echo ""
fi

# ---- 9. Jalankan backend dengan PM2 ----
echo "[8/8] Start backend dengan PM2..."
cd $APP_DIR
pm2 delete rute-api 2>/dev/null || true
pm2 start server/index.js --name rute-api --node-args="--experimental-vm-modules"
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "Backend berjalan. Test:"
echo "  curl http://localhost:4321/api/health"
echo ""
