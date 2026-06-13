import fs from 'fs';

const db = JSON.parse(fs.readFileSync('scratch/vps-db-clone.json', 'utf8'));

console.log('Seed/Starting values for accounts in DB initialization or mock data:');
// Let's look at initial seed cash accounts if they have starting balance
// Wait, is there a record of cashTransactions?
// Let's sort cashTransactions by date ASC to see the flow of funds.
const txs = [...db.cashTransactions].reverse(); // from oldest to newest

let kasUtamaBalance = 0;
let bcaBalance = 0;
let qrisBalance = 0;

console.log('\n--- Processing Transactions Oldest to Newest ---');
txs.forEach((tx, idx) => {
  const amt = Number(tx.amount || 0);
  let detail = '';
  if (tx.type === 'in') {
    if (tx.accountId === 'kas-utama') {
      kasUtamaBalance += amt;
      detail = `kas-utama +${amt} -> ${kasUtamaBalance}`;
    } else if (tx.accountId === 'rek-bca') {
      bcaBalance += amt;
      detail = `rek-bca +${amt} -> ${bcaBalance}`;
    } else if (tx.accountId === 'qris-bni') {
      qrisBalance += amt;
      detail = `qris-bni +${amt} -> ${qrisBalance}`;
    }
  } else if (tx.type === 'out') {
    if (tx.accountId === 'kas-utama') {
      kasUtamaBalance -= amt;
      detail = `kas-utama -${amt} -> ${kasUtamaBalance}`;
    } else if (tx.accountId === 'rek-bca') {
      bcaBalance -= amt;
      detail = `rek-bca -${amt} -> ${bcaBalance}`;
    } else if (tx.accountId === 'qris-bni') {
      qrisBalance -= amt;
      detail = `qris-bni -${amt} -> ${qrisBalance}`;
    }
  } else if (tx.type === 'transfer') {
    // transfer could go from one account to another
    // Let's check fromAccountId and toAccountId
    detail = `Transfer from ${tx.fromAccountId} to ${tx.toAccountId} amt ${amt}`;
    if (tx.fromAccountId === 'kas-utama') kasUtamaBalance -= amt;
    if (tx.toAccountId === 'kas-utama') kasUtamaBalance += amt;
    if (tx.fromAccountId === 'rek-bca') bcaBalance -= amt;
    if (tx.toAccountId === 'rek-bca') bcaBalance += amt;
    if (tx.fromAccountId === 'qris-bni') qrisBalance -= amt;
    if (tx.toAccountId === 'qris-bni') qrisBalance += amt;
  } else if (tx.type === 'koreksi') {
    if (tx.accountId === 'kas-utama') {
      kasUtamaBalance += amt; // wait, correction amount can be positive or negative?
      detail = `kas-utama koreksi ${amt} -> ${kasUtamaBalance}`;
    } else if (tx.accountId === 'rek-bca') {
      bcaBalance += amt;
      detail = `rek-bca koreksi ${amt} -> ${bcaBalance}`;
    } else if (tx.accountId === 'qris-bni') {
      qrisBalance += amt;
      detail = `qris-bni koreksi ${amt} -> ${qrisBalance}`;
    }
  }
  console.log(`${idx + 1}. [${tx.date.substring(0, 10)}] ${tx.type.toUpperCase()}: ${tx.description} | ${detail}`);
});

console.log('\nCalculated Final Balances:');
console.log('kas-utama:', kasUtamaBalance);
console.log('rek-bca:', bcaBalance);
console.log('qris-bni:', qrisBalance);

console.log('\nActual DB Balances:');
db.cashAccounts?.forEach(acc => {
  console.log(`${acc.id}: ${acc.balance}`);
});

// Let's also check the sales and expenses for each day from May 31 to June 3
console.log('\n--- Daily Cash Breakdown (Sales vs Expenses) ---');
const dates = ['2026-05-31', '2026-06-01', '2026-06-02', '2026-06-03'];
dates.forEach(d => {
  const daySales = db.sales.filter(s => s.date?.startsWith(d));
  const dayExpenses = db.expenses.filter(e => e.date?.startsWith(d));
  const dayTxs = db.cashTransactions.filter(tx => tx.date?.startsWith(d));

  const totalSalesCash = daySales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const totalSalesQris = daySales.filter(s => s.paymentMethod === 'qris').reduce((sum, s) => sum + s.total, 0);
  const totalSalesTransfer = daySales.filter(s => s.paymentMethod === 'transfer').reduce((sum, s) => sum + s.total, 0);

  const totalExp = dayExpenses.reduce((sum, e) => sum + e.total, 0);
  
  console.log(`\nDate: ${d}`);
  console.log(`  Sales (Cash): ${totalSalesCash}`);
  console.log(`  Sales (Qris): ${totalSalesQris}`);
  console.log(`  Sales (Transfer): ${totalSalesTransfer}`);
  console.log(`  Expenses (Total): ${totalExp}`);
  dayExpenses.forEach(e => {
    console.log(`    - Expense: ${e.description} | total: ${e.total} | status: ${e.status} | accountId: ${e.cashAccountId}`);
  });
  console.log(`  Transactions count: ${dayTxs.length}`);
  dayTxs.forEach(tx => {
    console.log(`    - Tx: ${tx.type.toUpperCase()} | amount: ${tx.amount} | accountId: ${tx.accountId || `${tx.fromAccountId}->${tx.toAccountId}`} | desc: ${tx.description}`);
  });
});
