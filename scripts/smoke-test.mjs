import { fork } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbFile = path.resolve(__dirname, '..', 'server', '.data', 'rute-test-db.json');
const apiUrl = 'http://localhost:54321/api';

console.log('=== RUTE Coffee API Smoke Test ===');

// Setup temporary test database configuration
process.env.PORT = '54321';
process.env.RUTE_API_PORT = '54321';
process.env.RUTE_DATA_FILE = testDbFile;
process.env.JWT_SECRET = 'test-jwt-secret-key-123456';
process.env.NODE_ENV = 'development';

// 1. Ensure clean slate for test database
if (fs.existsSync(testDbFile)) {
  fs.unlinkSync(testDbFile);
}

// 2. Start server
console.log('Starting RUTE API server on port 54321...');
const serverProcess = fork(path.join(__dirname, '..', 'server', 'index.js'), [], {
  env: process.env,
  silent: true // suppress logs to keep output clean
});

// Helper: Kill server and clean db
async function shutdown(code = 0) {
  console.log('\nCleaning up resources...');
  serverProcess.kill();
  if (fs.existsSync(testDbFile)) {
    fs.unlinkSync(testDbFile);
    console.log('Removed temporary test DB file.');
  }
  process.exit(code);
}

// Handle unexpected failures
serverProcess.on('exit', (exitCode) => {
  if (exitCode && exitCode !== 0) {
    console.error(`Server process exited unexpectedly with code ${exitCode}`);
    shutdown(1);
  }
});

// Helper: sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 3. Poll server until it responds
let retries = 10;
let isServerReady = false;
while (retries > 0) {
  try {
    await axios.get(`${apiUrl}/ingredients`); // public endpoint or standard check
    isServerReady = true;
    break;
  } catch (err) {
    if (err.response) {
      // Server responded with error, but it is active
      isServerReady = true;
      break;
    }
    retries--;
    await sleep(400);
  }
}

if (!isServerReady) {
  console.error('Server failed to start in time.');
  shutdown(1);
}
console.log('Server is active. Running tests...\n');

