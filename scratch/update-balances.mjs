import { Client } from 'ssh2';
import fs from 'fs';

// Update local DB first
const localDbPath = 'h:/RUTE Cash Tracer/rute-app/server/.data/rute-db.json';
if (fs.existsSync(localDbPath)) {
  const db = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
  
  // Ensure acc-brankas exists
  if (!db.cashAccounts.some(acc => acc.id === 'acc-brankas')) {
    db.cashAccounts.push({
      id: 'acc-brankas',
      name: 'Brankas',
      type: 'tunai',
      balance: 0,
      description: 'Penyimpanan uang utama bisnis (Brankas)',
      status: 'active'
    });
  }

  // Update balances
  db.cashAccounts = db.cashAccounts.map(acc => {
    if (acc.id === 'acc-01' || acc.id === 'kas-utama') {
      acc.balance = 0;
    }
    if (acc.id === 'acc-brankas' || acc.id === 'kas-brankas') {
      acc.balance = 1026000;
    }
    return acc;
  });

  fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2));
  console.log('Local database balances updated successfully!');
}

// Connect to VPS and update VPS DB
const config = {
  host: '202.10.34.42',
  port: 22,
  username: 'root',
  password: 'mhan071099@'
};

const conn = new Client();
console.log('Connecting to VPS to update balances...');

conn.on('ready', () => {
  console.log('SSH connection established.');
  
  const command = 'node -e "' +
    'const fs = require(\'fs\');' +
    'const filePath = \'/data/rute-db.json\';' +
    'if (fs.existsSync(filePath)) {' +
      'const db = JSON.parse(fs.readFileSync(filePath, \'utf8\'));' +
      'if (!db.cashAccounts.some(acc => acc.id === \'acc-brankas\')) {' +
        'db.cashAccounts.push({' +
          'id: \'acc-brankas\',' +
          'name: \'Brankas\',' +
          'type: \'tunai\',' +
          'balance: 0,' +
          'description: \'Penyimpanan uang utama bisnis (Brankas)\',' +
          'status: \'active\'' +
        '});' +
      '}' +
      'db.cashAccounts = db.cashAccounts.map(acc => {' +
        'if (acc.id === \'acc-01\' || acc.id === \'kas-utama\') {' +
          'acc.balance = 0;' +
        '}' +
        'if (acc.id === \'acc-brankas\' || acc.id === \'kas-brankas\') {' +
          'acc.balance = 1026000;' +
        '}' +
        'return acc;' +
      '});' +
      'fs.writeFileSync(filePath, JSON.stringify(db, null, 2));' +
      'console.log(\'Successfully updated VPS database balances: Brankas = 1.026.000, Laci = 0\');' +
    '} else {' +
      'console.error(\'/data/rute-db.json not found on VPS\');' +
    '}' +
    '"\n' +
    'pm2 restart rute-api\n';
  
  conn.exec(command, (err, stream) => {
    if (err) {
      console.error('Failed to execute command on VPS:', err);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      console.log('SSH command executed with code: ' + code);
      conn.end();
      process.exit(code);
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
