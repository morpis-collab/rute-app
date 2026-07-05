import { fork } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbFile = path.resolve(__dirname, '..', 'server', '.data', 'rute-test-db.json');
const apiUrl = 'http://127.0.0.1:54500/api';

console.log('=== RUTE Coffee API CRUD Endpoints Test ===');

process.env.PORT = '54500';
process.env.RUTE_API_PORT = '54500';
process.env.RUTE_DATA_FILE = testDbFile;
process.env.JWT_SECRET = 'test-jwt-secret-key-123456';
process.env.NODE_ENV = 'development';

if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

console.log('Starting RUTE API server on port 54500...');
const serverProcess = fork(path.join(__dirname, '..', 'server', 'index.js'), [], {
  env: process.env,
  silent: true,
});

async function shutdown(code = 0) {
  console.log('\nCleaning up resources...');
  serverProcess.kill();
  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
    console.log('Removed temporary test DB file.');
  }
  process.exit(code);
}

serverProcess.on('exit', (exitCode) => {
  if (exitCode && exitCode !== 0) {
    console.error(`Server process exited unexpectedly with code ${exitCode}`);
    shutdown(1);
  }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let retries = 10;
let isServerReady = false;
while (retries > 0) {
  try {
    await axios.get(`${apiUrl}/health`);
    isServerReady = true;
    break;
  } catch (err) {
    console.log(`Polling error: ${err.message}`);
    retries -= 1;
    await sleep(400);
  }
}

if (!isServerReady) {
  console.error('Server failed to start in time.');
  shutdown(1);
}
console.log('Server is active. Running tests...\n');

try {
  let ownerToken = '';

  console.log('Test 1: Authentication');
  const loginRes = await axios.post(`${apiUrl}/auth/login`, { pin: '123456' });
  if (loginRes.status === 200 && loginRes.data.token) {
    ownerToken = loginRes.data.token;
    console.log('OK Login successful');
  } else {
    throw new Error('Login failed');
  }

  const authHeaders = { Authorization: `Bearer ${ownerToken}` };

  console.log('\nTest 2: GET /api/bootstrap');
  const bootstrapRes = await axios.get(`${apiUrl}/bootstrap`, { headers: authHeaders });
  if (bootstrapRes.status === 200 && Array.isArray(bootstrapRes.data.wallets)) {
    console.log('OK Bootstrap returned wallets and categories');
  } else {
    throw new Error('Bootstrap failed');
  }

  console.log('\nTest 3: Wallets CRUD');
  // POST wallet A
  const walletARes = await axios.post(`${apiUrl}/wallets`, { name: 'Wallet A', balance: 100000 }, { headers: authHeaders });
  const walletA = walletARes.data;
  if (walletARes.status === 201 && walletA.name === 'Wallet A' && walletA.balance === 100000) {
    console.log('OK POST /api/wallets created Wallet A');
  } else {
    throw new Error('POST Wallet A failed');
  }

  // POST wallet B
  const walletBRes = await axios.post(`${apiUrl}/wallets`, { name: 'Wallet B', balance: 50000 }, { headers: authHeaders });
  const walletB = walletBRes.data;
  if (walletBRes.status === 201 && walletB.name === 'Wallet B' && walletB.balance === 50000) {
    console.log('OK POST /api/wallets created Wallet B');
  } else {
    throw new Error('POST Wallet B failed');
  }

  // PUT wallet B
  const walletBUpdateRes = await axios.put(`${apiUrl}/wallets/${walletB.id}`, { name: 'Wallet B Updated', balance: 75000 }, { headers: authHeaders });
  if (walletBUpdateRes.status === 200 && walletBUpdateRes.data.name === 'Wallet B Updated' && walletBUpdateRes.data.balance === 75000) {
    console.log('OK PUT /api/wallets/:id updated Wallet B');
  } else {
    throw new Error('PUT Wallet B failed');
  }

  console.log('\nTest 4: Categories CRUD');
  // POST Category
  const catRes = await axios.post(`${apiUrl}/categories`, { type: 'income', name: 'Hiburan' }, { headers: authHeaders });
  if (catRes.status === 201 && catRes.data.income.includes('Hiburan')) {
    console.log('OK POST /api/categories added category');
  } else {
    throw new Error('POST Category failed');
  }

  // DELETE Category
  const catDelRes = await axios.delete(`${apiUrl}/categories`, {
    headers: authHeaders,
    data: { type: 'income', name: 'Hiburan' }
  });
  if (catDelRes.status === 200 && !catDelRes.data.income.includes('Hiburan')) {
    console.log('OK DELETE /api/categories deleted category');
  } else {
    throw new Error('DELETE Category failed');
  }

  console.log('\nTest 5: Incomes CRUD & Balance Adjustment');
  // POST Income (adds 20000 to Wallet B)
  const incRes = await axios.post(`${apiUrl}/incomes`, {
    amount: 20000,
    walletId: walletB.id,
    category: 'Penjualan Harian',
    description: 'Kopi susu'
  }, { headers: authHeaders });
  const incomeItem = incRes.data;
  
  // check wallet B balance (was 75000 + 20000 = 95000)
  const walletBCheckRes = await axios.get(`${apiUrl}/wallets`, { headers: authHeaders });
  const walletBItem = walletBCheckRes.data.find(w => w.id === walletB.id);
  if (incRes.status === 201 && walletBItem.balance === 95000) {
    console.log('OK POST /api/incomes increased Wallet B balance from 75000 to 95000');
  } else {
    throw new Error(`POST Income balance check failed: expected 95000, got ${walletBItem.balance}`);
  }

  // PUT Income (changes to 15000 and moves to Wallet A)
  // Wallet B: 95000 - 20000 = 75000
  // Wallet A: 100000 + 15000 = 115000
  const incUpdateRes = await axios.put(`${apiUrl}/incomes/${incomeItem.id}`, {
    amount: 15000,
    walletId: walletA.id
  }, { headers: authHeaders });
  
  const walletsRes2 = await axios.get(`${apiUrl}/wallets`, { headers: authHeaders });
  const walletACheck1 = walletsRes2.data.find(w => w.id === walletA.id);
  const walletBCheck1 = walletsRes2.data.find(w => w.id === walletB.id);
  if (incUpdateRes.status === 200 && walletACheck1.balance === 115000 && walletBCheck1.balance === 75000) {
    console.log('OK PUT /api/incomes adjusted Wallet A (115000) and Wallet B (75000) balances correctly');
  } else {
    throw new Error(`PUT Income balance check failed: A=${walletACheck1.balance}, B=${walletBCheck1.balance}`);
  }

  // DELETE Income
  // Wallet A: 115000 - 15000 = 100000
  const incDelRes = await axios.delete(`${apiUrl}/incomes/${incomeItem.id}`, { headers: authHeaders });
  const walletsRes3 = await axios.get(`${apiUrl}/wallets`, { headers: authHeaders });
  const walletACheck2 = walletsRes3.data.find(w => w.id === walletA.id);
  if (incDelRes.status === 200 && walletACheck2.balance === 100000) {
    console.log('OK DELETE /api/incomes decremented Wallet A balance back to 100000');
  } else {
    throw new Error(`DELETE Income balance check failed: A=${walletACheck2.balance}`);
  }

  console.log('\nTest 6: Ingredients CRUD');
  // POST Ingredient
  const ingRes = await axios.post(`${apiUrl}/ingredients`, {
    name: 'Susu UHT',
    category: 'Bahan Baku',
    unit: 'liter',
    stock: 10,
    minStock: 2,
    costPerUnit: 15000
  }, { headers: authHeaders });
  const ingredientItem = ingRes.data;
  if (ingRes.status === 201 && ingredientItem.name === 'Susu UHT') {
    console.log('OK POST /api/ingredients created ingredient susu UHT');
  } else {
    throw new Error('POST Ingredient failed');
  }

  // POST Duplicate ingredient (should fail with 409)
  try {
    await axios.post(`${apiUrl}/ingredients`, {
      name: 'Susu UHT',
      category: 'Bahan Baku',
      unit: 'liter',
    }, { headers: authHeaders });
    throw new Error('POST duplicate ingredient did not return 409');
  } catch (err) {
    if (err.response?.status === 409) {
      console.log('OK Duplicate ingredient guard returned 409 Conflict');
    } else {
      throw err;
    }
  }

  console.log('\nTest 7: Expenses CRUD & Balance/Price Adjustment');
  // POST Expense (purchasing UHT milk for 20000 from Wallet A)
  // Wallet A: 100000 - 20000 = 80000
  // Under category "Pembelian Bahan Baku", it should update Susu UHT's costPerUnit
  const expRes = await axios.post(`${apiUrl}/expenses`, {
    amount: 20000,
    walletId: walletA.id,
    category: 'Pembelian Bahan Baku',
    description: 'Beli Susu',
    purchasedIngredients: [
      { ingredientId: ingredientItem.id, costPerUnit: 18000 }
    ]
  }, { headers: authHeaders });
  const expenseItem = expRes.data;

  const walletsRes4 = await axios.get(`${apiUrl}/wallets`, { headers: authHeaders });
  const walletACheck3 = walletsRes4.data.find(w => w.id === walletA.id);
  const ingredientsRes1 = await axios.get(`${apiUrl}/ingredients`, { headers: authHeaders });
  const ingredientCheck1 = ingredientsRes1.data.find(i => i.id === ingredientItem.id);

  if (expRes.status === 201 && walletACheck3.balance === 80000 && ingredientCheck1.costPerUnit === 18000) {
    console.log('OK POST /api/expenses decremented Wallet A (80000) and updated Susu UHT price to 18000');
  } else {
    throw new Error(`POST Expense check failed: Wallet A=${walletACheck3.balance}, Susu UHT price=${ingredientCheck1.costPerUnit}`);
  }

  // DELETE Expense (restores Wallet A balance: 80000 + 20000 = 100000)
  const expDelRes = await axios.delete(`${apiUrl}/expenses/${expenseItem.id}`, { headers: authHeaders });
  const walletsRes5 = await axios.get(`${apiUrl}/wallets`, { headers: authHeaders });
  const walletACheck4 = walletsRes5.data.find(w => w.id === walletA.id);
  if (expDelRes.status === 200 && walletACheck4.balance === 100000) {
    console.log('OK DELETE /api/expenses restored Wallet A balance back to 100000');
  } else {
    throw new Error(`DELETE Expense balance check failed: Wallet A=${walletACheck4.balance}`);
  }

  console.log('\nTest 8: Transfers CRUD & Balance Adjustment');
  // POST Transfer (transfers 30000 from Wallet A to Wallet B)
  // Wallet A: 100000 - 30000 = 70000
  // Wallet B: 75000 + 30000 = 105000
  const trfRes = await axios.post(`${apiUrl}/transfers`, {
    fromWalletId: walletA.id,
    toWalletId: walletB.id,
    amount: 30000,
    description: 'Pindah dana'
  }, { headers: authHeaders });
  const transferItem = trfRes.data;

  const walletsRes6 = await axios.get(`${apiUrl}/wallets`, { headers: authHeaders });
  const walletACheck5 = walletsRes6.data.find(w => w.id === walletA.id);
  const walletBCheck5 = walletsRes6.data.find(w => w.id === walletB.id);
  if (trfRes.status === 201 && walletACheck5.balance === 70000 && walletBCheck5.balance === 105000) {
    console.log('OK POST /api/transfers adjusted Wallet A (70000) and Wallet B (105000) balances correctly');
  } else {
    throw new Error(`POST Transfer check failed: Wallet A=${walletACheck5.balance}, Wallet B=${walletBCheck5.balance}`);
  }

  // DELETE Transfer (reverts: Wallet A -> 100000, Wallet B -> 75000)
  const trfDelRes = await axios.delete(`${apiUrl}/transfers/${transferItem.id}`, { headers: authHeaders });
  const walletsRes7 = await axios.get(`${apiUrl}/wallets`, { headers: authHeaders });
  const walletACheck6 = walletsRes7.data.find(w => w.id === walletA.id);
  const walletBCheck6 = walletsRes7.data.find(w => w.id === walletB.id);
  if (trfDelRes.status === 200 && walletACheck6.balance === 100000 && walletBCheck6.balance === 75000) {
    console.log('OK DELETE /api/transfers reverted Wallet A (100000) and Wallet B (75000) balances correctly');
  } else {
    throw new Error(`DELETE Transfer check failed: Wallet A=${walletACheck6.balance}, Wallet B=${walletBCheck6.balance}`);
  }

  console.log('\n======================================');
  console.log('ALL CRUD ENDPOINTS TESTS PASSED!');
  console.log('======================================');
  shutdown(0);
} catch (error) {
  console.error('\nTEST FAILURE');
  if (error.response) {
    console.error(`Request failed with status ${error.response.status}`);
    console.error(JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error.message);
  }
  shutdown(1);
}
