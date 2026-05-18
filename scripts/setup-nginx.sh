#!/bin/bash
# ============================================================
# RUTE Coffee - Nginx + SSL Setup
# Jalankan SETELAH deploy-vps.sh
# Usage: bash setup-nginx.sh yourdomain.com
# ============================================================

set -e

DOMAIN=$1
APP_DIR="/opt/rute-app"

if [ -z "$DOMAIN" ]; then
  echo "Usage: bash setup-nginx.sh yourdomain.com"
  echo "Contoh: bash setup-nginx.sh api.rutecoffee.com"
  exit 1
fi

echo "======================================"
echo "  Setup Nginx untuk: $DOMAIN"
echo "======================================"

# ---- Nginx config untuk backend API ----
cat > /etc/nginx/sites-available/rute-api << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    # Backend API - proxy ke Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:4321;
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
echo "Nginx OK untuk $DOMAIN"
echo ""

# ---- Install Certbot SSL ----
echo "Install SSL dengan Let's Encrypt..."
apt-get install -y certbot python3-certbot-nginx

certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect 2>/dev/null || {
  echo ""
  echo "  SSL otomatis gagal (mungkin DNS belum propagate)"
  echo "  Jalankan manual nanti:"
  echo "    certbot --nginx -d $DOMAIN"
  echo ""
}

echo ""
echo "======================================"
echo "  Setup selesai!"
echo "  Test API: curl https://$DOMAIN/api/health"
echo "======================================"
