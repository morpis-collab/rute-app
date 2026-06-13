import { Client } from 'ssh2';
import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

const config = {
  host: '202.10.34.42',
  port: 22,
  username: 'root',
  password: 'mhan071099@'
};

const conn = new Client();

console.log('Connecting to VPS to adjust Brankas balance...');

conn.on('ready', () => {
  console.log('SSH connection established. Running adjustment script on VPS...');
  
  const targetBalance = 1303000;
  const command = `
    node -e "
      const fs = require('fs');
      const filePath = '/data/rute-db.json';
      if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        process.exit(1);
      }
      const db = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!db.cashAccounts) db.cashAccounts = [];
      
      let brankas = db.cashAccounts.find(a => String(a.id) === 'acc-brankas');
      if (!brankas) {
        brankas = { id: 'acc-brankas', name: 'Brankas', type: 'tunai', balance: 0, status: 'active' };
        db.cashAccounts.push(brankas);
      }
      
      const targetBalance = ${targetBalance};
      const currentBalance = Number(brankas.balance || 0);
      const difference = targetBalance - currentBalance;
      
      brankas.balance = targetBalance;
      
      const tx = {
        id: 'CTX-ADJ-BRANKAS-' + Date.now(),
        date: new Date().toISOString(),
        type: 'koreksi',
        amount: Math.abs(difference),
        category: 'koreksi',
        description: 'Koreksi saldo Brankas sesuai uang fisik',
        accountId: 'acc-brankas',
        adjustmentType: difference > 0 ? 'plus' : 'minus',
        user: 'Owner'
      };
      
      if (!db.cashTransactions) db.cashTransactions = [];
      db.cashTransactions.unshift(tx);
      
      if (!db.activityLog) db.activityLog = [];
      db.activityLog.push({
        id: 'ACT-' + Date.now(),
        time: new Date().toISOString(),
        action: 'Penyesuaian saldo Brankas dari Rp ' + currentBalance.toLocaleString('id-ID') + ' menjadi Rp ' + targetBalance.toLocaleString('id-ID') + ' (selisih Rp ' + difference.toLocaleString('id-ID') + ')',
        user: 'Owner',
        type: 'kas'
      });
      
      fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
      console.log('Successfully adjusted Brankas balance on VPS from ' + currentBalance + ' to ' + targetBalance + ' (diff: ' + difference + ')');
    "
    echo "=== Restarting PM2 process 'rute-api' ==="
    pm2 restart rute-api --update-env
    echo "=== Finished ==="
  `;
  
  conn.exec(command, (err, stream) => {
    if (err) {
      console.error('Failed to execute command:', err);
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
