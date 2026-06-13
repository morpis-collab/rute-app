import { Client } from 'ssh2';
import fs from 'fs';

const config = {
  host: '202.10.34.42',
  port: 22,
  username: 'root',
  password: 'mhan071099@'
};

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH connection established. Fetching database...');
  conn.exec('cat /data/rute-db.json', (err, stream) => {
    if (err) {
      console.error('Error executing cat:', err);
      conn.end();
      return;
    }
    let dataBuffer = '';
    stream.on('data', (chunk) => {
      dataBuffer += chunk.toString();
    });
    stream.on('close', (code, signal) => {
      conn.end();
      console.log('Stream closed. Parsing database...');
      try {
        const db = JSON.parse(dataBuffer);
        fs.writeFileSync('scratch/vps-db-clone.json', JSON.stringify(db, null, 2));
        console.log('Saved DB clone to scratch/vps-db-clone.json');
        
        // Analyze cashAccounts
        console.log('\n--- Cash Accounts ---');
        db.cashAccounts?.forEach(acc => {
          console.log(`ID: ${acc.id}, Name: ${acc.name}, Type: ${acc.type}, Balance: ${acc.balance}`);
        });

        // Analyze cashSessions
        console.log('\n--- Cash Sessions ---');
        db.cashSessions?.slice(0, 15).forEach(sess => {
          console.log(`Date: ${sess.date}, Status: ${sess.status}, Opening: ${sess.openingCash}, Closing: ${sess.closingCash}, Expected: ${sess.expectedCash}, Diff: ${sess.difference}`);
        });

        // Analyze recent Cash Transactions
        console.log('\n--- Recent Cash Transactions ---');
        db.cashTransactions?.slice(0, 20).forEach(tx => {
          console.log(`Date: ${tx.date}, Type: ${tx.type}, Amount: ${tx.amount}, Category: ${tx.category}, AccountId: ${tx.accountId}, Description: ${tx.description}`);
        });
      } catch (parseErr) {
        console.error('Failed to parse database JSON:', parseErr);
        // Print first 500 chars to see what it is
        console.log('Start of data received:', dataBuffer.substring(0, 500));
      }
    });
  });
}).on('error', (err) => {
  console.error('SSH connection error:', err);
}).connect(config);
