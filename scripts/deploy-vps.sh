#!/bin/bash
# ============================================================
# RUTE Coffee - VPS Deploy Script
# Target: Ubuntu 20.04/22.04 atau Debian 11/12
# Jalankan sebagai root:
#   PUBLIC_ORIGIN=http://202.10.34.42 bash deploy-vps.sh
#   PUBLIC_ORIGIN=https://ruteapp.cloud bash deploy-vps.sh
# ============================================================

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/morpis-collab/rute-app.git}"
APP_DIR="${APP_DIR:-/opt/rute-app}"
DATA_DIR="${DATA_DIR:-/data}"
NODE_VERSION="${NODE_VERSION:-20}"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-http://202.10.34.42}"
APP_ENV="$APP_DIR/.env"
LEGACY_SERVER_ENV="$APP_DIR/server/.env"

set_env_var() {
  local key="$1"
  local value="$2"

  if grep -q "^$key=" "$APP_ENV"; then
    sed -i "s|^$key=.*|$key=$value|" "$APP_ENV"
  else
    printf "\n%s=%s\n" "$key" "$value" >> "$APP_ENV"
  fi
}

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
if [ "${SKIP_GIT:-0}" = "1" ]; then
  echo "Skipping Git clone/pull as SKIP_GIT is set."
else
  if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR && git pull origin main
  else
    git clone $REPO_URL $APP_DIR
  fi
fi
cd $APP_DIR

# ---- 6. Install dependencies & build frontend ----
# ---- 6. Setup production .env jika belum ada ----
echo "[6/9] Setup production environment..."
if [ ! -f "$APP_ENV" ]; then
  if [ -f "$LEGACY_SERVER_ENV" ]; then
    cp "$LEGACY_SERVER_ENV" "$APP_ENV"
    echo "Migrated legacy $LEGACY_SERVER_ENV to $APP_ENV"
  else
    cat > "$APP_ENV" << ENVEOF
NODE_ENV=production
PORT=4322
VITE_API_URL=/api
RUTE_BUSINESS_TZ=Asia/Makassar
RUTE_CORS_ORIGIN=$PUBLIC_ORIGIN
RUTE_DATA_FILE=$DATA_DIR/rute-db.json
RUTE_UPLOAD_DIR=$DATA_DIR/uploads
JWT_SECRET=replace-with-long-random-secret
JWT_EXPIRES_SECONDS=43200
RUTE_OWNER_PIN=replace-owner-pin
RUTE_PARTNER_PIN=replace-partner-pin
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
RECEIPT_AI_MODEL=gpt-4o-mini
ENVEOF
  fi
  echo ""
  echo "  *** PENTING: Edit $APP_ENV sebelum production dipakai:"
  echo "  JWT_SECRET=isi-dengan-string-acak-panjang"
  echo "  RUTE_OWNER_PIN=isi-pin-owner"
  echo "  RUTE_PARTNER_PIN=isi-pin-partner"
  echo "  RUTE_CORS_ORIGIN=$PUBLIC_ORIGIN atau domain frontend resmi"
  echo "  OPENAI_API_KEY=opsional"
  echo ""
else
  echo "Using existing $APP_ENV"
fi

set_env_var NODE_ENV production
set_env_var PORT 4322
set_env_var VITE_API_URL /api
set_env_var RUTE_BUSINESS_TZ Asia/Makassar
set_env_var RUTE_CORS_ORIGIN "$PUBLIC_ORIGIN"
set_env_var RUTE_DATA_FILE "$DATA_DIR/rute-db.json"
set_env_var RUTE_UPLOAD_DIR "$DATA_DIR/uploads"
set_env_var JWT_EXPIRES_SECONDS 43200

if grep -Eq 'replace-with-long-random-secret|change-this-long-random-secret-before-production|RUTE_OWNER_PIN=123456|RUTE_PARTNER_PIN=654321|replace-owner-pin|replace-partner-pin' "$APP_ENV"; then
  echo ""
  echo "WARNING: $APP_ENV masih berisi secret/PIN placeholder atau PIN dev."
  echo "Edit nilai production sebelum memberikan akses ke user asli."
  echo ""
fi

# ---- 7. Install dependencies & build frontend ----
echo "[7/9] npm install + build..."
npm install
npm run build

# ---- 8. Setup data directories ----
echo "[8/9] Setup data directories..."
mkdir -p $DATA_DIR/uploads
chown -R www-data:www-data $DATA_DIR 2>/dev/null || true

# ---- 9. Jalankan backend dengan PM2 ----
echo "[9/9] Start backend dengan PM2..."
cd $APP_DIR
pm2 delete rute-api 2>/dev/null || true
pm2 start server/index.js --name rute-api --node-args="--experimental-vm-modules"
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

echo ""
echo "Backend berjalan. Test:"
echo "  curl http://localhost:4322/api/health"
echo "  curl $PUBLIC_ORIGIN/api/health"
echo ""