// 4. Run test cases
try {
  let ownerToken = '';
  let partnerToken = '';

  // --- CASE 1: Authentication ---
  console.log('Test Case 1: Authentication (Login Owner & Partner)');
  
  // Login Owner
  const ownerLoginRes = await axios.post(`${apiUrl}/auth/login`, {
    role: 'owner',
    pin: '123456'
  });
  if (ownerLoginRes.status === 200 && ownerLoginRes.data.token) {
    ownerToken = ownerLoginRes.data.token;
    console.log('✅ Owner Login: SUCCESS');
  } else {
    throw new Error('Owner Login failed');
  }

  // Login Partner
  const partnerLoginRes = await axios.post(`${apiUrl}/auth/login`, {
    role: 'partner',
    pin: '654321'
  });
  if (partnerLoginRes.status === 200 && partnerLoginRes.data.token) {
    partnerToken = partnerLoginRes.data.token;
    console.log('✅ Partner Login: SUCCESS');
  } else {
    throw new Error('Partner Login failed');
  }

  // Login with invalid credentials
  try {
    await axios.post(`${apiUrl}/auth/login`, {
      role: 'owner',
      pin: 'wrong-pin'
    });
    throw new Error('Login should have failed with incorrect PIN');
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('✅ Invalid Credentials Check: SUCCESS (401 returned)');
    } else {
      throw err;
    }
  }

  // --- CASE 2: Expected Cash ---
  console.log('\nTest Case 2: Retrieve Expected Cash');
  const expectedRes = await axios.get(`${apiUrl}/cash/expected`, {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });
  if (expectedRes.status === 200 && 'expectedCash' in expectedRes.data) {
    console.log(`✅ Expected Cash Retrieval: SUCCESS (${expectedRes.data.expectedCash} found)`);
  } else {
    throw new Error('Expected cash retrieval failed');
  }

  // --- CASE 3: Ingredients Master & Duplications ---
  console.log('\nTest Case 3: Ingredients Creation & Duplications Check');
  
  // Create ingredient by Owner
  const ingredientRes1 = await axios.post(`${apiUrl}/ingredients`, {
    name: 'Vanilla Syrup Premium',
    category: 'bahan_baku',
    unit: 'ml',
    stock: 1000,
    minStock: 200,
    costPerUnit: 120,
    user: 'Owner RUTE'
  }, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  if (ingredientRes1.status === 201) {
    console.log('✅ Create Ingredient by Owner: SUCCESS');
  } else {
    throw new Error('Create ingredient by owner failed');
  }

  // Duplication check (Expect 409 Conflict)
  try {
    await axios.post(`${apiUrl}/ingredients`, {
      name: 'Vanilla Syrup Premium',
      category: 'bahan_baku',
      unit: 'ml',
      stock: 1000,
      minStock: 200,
      costPerUnit: 120,
      user: 'Owner RUTE'
    }, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    throw new Error('Duplicate ingredient should have returned 409');
  } catch (err) {
    if (err.response && err.response.status === 409) {
      console.log('✅ Duplicate Ingredient Check: SUCCESS (409 Conflict returned)');
    } else {
      throw err;
    }
  }

  // Partner creation block (Expect 403 Forbidden)
  try {
    await axios.post(`${apiUrl}/ingredients`, {
      name: 'Caramel Sauce',
      category: 'bahan_baku',
      unit: 'ml',
      stock: 500,
      minStock: 100,
      costPerUnit: 150
    }, {
      headers: { Authorization: `Bearer ${partnerToken}` }
    });
    throw new Error('Partner role should be forbidden from creating ingredients (403)');
  } catch (err) {
    if (err.response && err.response.status === 403) {
      console.log('✅ Partner Role Check for Ingredients: SUCCESS (403 Forbidden returned)');
    } else {
      throw err;
    }
  }

  // --- CASE 4: Expenses Approval Workflow ---
  console.log('\nTest Case 4: Expenses Approval Gate');
  
  // Submit manual expense under 300,000 (auto_approved)
  const expenseRes1 = await axios.post(`${apiUrl}/expenses`, {
    category: 'operasional',
    description: 'Sapu lidi baru',
    total: 25000,
    items: [{ name: 'Sapu lidi', amount: 25000 }]
  }, {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });
  if (expenseRes1.status === 201 && expenseRes1.data.expense.status === 'auto_approved') {
    console.log('✅ Under Limit Expense: SUCCESS (Status auto_approved)');
  } else {
    throw new Error('Small expense auto approval failed');
  }

  // Submit manual expense above 300,000 (pending approval)
  const expenseRes2 = await axios.post(`${apiUrl}/expenses`, {
    category: 'maintenance',
    description: 'Servis mesin Espresso',
    total: 450000,
    items: [{ name: 'Jasa servis', amount: 450000 }]
  }, {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });
  
  let pendingExpenseId = '';
  if (expenseRes2.status === 201 && expenseRes2.data.expense.status === 'pending') {
    pendingExpenseId = expenseRes2.data.expense.id;
    console.log(`✅ Over Limit Expense: SUCCESS (Status pending, id: ${pendingExpenseId})`);
  } else {
    throw new Error('Large expense pending status failed');
  }

  // Approve expense using Owner account
  const approveRes = await axios.patch(`${apiUrl}/expenses/${pendingExpenseId}/status`, {
    status: 'approved',
    user: 'Owner RUTE'
  }, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  if (approveRes.status === 200 && approveRes.data.expense.status === 'approved') {
    console.log('✅ Expense Approval: SUCCESS (Status updated to approved)');
  } else {
    throw new Error('Expense approval failed');
  }

  // --- CASE 5: Close Cash & Multi-Closing Conflict ---
  console.log('\nTest Case 5: Close Cash & Double Close Handling (409 Conflict)');
  
  // First Close
  const closeRes1 = await axios.post(`${apiUrl}/cash/close`, {
    actualCash: 150000,
    notes: 'Tutup kas aman',
    user: 'Partner RUTE'
  }, {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });
  if (closeRes1.status === 201) {
    console.log('✅ Initial Cash Close: SUCCESS');
  } else {
    throw new Error('Initial cash close failed');
  }

  // Double Close (Expect 409 Conflict)
  try {
    await axios.post(`${apiUrl}/cash/close`, {
      actualCash: 160000,
      notes: 'Mencoba tutup kas kedua kali',
      user: 'Partner RUTE'
    }, {
      headers: { Authorization: `Bearer ${partnerToken}` }
    });
    throw new Error('Double close should have returned 409 Conflict');
  } catch (err) {
    if (err.response && err.response.status === 409) {
      console.log('✅ Double Close Protection Check: SUCCESS (409 conflict returned)');
    } else {
      throw err;
    }
  }

  console.log('\n======================================');
  console.log('🎉 ALL SMOKE TESTS COMPLETED SUCCESSFULLY! 🎉');
  console.log('======================================');
  shutdown(0);
} catch (error) {
  console.error('\n❌ SMOKE TEST FAILURE ❌');
  if (error.response) {
    console.error(`Request failed with status ${error.response.status}`);
    console.error(JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error.message);
  }
  shutdown(1);
}
