#!/bin/bash
# ============================================================
# RUTE Coffee - Nginx + SSL Setup
# Jalankan SETELAH deploy-vps.sh
# Usage:
#   bash setup-nginx.sh 202.10.34.42
#   bash setup-nginx.sh ruteapp.cloud
# ============================================================

set -euo pipefail

SERVER_NAME=${1:-}
APP_DIR="${APP_DIR:-/opt/rute-app}"

if [ -z "$SERVER_NAME" ]; then
  echo "Usage: bash setup-nginx.sh <domain-or-ip>"
  echo "Contoh: bash setup-nginx.sh 202.10.34.42"
  echo "Contoh: bash setup-nginx.sh ruteapp.cloud"
  exit 1
fi

IS_IP=0
if [[ "$SERVER_NAME" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  IS_IP=1
fi

echo "======================================"
echo "  Setup Nginx untuk: $SERVER_NAME"
echo "======================================"

# ---- Nginx config untuk backend API ----
cat > /etc/nginx/sites-available/rute-api << NGINXEOF
server {
    listen 80;
    server_name $SERVER_NAME;

    # Backend API - proxy ke Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:4322;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 10M;
    }

    # Upload files
    location /uploads/ {
        alias /data/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Optional: serve frontend dari VPS (jika tidak pakai Vercel)
    location / {
        root $APP_DIR/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1d;
    }
}
NGINXEOF

# Enable site
ln -sf /etc/nginx/sites-available/rute-api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test & reload nginx
nginx -t
systemctl reload nginx
systemctl enable nginx

echo ""
echo "Nginx OK untuk $SERVER_NAME"
echo ""

# ---- Install Certbot SSL ----
if [ "$IS_IP" -eq 1 ]; then
  echo "Target berupa IP, jadi SSL Let's Encrypt dilewati."
  echo "Untuk HTTPS, arahkan domain ke IP ini lalu jalankan ulang script dengan domain."
  echo ""
  echo "======================================"
  echo "  Setup selesai!"
  echo "  Test API: curl http://$SERVER_NAME/api/health"
  echo "======================================"
  exit 0
fi

echo "Install SSL dengan Let's Encrypt..."
apt-get install -y certbot python3-certbot-nginx

certbot --nginx -d $SERVER_NAME --non-interactive --agree-tos --email admin@$SERVER_NAME --redirect 2>/dev/null || {
  echo ""
  echo "  SSL otomatis gagal (mungkin DNS belum propagate)"
  echo "  Jalankan manual nanti:"
  echo "    certbot --nginx -d $SERVER_NAME"
  echo ""
}

echo ""
echo "======================================"
echo "  Setup selesai!"
echo "  Test API: curl https://$SERVER_NAME/api/health"
echo "======================================"
