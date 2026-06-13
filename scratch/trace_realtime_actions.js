import fs from 'fs';

const db = JSON.parse(fs.readFileSync('scratch/vps-db-clone.json', 'utf8'));

// We want to sort all actions by their creation time / real-time timestamp.
// For sales: they have sale.id or sale.date. Wait, let's look at the date format.
// Sales have date: e.g. "2026-05-31T06:41:17.703Z"
// Expenses have date: e.g. "2026-06-03T12:00:00.000Z". Some might have expense.id which contains timestamp like EXP-1780485100362.
// Cash sessions have closedAt: e.g. "2026-06-03T14:11:16.962Z"
// Cash transactions have CTX-XXX ids or date: e.g. "2026-06-03T11:27:55.675Z"

const actions = [];

db.sales.forEach(sale => {
  actions.push({
    timestamp: sale.date,
    type: 'sale',
    payload: sale,
    description: `SALE: Method: ${sale.paymentMethod}, Total: ${sale.total}, Items: ${sale.items?.map(i => `${i.name} ${i.qty}x`).join(', ')}`
  });
});

db.expenses.forEach(exp => {
  // Try to find a real timestamp. If exp.id starts with EXP- followed by digits, we can extract timestamp.
  let ts = exp.date;
  if (exp.id.startsWith('EXP-')) {
    const parts = exp.id.split('-');
    if (parts[1] && /^\d+$/.test(parts[1])) {
      ts = new Date(Number(parts[1])).toISOString();
    }
  }
  actions.push({
    timestamp: ts,
    type: 'expense',
    payload: exp,
    description: `EXPENSE: Desc: ${exp.description}, Total: ${exp.total}, Status: ${exp.status}, Account: ${exp.cashAccountId}`
  });
});

db.cashSessions.forEach(sess => {
  actions.push({
    timestamp: sess.closedAt || sess.date + 'T23:59:59.000Z',
    type: 'session_close',
    payload: sess,
    description: `SESSION_CLOSE: Date: ${sess.date}, Expected: ${sess.expectedCash}, Closing: ${sess.closingCash}, Diff: ${sess.difference}`
  });
});

db.cashTransactions.forEach(tx => {
  // Let's see if this is a manual cash transaction (i.e. not generated automatically).
  // Automatic ones are: CTX-SALE-..., CTX-EXP-..., CTX-DIFF-...
  const isManual = !tx.id.startsWith('CTX-SALE-') && !tx.id.startsWith('CTX-EXP-') && !tx.id.startsWith('CTX-DIFF-');
  
  let ts = tx.date;
  if (tx.id.includes('-')) {
    const parts = tx.id.split('-');
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart) && lastPart.length >= 10) {
      ts = new Date(Number(lastPart)).toISOString();
    } else if (parts[2] && /^\d+$/.test(parts[2]) && parts[2].length >= 10) {
      ts = new Date(Number(parts[2])).toISOString();
    }
  }
  
  if (isManual) {
    actions.push({
      timestamp: ts,
      type: 'manual_tx',
      payload: tx,
      description: `MANUAL_TX: Type: ${tx.type}, Amount: ${tx.amount}, Account: ${tx.accountId || `${tx.fromAccountId}->${tx.toAccountId}`}, Desc: ${tx.description}`
    });
  }
});

// Sort actions by timestamp ASC
actions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

console.log('--- Real-time Actions Timeline (Oldest to Newest) ---');
let kasUtama = 0;
let bca = 0;
let qris = 0;

actions.forEach((act, idx) => {
  let balanceChangeDesc = '';
  
  if (act.type === 'sale') {
    const total = act.payload.total;
    const method = act.payload.paymentMethod;
    if (method === 'cash') { kasUtama += total; balanceChangeDesc = `kas-utama +${total} -> ${kasUtama}`; }
    else if (method === 'qris') { qris += total; balanceChangeDesc = `qris-bni +${total} -> ${qris}`; }
    else if (method === 'transfer') { bca += total; balanceChangeDesc = `rek-bca +${total} -> ${bca}`; }
  } 
  else if (act.type === 'expense') {
    if (act.payload.status !== 'rejected') {
      const total = act.payload.total;
      const accId = act.payload.cashAccountId;
      if (accId === 'kas-utama') { kasUtama -= total; balanceChangeDesc = `kas-utama -${total} -> ${kasUtama}`; }
      else if (accId === 'qris-bni') { qris -= total; balanceChangeDesc = `qris-bni -${total} -> ${qris}`; }
      else if (accId === 'rek-bca') { bca -= total; balanceChangeDesc = `rek-bca -${total} -> ${bca}`; }
    }
  } 
  else if (act.type === 'manual_tx') {
    const type = act.payload.type;
    const amount = act.payload.amount;
    if (type === 'transfer') {
      const from = act.payload.fromAccountId;
      const to = act.payload.toAccountId;
      if (from === 'kas-utama') kasUtama -= amount;
      if (to === 'kas-utama') kasUtama += amount;
      if (from === 'qris-bni') qris -= amount;
      if (to === 'qris-bni') qris += amount;
      if (from === 'rek-bca') bca -= amount;
      if (to === 'rek-bca') bca += amount;
      balanceChangeDesc = `Transfer ${from} -> ${to} of ${amount} | kas-utama: ${kasUtama}, qris-bni: ${qris}, rek-bca: ${bca}`;
    } else if (type === 'koreksi') {
      const acc = act.payload.accountId;
      if (acc === 'kas-utama') { kasUtama += amount; balanceChangeDesc = `kas-utama koreksi +${amount} -> ${kasUtama}`; }
      else if (acc === 'qris-bni') { qris += amount; balanceChangeDesc = `qris-bni koreksi +${amount} -> ${qris}`; }
      else if (acc === 'rek-bca') { bca += amount; balanceChangeDesc = `rek-bca koreksi +${amount} -> ${bca}`; }
    }
  } 
  else if (act.type === 'session_close') {
    // Session close overwrites kas-utama balance directly to closingCash!
    const original = kasUtama;
    kasUtama = act.payload.closingCash;
    balanceChangeDesc = `OVERWRITE: kas-utama set to closing cash ${original} -> ${kasUtama}`;
  }

  console.log(`${idx + 1}. [${act.timestamp}] ${act.type.toUpperCase()} | ${act.description}`);
  if (balanceChangeDesc) console.log(`   --> ${balanceChangeDesc}`);
});

console.log('\nFinal Simulated Balances:');
console.log('kas-utama:', kasUtama);
console.log('rek-bca:', bca);
console.log('qris-bni:', qris);
