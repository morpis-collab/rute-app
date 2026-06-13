import { Client } from 'ssh2';
import process from 'process';

const targetBalance = process.argv[2];
if (!targetBalance) {
  console.error('Please specify the target balance as an argument. Example: node scratch/fix_vps_balance.js 328000');
  process.exit(1);
}

const balanceNum = Number(targetBalance);
if (isNaN(balanceNum) || balanceNum < 0) {
  console.error('Invalid balance amount:', targetBalance);
  process.exit(1);
}

const config = {
  host: '202.10.34.42',
  port: 22,
  username: 'root',
  password: 'mhan071099@'
};

const conn = new Client();

conn.on('ready', () => {
  console.log(`SSH connection established. Updating kas-utama balance to ${balanceNum}...`);
  
  const updateScript = `
    node -e "
      const fs = require('fs');
      const filePath = '/data/rute-db.json';
      if (!fs.existsSync(filePath)) {
        console.error('DB file not found!');
        process.exit(1);
      }
      const db = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const acc = db.cashAccounts.find(a => a.id === 'kas-utama');
      if (acc) {
        const old = acc.balance;
        acc.balance = ${balanceNum};
        fs.writeFileSync(filePath, JSON.stringify(db, null, 2));
        console.log('Updated kas-utama balance from ' + old + ' to ' + acc.balance);
      } else {
        console.error('kas-utama account not found in DB!');
        process.exit(1);
      }
    "
  `;
  
  conn.exec(updateScript, (err, stream) => {
    if (err) {
      console.error('Error executing update script:', err);
      conn.end();
      return;
    }
    stream.on('close', (code, signal) => {
      console.log(`Update script finished with code: ${code}`);
      
      // If successful, restart PM2 process so API reloads latest JSON
      if (code === 0) {
        console.log('Restarting PM2 process rute-api...');
        conn.exec('pm2 restart rute-api', (pm2Err, pm2Stream) => {
          if (pm2Err) {
            console.error('Failed to restart PM2:', pm2Err);
            conn.end();
            return;
          }
          pm2Stream.on('close', (pm2Code) => {
            console.log(`PM2 restart finished with code: ${pm2Code}`);
            conn.end();
          }).on('data', (d) => process.stdout.write(d.toString()));
        });
      } else {
        conn.end();
      }
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH connection error:', err);
}).connect(config);
