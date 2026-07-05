import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbFile = path.resolve(__dirname, '..', 'server', '.data', 'rute-reconcile-test-db.json');
const apiUrl = 'http://127.0.0.1:54510/api';

process.env.PORT = '54510';
process.env.RUTE_API_PORT = '54510';
process.env.RUTE_DATA_FILE = testDbFile;
process.env.JWT_SECRET = 'test-jwt-secret-key-123456';
process.env.NODE_ENV = 'development';

if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

const serverProcess = fork(path.join(__dirname, '..', 'server', 'index.js'), [], {
  env: process.env,
  silent: true,
});

async function shutdown(code = 0) {
  serverProcess.kill();
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);
  process.exit(code);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let retries = 10;
while (retries > 0) {
  try {
    await axios.get(`${apiUrl}/health`);
    break;
  } catch {
    retries -= 1;
    await sleep(400);
  }
}

if (retries === 0) {
  console.error('Server failed to start in time.');
  await shutdown(1);
}

try {
  const loginRes = await axios.post(`${apiUrl}/auth/login`, { pin: '123456' });
  const authHeaders = { Authorization: `Bearer ${loginRes.data.token}` };

  const manualExpenseRes = await axios.post(`${apiUrl}/expenses`, {
    category: 'bahan_baku',
    description: 'Belanja lekor dan kentang manual',
    total: 50000,
    items: [{ name: 'Belanja lekor dan kentang manual', qty: 1, unit: 'pcs', price: 50000, total: 50000, addsStock: false }],
    walletId: 'acc-bahan-baku',
    user: 'Owner RUTE',
  }, { headers: authHeaders });
  const expenseId = manualExpenseRes.data.expense.id;

  const ingredientRes = await axios.post(`${apiUrl}/ingredients`, {
    name: 'Lekor',
    category: 'bahan_baku',
    unit: 'pcs',
    stock: 0,
    minStock: 5,
    costPerUnit: 0,
    user: 'Owner RUTE',
  }, { headers: authHeaders });
  const ingredientId = ingredientRes.data.ingredient.id;

  const beforeExpenses = await axios.get(`${apiUrl}/expenses`, {
    params: { all: 'true' },
    headers: authHeaders,
  });
  const beforeExpenseCount = beforeExpenses.data.length;

  const reconcileRes = await axios.post(`${apiUrl}/expenses/${expenseId}/stock-items`, {
    item: {
      name: 'Lekor',
      qty: 10,
      unit: 'pcs',
      price: 5000,
      total: 50000,
      addsStock: true,
      ingredientId,
      stockQty: 10,
      stockUnit: 'pcs',
    },
    user: 'Owner RUTE',
  }, { headers: authHeaders });

  assert.equal(reconcileRes.status, 200);
  assert.equal(reconcileRes.data.expense.id, expenseId);
  assert.equal(reconcileRes.data.expense.items.some((item) => item.addsStock), true);

  const afterExpenses = await axios.get(`${apiUrl}/expenses`, {
    params: { all: 'true' },
    headers: authHeaders,
  });
  assert.equal(afterExpenses.data.length, beforeExpenseCount);

  const linkedExpense = afterExpenses.data.find((expense) => String(expense.id) === String(expenseId));
  assert.equal(linkedExpense.total, 50000);

  const stockRes = await axios.get(`${apiUrl}/stock`, { headers: authHeaders });
  const lekor = stockRes.data.find((ingredient) => String(ingredient.id) === String(ingredientId));
  assert.equal(lekor.stock, 10);
  assert.equal(lekor.costPerUnit, 5000);

  const cashRes = await axios.get(`${apiUrl}/cash/accounts`, { headers: authHeaders });
  const expenseCashTransactions = cashRes.data.cashTransactions.filter(
    (transaction) => transaction.sourceType === 'expense' && String(transaction.sourceId) === String(expenseId),
  );
  assert.equal(expenseCashTransactions.length, 1);
  assert.equal(expenseCashTransactions[0].amount, 50000);

  console.log('Expense stock reconciliation test passed.');
  await shutdown(0);
} catch (error) {
  if (error.response) {
    console.error(`Request failed with status ${error.response.status}`);
    console.error(JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error);
  }
  await shutdown(1);
}
