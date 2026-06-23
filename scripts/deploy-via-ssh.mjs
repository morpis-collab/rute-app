import { Client } from 'ssh2';
import dotenv from 'dotenv';

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

if (!geminiApiKey) {
  console.error('Error: GEMINI_API_KEY not found in local .env file. Please add it before deploying.');
  process.exit(1);
}

const config = {
  host: 'ruteapp.cloud',
  port: 22,
  username: 'root',
  password: 'mhan071099@'
};

const conn = new Client();

console.log('Connecting to VPS to start deployment...');

conn.on('ready', () => {
  console.log('SSH connection established. Executing deployment commands...');
  
  const command = `
    set -e
    echo "=== [1/6] Navigating to app directory and setting up Git ==="
    if [ ! -d "/opt/rute-app" ]; then
      mkdir -p /opt/rute-app
    fi
    cd /opt/rute-app
    if [ ! -d "/opt/rute-app/.git" ]; then
      echo "=== [2/6] Initializing Git repo and resetting to origin/main ==="
      git init
      git remote add origin https://github.com/morpis-collab/rute-app.git
      git fetch origin
      git reset --hard origin/main
      git branch -M main || echo "Rename to main done"
      git branch --set-upstream-to=origin/main main || echo "Upstream done"
    else
      echo "=== [2/6] Pulling latest code from GitHub ==="
      git stash -u || echo "No changes to stash"
      git pull origin main
    fi
    
    echo "=== [2.5/6] Injecting Gemini environment variables to .env ==="
    if [ ! -f "/opt/rute-app/.env" ]; then
      echo "NODE_ENV=production" > "/opt/rute-app/.env"
      echo "PORT=4322" >> "/opt/rute-app/.env"
      echo "VITE_API_URL=/api" >> "/opt/rute-app/.env"
    fi
    
    update_env_var() {
      local key=$1
      local value=$2
      local file="/opt/rute-app/.env"
      if grep -q "^$key=" "$file"; then
        sed -i "s|^$key=.*|$key=$value|" "$file"
      else
        echo "$key=$value" >> "$file"
      fi
    }
    
    update_env_var "GEMINI_API_KEY" "${geminiApiKey}"
    update_env_var "GEMINI_MODEL" "${geminiModel}"

    
    echo "=== [3/6] Updating database file /data/rute-db.json ==="
    node -e "
      const fs = require('fs');
      const filePath = '/data/rute-db.json';
      if (fs.existsSync(filePath)) {
        const db = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let changed = false;
        if (db.cashAccounts) {
          db.cashAccounts = db.cashAccounts.map(acc => {
            if (acc.id === 'rek-mandiri') {
              acc.id = 'qris-bni';
              acc.name = 'QRIS BNI';
              acc.type = 'qris';
              acc.description = 'Penerimaan QRIS BNI';
              changed = true;
            }
            return acc;
          });
        }
        if (changed) {
          fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
          console.log('Successfully updated VPS database /data/rute-db.json');
        } else {
          console.log('No rek-mandiri found in /data/rute-db.json');
        }
      } else {
        console.log('/data/rute-db.json not found');
      }
    "
    
    echo "=== [4/6] Installing dependencies ==="
    npm install
    
    echo "=== [5/6] Building frontend application ==="
    npm run build
    
    echo "=== [6/6] Restarting PM2 process 'rute-api' ==="
    pm2 restart rute-api --update-env
    
    echo "=== Deployment Finished Successfully ==="
    pm2 status rute-api
  `;
  
  conn.exec(command, (err, stream) => {
    if (err) {
      console.error('Failed to execute deployment commands:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      console.log(`SSH connection closed with code: ${code}`);
      conn.end();
      if (code !== 0) {
        process.exit(code);
      }
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Error:', err);
  process.exit(1);
}).connect(config);
