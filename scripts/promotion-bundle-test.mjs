import assert from 'assert/strict';
import { fork } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbFile = path.resolve(__dirname, '..', 'server', '.data', 'rute-promo-test-db.json');
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

serverProcess.on('exit', (exitCode) => {
  if (exitCode && exitCode !== 0) shutdown(1);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  let isServerReady = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await axios.get(`${apiUrl}/health`);
      isServerReady = true;
      break;
    } catch {
      await sleep(400);
    }
  }
  assert.equal(isServerReady, true, 'API server should become ready');

  const loginRes = await axios.post(`${apiUrl}/auth/login`, { pin: '123456' });
  const headers = { Authorization: `Bearer ${loginRes.data.token}` };

  const promoPayload = {
    name: 'Beli 2 Kopi Susu 18K',
    type: 'bundle',
    status: 'active',
    startDate: '2026-06-15',
    endDate: '2026-06-30',
    targetProductIds: ['1'],
    bundleQty: 2,
    bundlePrice: 18000,
    targetSales: 20,
    budget: 50000,
  };
  const promoRes = await axios.post(`${apiUrl}/promotions`, promoPayload, { headers });
  assert.equal(promoRes.status, 201);
  assert.equal(promoRes.data.promotion.bundleQty, 2);
  assert.equal(promoRes.data.promotion.bundlePrice, 18000);

  const product = { id: 1, name: 'Kopi Susu RUTE', sellingPrice: 10000 };
  const saleRes = await axios.post(`${apiUrl}/sales`, {
    entrySource: 'owner_closing',
    date: '2026-06-16T12:00:00.000Z',
    items: [{
      productId: 1,
      name: product.name,
      qty: 2,
      price: 9000,
      subtotal: 18000,
      normalPrice: 10000,
      discountAmount: 1000,
      promoId: promoRes.data.promotion.id,
      promoName: promoRes.data.promotion.name,
    }],
    total: 18000,
    paymentBreakdown: { cash: 18000, qris: 0, transfer: 0 },
    user: 'Owner RUTE',
  }, { headers });
  assert.equal(saleRes.status, 201);
  const savedItem = saleRes.data.transaction.items[0];
  assert.equal(savedItem.qty, 2);
  assert.equal(savedItem.price, 9000);
  assert.equal(savedItem.subtotal, 18000);
  assert.equal(savedItem.normalPrice, 10000);
  assert.equal(savedItem.discountAmount, 1000);
  assert.equal(savedItem.promoId, promoRes.data.promotion.id);

  await shutdown(0);
} catch (error) {
  console.error(error.response?.data || error);
  await shutdown(1);
}
