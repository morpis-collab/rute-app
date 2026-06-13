import fs from 'fs';

const db = JSON.parse(fs.readFileSync('scratch/vps-db-clone.json', 'utf8'));

console.log('--- Cash Accounts ---');
console.log(db.cashAccounts);

console.log('\n--- Cash Sessions ---');
console.log(db.cashSessions);

console.log('\n--- Expenses list ---');
db.expenses.forEach(e => {
  console.log(`${e.date} | ${e.description} | Total: ${e.total} | Status: ${e.status} | Account: ${e.cashAccountId}`);
});

console.log('\n--- Sales list ---');
db.sales.forEach(s => {
  console.log(`${s.date} | Total: ${s.total} | Method: ${s.paymentMethod}`);
});

console.log('\n--- Cash Transactions ---');
db.cashTransactions.forEach(tx => {
  console.log(`${tx.date} | Type: ${tx.type} | Amount: ${tx.amount} | Account: ${tx.accountId || `${tx.fromAccountId}->${tx.toAccountId}`} | Desc: ${tx.description}`);
});
