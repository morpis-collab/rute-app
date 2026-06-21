import { fork } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbFile = path.resolve(__dirname, '..', 'server', '.data', 'rute-test-db.json');
const apiUrl = 'http://127.0.0.1:54500/api';

console.log('=== RUTE Coffee API Smoke Test ===');

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
const businessDate = (date = new Date()) => date.toLocaleDateString('en-CA', {
  timeZone: 'Asia/Makassar',
});

let retries = 10;
let isServerReady = false;
while (retries > 0) {
  try {
    await axios.get(`${apiUrl}/health`);
    isServerReady = true;
    break;
  } catch (err) {
    console.log(`Polling error: ${err.message} (code: ${err.code})`);
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

  console.log('Test Case 1: Authentication (owner-only)');
  const ownerLoginRes = await axios.post(`${apiUrl}/auth/login`, {
    pin: '123456',
  });
  if (
    ownerLoginRes.status === 200
    && ownerLoginRes.data.token
    && ownerLoginRes.data.user?.role === 'owner'
  ) {
    ownerToken = ownerLoginRes.data.token;
    console.log('OK Owner login succeeded');
  } else {
    throw new Error('Owner login failed');
  }

  try {
    await axios.post(`${apiUrl}/auth/login`, {
      role: 'partner',
      pin: '654321',
    });
    throw new Error('Partner login should have failed');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('OK Partner login rejected');
    } else {
      throw err;
    }
  }

  try {
    await axios.post(`${apiUrl}/auth/login`, {
      pin: 'wrong-pin',
    });
    throw new Error('Invalid owner PIN should have failed');
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('OK Invalid owner PIN rejected');
    } else {
      throw err;
    }
  }

  const authHeaders = { Authorization: `Bearer ${ownerToken}` };

  console.log('\nTest Case 2: Retrieve expected cash');
  const expectedRes = await axios.get(`${apiUrl}/cash/expected`, {
    headers: authHeaders,
  });
  if (expectedRes.status === 200 && 'expectedCash' in expectedRes.data) {
    console.log(`OK Expected cash found: ${expectedRes.data.expectedCash}`);
  } else {
    throw new Error('Expected cash retrieval failed');
  }

  console.log('\nTest Case 3: Ingredients creation and duplicate guard');
  const ingredientPayload = {
    name: 'Vanilla Syrup Premium',
    category: 'bahan_baku',
    unit: 'ml',
    stock: 1000,
    minStock: 200,
    costPerUnit: 120,
    user: 'Owner RUTE',
  };
  const ingredientRes = await axios.post(`${apiUrl}/ingredients`, ingredientPayload, {
    headers: authHeaders,
  });
  if (ingredientRes.status === 201) {
    console.log('OK Owner can create ingredient');
  } else {
    throw new Error('Create ingredient failed');
  }

  try {
    await axios.post(`${apiUrl}/ingredients`, ingredientPayload, {
      headers: authHeaders,
    });
    throw new Error('Duplicate ingredient should have returned 409');
  } catch (err) {
    if (err.response?.status === 409) {
      console.log('OK Duplicate ingredient returns 409');
    } else {
      throw err;
    }
  }

  console.log('\nTest Case 4: Expenses approval workflow');
  const smallExpenseRes = await axios.post(`${apiUrl}/expenses`, {
    category: 'operasional',
    description: 'Sapu lidi baru',
    total: 25000,
    items: [{ name: 'Sapu lidi', amount: 25000 }],
  }, {
    headers: authHeaders,
  });
  if (smallExpenseRes.status === 201 && smallExpenseRes.data.expense.status === 'approved') {
    console.log('OK Small expense approved');
  } else {
    throw new Error('Small expense approval failed');
  }

  const largeExpenseRes = await axios.post(`${apiUrl}/expenses`, {
    category: 'maintenance',
    description: 'Servis mesin Espresso',
    total: 450000,
    items: [{ name: 'Jasa servis', amount: 450000 }],
  }, {
    headers: authHeaders,
  });
  const expenseId = largeExpenseRes.data.expense?.id;
  if (largeExpenseRes.status === 201 && largeExpenseRes.data.expense.status === 'approved' && expenseId) {
    console.log(`OK Large expense approved: ${expenseId}`);
  } else {
    throw new Error('Large expense approval failed');
  }

  const rejectRes = await axios.patch(`${apiUrl}/expenses/${expenseId}/status`, {
    status: 'rejected',
    user: 'Owner RUTE',
  }, {
    headers: authHeaders,
  });
  if (rejectRes.status === 200 && rejectRes.data.expense.status === 'rejected') {
    console.log('OK Expense rejection works');
  } else {
    throw new Error('Expense rejection failed');
  }

  console.log('\nTest Case 5: Close cash and double-close conflict');
  const closeRes = await axios.post(`${apiUrl}/cash/close`, {
    actualCash: 150000,
    notes: 'Tutup kas aman',
    user: 'Owner RUTE',
  }, {
    headers: authHeaders,
  });
  if (closeRes.status === 201) {
    console.log('OK Initial cash close works');
  } else {
    throw new Error('Initial cash close failed');
  }

  try {
    await axios.post(`${apiUrl}/cash/close`, {
      actualCash: 160000,
      notes: 'Mencoba tutup kas kedua kali',
      user: 'Owner RUTE',
    }, {
      headers: authHeaders,
    });
    throw new Error('Double close should have returned 409');
  } catch (err) {
    if (err.response?.status === 409) {
      console.log('OK Double close returns 409');
    } else {
      throw err;
    }
  }

  console.log('\nTest Case 6: Cash drawer reset and next-day open');
  const accountsRes = await axios.get(`${apiUrl}/cash/accounts`, {
    headers: authHeaders,
  });
  const accounts = accountsRes.data.cashAccounts;
  const drawer = accounts.find((account) => account.id === 'acc-01' || account.id === 'kas-utama');
  const brankas = accounts.find((account) => account.id === 'acc-brankas');
  if (!drawer || drawer.balance !== 0) {
    throw new Error(`Drawer balance is not 0 (found: ${drawer?.balance})`);
  }
  if (!brankas || brankas.balance !== 150000) {
    throw new Error(`Brankas balance is not 150000 (found: ${brankas?.balance})`);
  }
  console.log('OK Drawer reset and brankas transfer verified');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = businessDate(tomorrow);
  const openRes = await axios.post(`${apiUrl}/cash/open`, {
    date: tomorrowStr,
    openingCash: 125000,
    user: 'Owner RUTE',
  }, {
    headers: authHeaders,
  });
  if (openRes.status === 201 && openRes.data.cashSession.status === 'open' && openRes.data.cashSession.openingCash === 125000) {
    console.log('OK Next-day cash session opens');
  } else {
    throw new Error('Cash open failed');
  }

  const accountsRes2 = await axios.get(`${apiUrl}/cash/accounts`, {
    headers: authHeaders,
  });
  const accounts2 = accountsRes2.data.cashAccounts;
  const drawer2 = accounts2.find((account) => account.id === 'acc-01' || account.id === 'kas-utama');
  const brankas2 = accounts2.find((account) => account.id === 'acc-brankas');
  if (!drawer2 || drawer2.balance !== 125000) {
    throw new Error(`Drawer balance did not update to 125000 (found: ${drawer2?.balance})`);
  }
  if (!brankas2 || brankas2.balance !== 25000) {
    throw new Error(`Brankas balance did not deduct opening cash (found: ${brankas2?.balance})`);
  }
  console.log('OK Drawer and brankas balances updated after open');

  console.log('\n======================================');
  console.log('ALL SMOKE TESTS COMPLETED SUCCESSFULLY!');
  console.log('======================================');
  shutdown(0);
} catch (error) {
  console.error('\nSMOKE TEST FAILURE');
  if (error.response) {
    console.error(`Request failed with status ${error.response.status}`);
    console.error(JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error.message);
  }
  shutdown(1);
}
