import fs from 'fs';
import path from 'path';

const dbPath = '/data/rute-db.json';
if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at:', dbPath);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
console.log('Successfully loaded database. Running validation...');

let dbChanged = false;

db.expenses.forEach((expense) => {
  if (expense.status === 'rejected') {
    // Find if this rejected expense has active cash transactions in db.cashTransactions
    const txs = db.cashTransactions.filter(
      t => String(t.id) === String(expense.cashTransactionId) || 
           (t.sourceType === 'receipt_expense' && String(t.sourceId) === String(expense.id))
    );
    
    if (txs.length > 0) {
      console.log(`Found ${txs.length} cash transaction(s) for rejected expense ${expense.id} ("${expense.description}") totaling Rp ${expense.total.toLocaleString('id-ID')}`);
      
      txs.forEach((tx) => {
        const cashAccountId = expense.cashAccountId || tx.accountId;
        const cashAccount = db.cashAccounts.find(a => String(a.id) === String(cashAccountId));
        if (cashAccount) {
          console.log(`Restoring Rp ${tx.amount.toLocaleString('id-ID')} to cash account: "${cashAccount.name}" (Current balance: Rp ${cashAccount.balance.toLocaleString('id-ID')})`);
          cashAccount.balance = Number(cashAccount.balance || 0) + Number(tx.amount);
          console.log(`New balance of "${cashAccount.name}": Rp ${cashAccount.balance.toLocaleString('id-ID')}`);
          dbChanged = true;
        }
      });
      
      // Remove the cash transactions
      const txIds = new Set(txs.map(t => String(t.id)));
      db.cashTransactions = db.cashTransactions.filter(
        t => !txIds.has(String(t.id)) && !(t.sourceType === 'receipt_expense' && String(t.sourceId) === String(expense.id))
      );
      
      expense.cashTransactionId = null;
      dbChanged = true;
    }

    // Find if this rejected expense has active stock movements
    const movements = db.stockMovements.filter(m => String(m.sourceId) === String(expense.id));
    if (movements.length > 0) {
      console.log(`Found ${movements.length} stock movement(s) for rejected expense ${expense.id}`);
      
      movements.forEach((m) => {
        const ingredient = db.ingredients.find(i => String(i.id) === String(m.ingredientId));
        if (ingredient) {
          console.log(`Reversing stock movement of ${m.qty} ${m.unit} on ingredient "${ingredient.name}" (Current stock: ${ingredient.stock})`);
          ingredient.stock = Math.max(0, Number((Number(ingredient.stock || 0) - m.qty).toFixed(3)));
          ingredient.status = ingredient.stock <= (ingredient.minStock || 0) ? 'kritis' : 'aman';
          console.log(`New stock of "${ingredient.name}": ${ingredient.stock}`);
          dbChanged = true;
        }
      });
      
      // Remove the stock movements
      db.stockMovements = db.stockMovements.filter(m => String(m.sourceId) !== String(expense.id));
      dbChanged = true;
    }
  }
});

if (dbChanged) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log('Database successfully repaired and saved!');
} else {
  console.log('No data inconsistency found. Database is healthy.');
}
process.exit(0);
