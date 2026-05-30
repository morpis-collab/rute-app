import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import {
  applyStockMovements,
  applyPurchaseCosts,
  buildExpenseStockMovements,
  buildSaleStockMovements,
  calculateProductHpp,
  calculateApprovalStatus,
  getCashExpected,
  getEstimatedHpp,
  getExpenseTotal,
  getSalesSummary,
  refreshProductCosts,
} from './rules.js';
import { readDb, resetDb, updateDb } from './db.js';
import { scanReceipt } from './receiptAi.js';
import { ensureUploadRoot, saveUploadedFile, uploadRoot } from './uploads.js';
import { authenticateRequest, getAuthenticatedUser, loginWithRolePin } from './auth.js';
import { answerCopilot, buildCopilotContext, buildCopilotInsights } from './copilot.js';

const app = express();
const RECEIPT_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const RECEIPT_CATEGORIES = new Set(['bahan_baku', 'packaging', 'operasional', 'pra_operasional', 'lainnya']);
const EXPENSE_STATUSES = new Set(['auto_approved', 'pending', 'approved', 'rejected']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!RECEIPT_ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'receipt'));
    }
    return cb(null, true);
  },
});
const port = Number(process.env.RUTE_API_PORT || process.env.PORT || 4321);
const corsOrigin = process.env.RUTE_CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : true);

ensureUploadRoot();
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(uploadRoot));

function today() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: process.env.RUTE_BUSINESS_TZ || 'Asia/Makassar',
  });
}

function dashboardFrom(db, businessDate = today()) {
  const todaySales = db.sales.filter((sale) => sale.date?.startsWith(businessDate));
  const todayExpenses = db.expenses.filter((expense) => expense.date?.startsWith(businessDate));
  const products = refreshProductCosts(db.products, db.ingredients);
  const summary = getSalesSummary(todaySales);
  const estimatedHpp = getEstimatedHpp(todaySales, products);
  const expenseTotal = getExpenseTotal(todayExpenses);
  const criticalStock = db.ingredients.filter((ingredient) => ingredient.status === 'kritis');
  const cashSession = db.cashSessions.find((session) => session.date === businessDate);
  const latestNote = db.dailyNotes.find((note) => note.date === businessDate) || db.dailyNotes[0] || null;

  return {
    businessDate,
    summary,
    estimatedHpp,
    grossProfit: summary.totalOmzet - estimatedHpp,
    netProfitEstimate: summary.totalOmzet - estimatedHpp - expenseTotal,
    expenseTotal,
    criticalStock,
    cashSession,
    latestNote,
    recentActivity: db.activityLog.slice(-8).reverse(),
  };
}

function bootstrapPayload(db) {
  const products = refreshProductCosts(db.products, db.ingredients);
  return {
    products,
    sales: db.sales,
    expenses: db.expenses,
    ingredients: db.ingredients,
    stockMovements: db.stockMovements,
    activityLog: db.activityLog,
    cashSessions: db.cashSessions,
    cashAccounts: db.cashAccounts,
    cashTransactions: db.cashTransactions,
    openingCapital: openingCapitalPayload(db.openingCapital, { includePersonal: false }),
    dailyNotes: db.dailyNotes,
    receiptUploads: db.receiptUploads,
    dashboard: dashboardFrom(db),
  };
}

function sumContributionValues(items = []) {
  return items.reduce((sum, item) => sum + Number(item.estimatedValue || 0), 0);
}

function openingCapitalPayload(openingCapital = {}, { includePersonal = true } = {}) {
  const cashCapital = Number(openingCapital.cashCapital || 0);
  const assetContributions = Array.isArray(openingCapital.assetContributions)
    ? openingCapital.assetContributions
    : [];
  const inventoryContributions = Array.isArray(openingCapital.inventoryContributions)
    ? openingCapital.inventoryContributions
    : [];
  const personalExcludedItems = includePersonal && Array.isArray(openingCapital.personalExcludedItems)
    ? openingCapital.personalExcludedItems
    : [];
  const totalAssetContributions = sumContributionValues(assetContributions);
  const totalInventoryContributions = sumContributionValues(inventoryContributions);
  const totalPersonalExcluded = sumContributionValues(personalExcludedItems);

  return {
    businessStartDate: openingCapital.businessStartDate || null,
    cashCapital,
    assetContributions,
    inventoryContributions,
    personalExcludedItems,
    notes: openingCapital.notes || '',
    createdBy: openingCapital.createdBy || 'System',
    createdAt: openingCapital.createdAt || null,
    updatedBy: openingCapital.updatedBy || 'System',
    updatedAt: openingCapital.updatedAt || null,
    totals: {
      cashCapital,
      assetContributions: totalAssetContributions,
      inventoryContributions: totalInventoryContributions,
      businessCapital: cashCapital + totalAssetContributions + totalInventoryContributions,
      personalExcluded: totalPersonalExcluded,
    },
  };
}

function normalizeCapitalItems(items, kind) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    const name = String(item?.name || '').trim();
    const estimatedValue = Number(item?.estimatedValue ?? item?.value ?? 0);
    const quantity = Number(item?.quantity ?? 1);
    const normalized = {
      id: item?.id || `${kind.toUpperCase()}-${Date.now()}-${index}`,
      name,
      estimatedValue,
      notes: String(item?.notes || '').trim(),
    };

    if (kind !== 'personal') {
      normalized.quantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
      normalized.unit = String(item?.unit || 'item').trim();
      if (item?.category) normalized.category = String(item.category).trim();
    }
    if (kind === 'inventory' && item?.ingredientId) normalized.ingredientId = String(item.ingredientId);
    if (kind === 'personal') normalized.reason = String(item?.reason || 'Barang pribadi, tidak masuk usaha').trim();

    return normalized;
  });
}

function validateCapitalItems(items, label) {
  if (items.length > 100) return { error: `${label} maksimal 100 item` };
  const invalid = items.find((item) => (
    !item.name ||
    !Number.isFinite(Number(item.estimatedValue)) ||
    Number(item.estimatedValue) < 0 ||
    (item.quantity != null && (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0))
  ));
  if (invalid) return { error: `${label} wajib punya nama, nilai wajar tidak negatif, dan jumlah valid` };
  return null;
}

function openingCashFromCapital(db, businessDate, existingSession, openingCash) {
  if (openingCash != null) return { value: Number(openingCash), source: 'query' };
  if (existingSession?.openingCash != null) return { value: Number(existingSession.openingCash), source: 'cashSession' };
  if (db.openingCapital?.businessStartDate === businessDate) {
    return { value: Number(db.openingCapital.cashCapital || 0), source: 'openingCapital' };
  }
  return { value: 0, source: 'default' };
}

function cashExpectedPayload(db, { date, openingCash } = {}) {
  const businessDate = date || today();
  const existingSession = db.cashSessions.find((session) => session.date === businessDate) || null;
  const resolvedOpeningCash = openingCashFromCapital(db, businessDate, existingSession, openingCash);
  const daySales = db.sales.filter((sale) => sale.date?.startsWith(businessDate));
  const dayExpenses = db.expenses.filter((expense) => expense.date?.startsWith(businessDate));
  const salesSummary = getSalesSummary(daySales);
  const cashSales = Number(salesSummary.byMethod.cash || 0);
  const cashExpenses = getExpenseTotal(dayExpenses);
  const expectedCash = getCashExpected({
    sales: db.sales,
    expenses: db.expenses,
    openingCash: resolvedOpeningCash.value,
    businessDate,
  });

  return {
    date: businessDate,
    openingCash: resolvedOpeningCash.value,
    openingCashSource: resolvedOpeningCash.source,
    cashSales,
    cashExpenses,
    expectedCash,
    salesByMethod: salesSummary.byMethod,
    totalSales: salesSummary.totalOmzet,
    totalExpenseCash: cashExpenses,
    existingSession,
    canClose: existingSession?.status !== 'closed',
  };
}

function parsePositiveInt(value, fallback, max = 100) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function cashLedgerPayload(db, { limit, type, accountId, date } = {}) {
  const normalizedType = type ? String(type).trim() : '';
  const normalizedAccountId = accountId ? String(accountId).trim() : '';
  const businessDate = date ? String(date).trim() : '';
  const resolvedLimit = parsePositiveInt(limit, 50);
  const cashTransactions = [...db.cashTransactions]
    .filter((transaction) => !normalizedType || transaction.type === normalizedType)
    .filter((transaction) => !businessDate || transaction.date?.startsWith(businessDate))
    .filter((transaction) => {
      if (!normalizedAccountId) return true;
      return [transaction.accountId, transaction.fromAccountId, transaction.toAccountId]
        .some((id) => String(id || '') === normalizedAccountId);
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return {
    cashAccounts: db.cashAccounts,
    cashTransactions: cashTransactions.slice(0, resolvedLimit),
    totalCash: db.cashAccounts.reduce((sum, account) => sum + Number(account.balance || 0), 0),
    transactionCount: cashTransactions.length,
  };
}

function cashTransactionSummary(transactions) {
  return transactions.reduce((summary, transaction) => {
    const amount = Number(transaction.amount || 0);
    summary.count += 1;
    if (transaction.type === 'in') summary.cashIn += amount;
    if (transaction.type === 'out') summary.cashOut += amount;
    if (transaction.type === 'transfer') summary.transfer += amount;
    if (transaction.type === 'koreksi') summary.adjustment += amount;
    return summary;
  }, {
    count: 0,
    cashIn: 0,
    cashOut: 0,
    transfer: 0,
    adjustment: 0,
  });
}

function ownerCashPayload(db, { date, openingCash, limit, type, accountId } = {}) {
  const expected = cashExpectedPayload(db, { date, openingCash });
  const ledger = cashLedgerPayload(db, { limit, type, accountId });

  return {
    businessDate: expected.date,
    ...ledger,
    expectedCash: expected,
    cashSession: expected.existingSession,
    summary: cashTransactionSummary(ledger.cashTransactions),
    filters: {
      limit: parsePositiveInt(limit, 50),
      type: type || null,
      accountId: accountId || null,
    },
  };
}

function stockContractFrom(ingredient) {
  return {
    ...ingredient,
    category: ingredient.category || 'Bahan Baku',
    stockCurrent: Number(ingredient.stock ?? ingredient.stockCurrent ?? 0),
    emoji: ingredient.emoji || '📦',
  };
}

function ingredientUnitConversions(unit) {
  const normalizedUnit = String(unit || '').trim().toLowerCase();
  const conversions = {
    gram: { kg: 1000 },
    kg: { gram: 0.001 },
    ml: { l: 1000, liter: 1000 },
    l: { ml: 0.001, liter: 1 },
    liter: { ml: 0.001, l: 1 },
  };
  return conversions[normalizedUnit] || {};
}

function expenseContractFrom(expense) {
  return {
    ...expense,
    proofUrl: expense.proofUrl ?? expense.photoUrl ?? null,
  };
}

function parseNonNegativeNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return { error: `${fieldName} harus berupa angka positif` };
  }
  return { value: number };
}

function normalizeReceiptDate(value, fallback = new Date().toISOString()) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizeReceiptItems(items, ingredients = []) {
  if (!Array.isArray(items) || !items.length) {
    return { error: 'Minimal satu item resi wajib diisi sebelum konfirmasi', statusCode: 400 };
  }

  const normalized = [];
  for (const [index, item] of items.entries()) {
    const row = index + 1;
    const name = String(item.name || item.description || '').trim();
    if (!name) return { error: `Nama item resi baris ${row} wajib diisi`, statusCode: 400 };

    const category = RECEIPT_CATEGORIES.has(item.category) ? item.category : 'lainnya';
    const qty = Number(item.qty ?? item.quantity ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { error: `Qty item resi baris ${row} wajib lebih dari 0`, statusCode: 400 };
    }

    const priceResult = parseNonNegativeNumber(item.price ?? item.unitPrice ?? 0, `Harga item resi baris ${row}`);
    if (priceResult.error) return { ...priceResult, statusCode: 400 };

    const computedTotal = qty * priceResult.value;
    const totalResult = parseNonNegativeNumber(item.total ?? item.amount ?? computedTotal, `Total item resi baris ${row}`);
    if (totalResult.error) return { ...totalResult, statusCode: 400 };
    if (totalResult.value <= 0) {
      return { error: `Total item resi baris ${row} wajib lebih dari 0`, statusCode: 400 };
    }

    const addsStock = Boolean(item.addsStock);
    const ingredientId = item.ingredientId == null || item.ingredientId === ''
      ? null
      : Number(item.ingredientId);
    const ingredient = ingredients.find((candidate) => Number(candidate.id) === ingredientId);
    if (addsStock && !ingredient) {
      return { error: `Bahan stok item resi baris ${row} tidak valid`, statusCode: 400 };
    }

    const stockQty = addsStock ? Number(item.stockQty ?? qty) : 0;
    if (addsStock && (!Number.isFinite(stockQty) || stockQty <= 0)) {
      return { error: `Qty stok item resi baris ${row} wajib lebih dari 0`, statusCode: 400 };
    }

    normalized.push({
      id: item.id || row,
      name,
      category,
      qty,
      unit: String(item.unit || 'pcs').trim(),
      price: priceResult.value,
      total: totalResult.value,
      amount: totalResult.value,
      addsStock,
      ingredientId: addsStock ? ingredient.id : null,
      stockQty,
      stockUnit: addsStock ? String(item.stockUnit || ingredient.unit || item.unit || 'pcs').trim() : null,
    });
  }

  return { items: normalized };
}

function receiptAlreadyConfirmed(receiptUploads, uploadRecord) {
  if (!uploadRecord) return false;
  return receiptUploads.some((existing) => (
    (uploadRecord.fileName && existing.fileName === uploadRecord.fileName)
    || (uploadRecord.imageUrl && existing.imageUrl === uploadRecord.imageUrl)
  ));
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.auth?.role !== role) {
      return res.status(403).json({ error: 'Akses hanya untuk ' + role });
    }
    return next();
  };
}

function checkCashLock(db, businessDate) {
  const session = db.cashSessions.find((s) => s.date === businessDate);
  if (session?.status === 'closed') {
    return { error: `Kas untuk tanggal ${businessDate} sudah ditutup, transaksi ditolak.`, statusCode: 403 };
  }
  return null;
}

function notFound(res, entity = 'Data') {
  return res.status(404).json({ error: `${entity} tidak ditemukan` });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'rute-api', time: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const session = loginWithRolePin(readDb(), req.body);
  if (!session) return res.status(401).json({ error: 'Role atau PIN tidak valid' });
  return res.json(session);
});

app.use('/api', authenticateRequest);

app.get('/api/auth/me', (req, res) => {
  const user = getAuthenticatedUser(readDb(), req.auth);
  if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });
  return res.json({ user });
});

app.get('/api/bootstrap', (req, res) => {
  res.json(bootstrapPayload(readDb()));
});

app.get('/api/dashboard', (req, res) => {
  const db = readDb();
  res.json(dashboardFrom(db, req.query.date || today()));
});

app.get('/api/products', (req, res) => {
  const db = readDb();
  res.json(refreshProductCosts(db.products, db.ingredients));
});

app.post('/api/products', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const sellingPrice = Number(body.sellingPrice ?? body.price ?? 0);
    const recipe = Array.isArray(body.recipe) ? body.recipe : [];
    const draft = {
      id: body.id || 'PRD-' + Date.now(),
      name: String(body.name || '').trim(),
      category: body.category || 'Menu',
      sellingPrice,
      active: body.active ?? true,
      emoji: body.emoji || '☕',
      recipe,
    };

    if (!draft.name || sellingPrice <= 0) return { error: 'Nama menu dan harga jual wajib diisi' };

    const hpp = Math.round(calculateProductHpp(draft, db.ingredients));
    const product = {
      ...draft,
      hpp,
      margin: sellingPrice > 0 ? Math.round(((sellingPrice - hpp) / sellingPrice) * 100) : 0,
      createdAt: new Date().toISOString(),
    };

    db.products.push(product);
    db.activityLog.push({
      id: 'ACT-' + Date.now(),
      time: product.createdAt,
      action: 'Menu baru ditambahkan: ' + product.name,
      user: body.user || 'Owner',
      type: 'menu',
    });

    return { product, state: bootstrapPayload(db) };
  });

  if (result?.error) return res.status(400).json({ error: result.error });
  return res.status(201).json(result);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const body = req.body || {};
    const productIndex = db.products.findIndex((candidate) => String(candidate.id) === String(id));
    if (productIndex === -1) return { error: 'Menu tidak ditemukan', statusCode: 404 };

    const product = db.products[productIndex];
    const sellingPrice = Number(body.sellingPrice ?? body.price ?? product.sellingPrice ?? 0);
    const recipe = Array.isArray(body.recipe) ? body.recipe : product.recipe || [];

    const draft = {
      ...product,
      name: String(body.name || product.name || '').trim(),
      category: body.category || product.category || 'Menu',
      sellingPrice,
      active: body.active ?? product.active ?? true,
      emoji: body.emoji || product.emoji || '☕',
      recipe,
    };

    if (!draft.name || sellingPrice <= 0) return { error: 'Nama menu dan harga jual wajib diisi' };

    const hpp = Math.round(calculateProductHpp(draft, db.ingredients));
    const updatedProduct = {
      ...draft,
      hpp,
      margin: sellingPrice > 0 ? Math.round(((sellingPrice - hpp) / sellingPrice) * 100) : 0,
      updatedAt: new Date().toISOString(),
    };

    db.products[productIndex] = updatedProduct;
    db.activityLog.push({
      id: 'ACT-' + Date.now(),
      time: updatedProduct.updatedAt,
      action: 'Menu diperbarui: ' + updatedProduct.name,
      user: body.user || 'Owner',
      type: 'menu',
    });

    return { product: updatedProduct, state: bootstrapPayload(db) };
  });

  if (result?.error) return res.status(result.statusCode || 400).json({ error: result.error });
  return res.json(result);
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const product = db.products.find((candidate) => String(candidate.id) === String(id));
    if (!product) return { error: 'Menu tidak ditemukan', statusCode: 404 };

    const usedInSales = db.sales.some((sale) =>
      sale.items?.some((item) => String(item.productId) === String(id))
    );
    if (usedInSales) {
      return {
        error: 'Menu tidak bisa dihapus karena sudah memiliki riwayat transaksi penjualan. Silakan nonaktifkan menu ini.',
        statusCode: 400,
      };
    }

    db.products = db.products.filter((candidate) => String(candidate.id) !== String(id));
    
    const now = new Date().toISOString();
    db.activityLog.push({
      id: 'ACT-' + Date.now(),
      time: now,
      action: 'Menu dihapus: ' + product.name,
      user: req.query.user || req.body?.user || 'Owner',
      type: 'menu',
    });

    return { success: true, state: bootstrapPayload(db) };
  });

  if (result?.error) return res.status(result.statusCode || 400).json({ error: result.error });
  return res.json(result);
});

app.get('/api/ingredients', (req, res) => {
  res.json(readDb().ingredients);
});

app.post('/api/ingredients', requireRole('owner'), (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const unit = String(body.unit || '').trim();
    const category = String(body.category || 'bahan_baku').trim();
    const stock = Number(body.stock ?? body.stockCurrent ?? 0);
    const minStock = Number(body.minStock ?? 0);
    const costPerUnit = Number(body.costPerUnit ?? 0);

    if (!name) return { error: 'Nama bahan baku wajib diisi', statusCode: 400 };
    if (!unit) return { error: 'Unit bahan baku wajib diisi', statusCode: 400 };
    if (!Number.isFinite(stock) || stock < 0) {
      return { error: 'Stok awal harus berupa angka positif', statusCode: 400 };
    }
    if (!Number.isFinite(minStock) || minStock < 0) {
      return { error: 'Minimal stok harus berupa angka positif', statusCode: 400 };
    }
    if (!Number.isFinite(costPerUnit) || costPerUnit < 0) {
      return { error: 'Biaya per unit harus berupa angka positif', statusCode: 400 };
    }
    const duplicate = db.ingredients.some(
      (ingredient) => ingredient.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) return { error: 'Bahan baku dengan nama tersebut sudah ada', statusCode: 409 };

    const numericIds = db.ingredients
      .map((ingredient) => Number(ingredient.id))
      .filter((id) => Number.isInteger(id));
    const now = new Date().toISOString();
    const ingredient = {
      id: numericIds.length ? Math.max(...numericIds) + 1 : 1,
      name,
      category,
      unit,
      stock: Number(stock.toFixed(3)),
      minStock: Number(minStock.toFixed(3)),
      costPerUnit: Number(costPerUnit.toFixed(2)),
      status: stock <= minStock ? 'kritis' : 'aman',
      unitConversions: ingredientUnitConversions(unit),
      createdAt: now,
      updatedAt: now,
    };

    db.ingredients.push(ingredient);
    db.activityLog.push({
      id: 'ACT-' + Date.now(),
      time: now,
      action: 'Bahan baku baru ditambahkan: ' + ingredient.name,
      user: body.user || req.auth?.name || 'Owner',
      type: 'stok',
    });

    return {
      ingredient: stockContractFrom(ingredient),
      stock: db.ingredients.map(stockContractFrom),
      state: bootstrapPayload(db),
    };
  });

  if (result?.error) return res.status(result.statusCode || 400).json(result);
  return res.status(201).json(result);
});

app.delete('/api/ingredients/:id', requireRole('owner'), (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const ingredientId = Number(id);
    const ingredient = db.ingredients.find((candidate) => Number(candidate.id) === ingredientId);
    if (!ingredient) {
      return { error: 'Bahan baku tidak ditemukan', statusCode: 404 };
    }

    const usedInProducts = db.products.filter((product) =>
      product.recipe?.some((recipe) => Number(recipe.ingredientId) === ingredientId)
    );
    if (usedInProducts.length > 0) {
      const productNames = usedInProducts.map((p) => p.name).join(', ');
      return {
        error: `Bahan baku tidak bisa dihapus karena digunakan di resep: ${productNames}`,
        statusCode: 400,
      };
    }

    db.ingredients = db.ingredients.filter((candidate) => Number(candidate.id) !== ingredientId);
    db.stockMovements = db.stockMovements.filter((movement) => Number(movement.ingredientId) !== ingredientId);

    const now = new Date().toISOString();
    db.activityLog.push({
      id: 'ACT-' + Date.now(),
      time: now,
      action: 'Bahan baku dihapus: ' + ingredient.name,
      user: req.auth?.name || 'Owner',
      type: 'stok',
    });

    return { success: true, state: bootstrapPayload(db) };
  });

  if (result?.error) return res.status(result.statusCode || 400).json(result);
  return res.json(result);
});


app.get('/api/sales', (req, res) => {
  const { date, all } = req.query;
  const businessDate = date || today();
  const sales = readDb().sales;
  res.json(all === 'true' ? sales : sales.filter((sale) => sale.date?.startsWith(businessDate)));
});

app.post('/api/sales', (req, res) => {
  const result = updateDb((db) => {
    const lockError = checkCashLock(db, today());
    if (lockError) return lockError;

    const body = req.body || {};
    const products = refreshProductCosts(db.products, db.ingredients);
    const rawItems = Array.isArray(body.transaction?.items)
      ? body.transaction.items
      : Array.isArray(body.items)
        ? body.items
        : [];
    if (!rawItems.length) return { error: 'Minimal satu item penjualan wajib diisi', statusCode: 400 };

    const paymentMethod = body.transaction?.paymentMethod || body.paymentMethod || 'cash';
    if (!['cash', 'qris', 'transfer'].includes(paymentMethod)) {
      return { error: 'Metode pembayaran tidak valid', statusCode: 400 };
    }

    const transaction = body.transaction || {
      id: `TRX-${Date.now()}`,
      date: new Date().toISOString(),
      items: rawItems,
      total: Number(body.total || 0),
      paymentMethod,
      user: body.user || 'Partner',
    };
    transaction.items = transaction.items.map((item) => {
      const product = products.find((candidate) => String(candidate.id) === String(item.productId));
      const qty = Number(item.qty || item.quantity || 0);
      const price = Number(item.price ?? product?.sellingPrice ?? 0);
      const subtotal = Number(item.subtotal ?? price * qty);
      return {
        ...item,
        productId: item.productId,
        name: item.name || product?.name || 'Produk',
        qty,
        price,
        subtotal,
        estimatedHpp: Math.round(Number(product?.hpp || item.estimatedHpp || 0) * qty),
      };
    });
    if (transaction.items.some((item) => item.qty <= 0 || item.price < 0)) {
      return { error: 'Qty item wajib lebih dari 0 dan harga tidak boleh negatif', statusCode: 400 };
    }
    transaction.total = Number(transaction.total || transaction.items.reduce(
      (sum, item) => sum + Number(item.subtotal || 0),
      0,
    ));
    if (!Number.isFinite(transaction.total) || transaction.total <= 0) {
      return { error: 'Total penjualan wajib lebih dari 0', statusCode: 400 };
    }
    transaction.estimatedHpp = transaction.items.reduce(
      (sum, item) => sum + Number(item.estimatedHpp || 0),
      0,
    );
    const movements = body.stockMovements || buildSaleStockMovements(transaction, products);

    db.sales.push(transaction);
    db.stockMovements.push(...movements);
    db.ingredients = applyStockMovements(db.ingredients, movements);
    db.activityLog.push({
      id: `ACT-${Date.now()}`,
      time: transaction.date,
      action: `Input penjualan: ${transaction.items.map((item) => `${item.name} ${item.qty}x`).join(', ')}`,
      user: transaction.user || body.user || 'Partner',
      type: 'penjualan',
    });

    return { transaction, movements, state: bootstrapPayload(db) };
  });

  if (result?.error) return res.status(result.statusCode || 400).json(result);
  res.status(201).json(result);
});

app.get('/api/expenses', (req, res) => {
  const { date, all } = req.query;
  const businessDate = date || today();
  const expenses = readDb().expenses;
  const filtered = all === 'true' ? expenses : expenses.filter((expense) => expense.date?.startsWith(businessDate));
  res.json(filtered.map(expenseContractFrom));
});

app.post('/api/expenses', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const expenseDate = body.date || body.expense?.date || today();
    const lockError = checkCashLock(db, expenseDate.substring(0, 10));
    if (lockError) return lockError;

    const items = Array.isArray(body.expense?.items)
      ? body.expense.items
      : Array.isArray(body.items)
        ? body.items
        : [];
    if (!items.length) return { error: 'Minimal satu item pengeluaran wajib diisi', statusCode: 400 };
    const total = Number(body.expense?.total ?? body.total ?? items.reduce(
      (sum, item) => sum + Number(item.amount ?? item.total ?? 0),
      0,
    ));
    if (!Number.isFinite(total) || total <= 0) {
      return { error: 'Total pengeluaran wajib lebih dari 0', statusCode: 400 };
    }
    const expense = body.expense || {
      id: `EXP-${Date.now()}`,
      date: body.date || new Date().toISOString(),
      category: body.category || 'lainnya',
      description: body.description || 'Pengeluaran manual',
      items: items.map((item) => ({
        ...item,
        amount: Number(item.amount ?? item.total ?? 0),
      })),
      total,
      status: body.status || calculateApprovalStatus(total),
      photoUrl: body.proofUrl || body.photoUrl || null,
      proofUrl: body.proofUrl || body.photoUrl || null,
      sourceType: 'manual',
      user: body.user || 'Partner',
    };
    const movements = body.stockMovements || buildExpenseStockMovements(expense);

    db.expenses.unshift(expense);
    db.stockMovements.push(...movements);
    db.ingredients = applyPurchaseCosts(db.ingredients, expense.items || []);
    db.ingredients = applyStockMovements(db.ingredients, movements);
    db.activityLog.push({
      id: `ACT-${Date.now()}`,
      time: expense.date,
      action: `Input pengeluaran: ${expense.description}`,
      user: expense.user || 'Partner',
      type: 'pengeluaran',
    });

    return { expense, movements, state: bootstrapPayload(db) };
  });

  if (result?.error) return res.status(result.statusCode || 400).json(result);
  result.expense = expenseContractFrom(result.expense);
  res.status(201).json(result);
});

app.patch('/api/expenses/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, user = 'Owner' } = req.body || {};
  if (!['auto_approved', 'pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status tidak valid' });
  }

  const result = updateDb((db) => {
    const expense = db.expenses.find((candidate) => String(candidate.id) === String(id));
    if (!expense) return null;

    const oldStatus = expense.status;
    const newStatus = status;

    if (oldStatus === newStatus) return { expense, state: bootstrapPayload(db) };

    expense.status = newStatus;
    const now = new Date().toISOString();

    // 1. Transition to 'rejected' -> Restore cash and reverse stock movements
    if (newStatus === 'rejected') {
      const txId = expense.cashTransactionId;
      const tx = db.cashTransactions.find(t => String(t.id) === String(txId)) || 
                 db.cashTransactions.find(t => t.sourceType === 'receipt_expense' && String(t.sourceId) === String(expense.id));
      
      const cashAccountId = expense.cashAccountId || tx?.accountId;
      if (cashAccountId) {
        const cashAccount = db.cashAccounts.find(a => String(a.id) === String(cashAccountId));
        if (cashAccount) {
          cashAccount.balance = Number(cashAccount.balance || 0) + expense.total;
        }
      }
      
      if (tx || txId) {
        db.cashTransactions = db.cashTransactions.filter(
          t => String(t.id) !== String(txId) && !(t.sourceType === 'receipt_expense' && String(t.sourceId) === String(expense.id))
        );
        expense.cashTransactionId = null;
      }

      // Reverse stock movements
      const movements = db.stockMovements.filter(m => String(m.sourceId) === String(expense.id));
      movements.forEach((m) => {
        const ingredient = db.ingredients.find(i => String(i.id) === String(m.ingredientId));
        if (ingredient) {
          const { getIngredientStatus } = require('./rules.js');
          ingredient.stock = Math.max(0, Number((Number(ingredient.stock || 0) - m.qty).toFixed(3)));
          ingredient.status = getIngredientStatus(ingredient.stock, ingredient.minStock);
        }
      });
      db.stockMovements = db.stockMovements.filter(m => String(m.sourceId) !== String(expense.id));
    }

    // 2. Transition from 'rejected' back to active -> Re-deduct cash and apply stock movements
    if (oldStatus === 'rejected' && ['approved', 'pending', 'auto_approved'].includes(newStatus)) {
      const defaultCashAccountId = db.cashAccounts.find((account) => (
        ['cash', 'tunai'].includes(String(account.type || '').toLowerCase())
      ))?.id || db.cashAccounts[0]?.id || null;
      const cashAccountId = expense.cashAccountId || defaultCashAccountId;
      const cashAccount = cashAccountId
        ? db.cashAccounts.find((account) => String(account.id) === String(cashAccountId))
        : null;

      if (cashAccount) {
        const cashTransaction = {
          id: `CTX-${Date.now()}-${expense.id}`,
          date: expense.date,
          type: 'out',
          amount: expense.total,
          category: 'pengeluaran',
          description: expense.description,
          accountId: cashAccount.id,
          sourceType: 'receipt_expense',
          sourceId: expense.id,
          user: expense.user,
        };
        cashAccount.balance = Number(cashAccount.balance || 0) - expense.total;
        expense.cashTransactionId = cashTransaction.id;
        expense.cashAccountId = cashAccount.id;
        db.cashTransactions = [cashTransaction, ...db.cashTransactions];
      }

      // Recreate stock movements
      const movements = buildExpenseStockMovements(expense);
      db.stockMovements.push(...movements);
      db.ingredients = applyPurchaseCosts(db.ingredients, expense.items || []);
      db.ingredients = applyStockMovements(db.ingredients, movements);
    }

    db.activityLog.push({
      id: `ACT-${Date.now()}`,
      time: now,
      action: `Pengeluaran ${expense.id} ${newStatus === 'approved' ? 'disetujui' : newStatus === 'rejected' ? 'ditolak' : 'diubah status ke ' + newStatus}`,
      user,
      type: 'approval',
    });
    return { expense, state: bootstrapPayload(db) };
  });

  if (!result) return notFound(res, 'Pengeluaran');
  return res.json(result);
});

app.post('/api/receipts/scan', upload.single('receipt'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File resi wajib diunggah' });
    }

    const uploadRecord = saveUploadedFile(req.file, { folder: 'receipts' });
    const result = await scanReceipt({
      file: req.file,
      upload: uploadRecord,
      ingredients: readDb().ingredients,
    });
    if (result?.error) return res.status(result.statusCode || 400).json(result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/receipt-expenses', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const receipt = body.receipt || {};
    const receiptDate = normalizeReceiptDate(receipt.transactionDate || body.expense?.date);
    if (!receiptDate) return { error: 'Tanggal resi tidak valid', statusCode: 400 };

    const lockError = checkCashLock(db, receiptDate.substring(0, 10));
    if (lockError) return lockError;

    const normalizedItems = normalizeReceiptItems(receipt.items || body.expense?.items, db.ingredients);
    if (normalizedItems.error) return normalizedItems;

    const items = normalizedItems.items;
    const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    if (!Number.isFinite(total) || total <= 0) {
      return { error: 'Total resi wajib lebih dari 0', statusCode: 400 };
    }

    const incomingUpload = body.upload || receipt.upload || {};
    const uploadRecord = {
      id: incomingUpload.id || `RCPT-${Date.now()}`,
      originalFileName: incomingUpload.originalFileName || receipt.originalFileName || null,
      imageUrl: incomingUpload.imageUrl || receipt.imageUrl || body.imageUrl || null,
      fileName: incomingUpload.fileName || null,
      mimeType: incomingUpload.mimeType || null,
      fileSize: incomingUpload.fileSize || receipt.fileSize || null,
      aiStatus: 'confirmed',
      aiSource: receipt.source || null,
      aiConfidence: Number(receipt.confidence || 0),
      aiRaw: receipt,
      createdAt: new Date().toISOString(),
      user: body.user || body.expense?.user || getAuthenticatedUser(db, req.auth)?.name || 'Partner',
    };
    if (receiptAlreadyConfirmed(db.receiptUploads, uploadRecord)) {
      return { error: 'Resi ini sudah pernah dikonfirmasi', statusCode: 409, upload: uploadRecord };
    }

    const requestedStatus = body.expense?.status;
    if (requestedStatus && !EXPENSE_STATUSES.has(requestedStatus)) {
      return { error: 'Status pengeluaran tidak valid', statusCode: 400 };
    }

    const defaultCashAccountId = db.cashAccounts.find((account) => (
      ['cash', 'tunai'].includes(String(account.type || '').toLowerCase())
    ))?.id || db.cashAccounts[0]?.id || null;
    const cashAccountId = body.cashAccountId || body.expense?.cashAccountId || defaultCashAccountId;
    const cashAccount = cashAccountId
      ? db.cashAccounts.find((account) => String(account.id) === String(cashAccountId))
      : null;
    if (cashAccountId && !cashAccount) {
      return { error: 'Akun kas pengeluaran tidak ditemukan', statusCode: 400 };
    }

    const merchantName = String(receipt.merchantName || body.expense?.merchantName || '').trim();
    const expense = {
      id: body.expense?.id || `EXP-${Date.now()}`,
      date: receiptDate,
      category: body.expense?.category || (items.some((item) => item.category === 'packaging') ? 'packaging' : 'bahan_baku'),
      description: body.expense?.description || `Resi ${merchantName || 'pembelian'}`,
      items,
      total,
      status: requestedStatus || calculateApprovalStatus(total),
      photoUrl: uploadRecord.imageUrl,
      proofUrl: uploadRecord.imageUrl,
      sourceType: 'receipt_ai',
      cashAccountId: cashAccount?.id || null,
      receiptUploadId: uploadRecord.id,
      user: uploadRecord.user,
    };
    const movements = buildExpenseStockMovements(expense);
    uploadRecord.expenseId = expense.id;

    const cashTransaction = cashAccount ? {
      id: `CTX-${Date.now()}-${expense.id}`,
      date: expense.date,
      type: 'out',
      amount: expense.total,
      category: 'pengeluaran',
      description: expense.description,
      accountId: cashAccount.id,
      sourceType: 'receipt_expense',
      sourceId: expense.id,
      user: expense.user,
    } : null;
    if (cashTransaction) {
      cashAccount.balance = Number(cashAccount.balance || 0) - expense.total;
      expense.cashTransactionId = cashTransaction.id;
    }

    db.expenses.unshift(expense);
    db.receiptUploads.unshift(uploadRecord);
    if (cashTransaction) db.cashTransactions = [cashTransaction, ...db.cashTransactions];
    db.stockMovements.push(...movements);
    db.ingredients = applyPurchaseCosts(db.ingredients, expense.items || []);
    db.ingredients = applyStockMovements(db.ingredients, movements);
    db.activityLog.push({
      id: `ACT-${Date.now()}`,
      time: expense.date,
      action: `Upload resi ${expense.description} Rp ${Number(expense.total || 0).toLocaleString('id-ID')}`,
      user: expense.user,
      type: 'pengeluaran',
    });

    return { expense, upload: uploadRecord, cashTransaction, movements, state: bootstrapPayload(db) };
  });

  if (result?.error) return res.status(result.statusCode || 400).json(result);
  res.status(201).json(result);
});

app.get('/api/stock-movements', (req, res) => {
  res.json(readDb().stockMovements);
});

app.get('/api/stock', (req, res) => {
  res.json(readDb().ingredients.map(stockContractFrom));
});

app.post('/api/stock/adjust', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const ingredient = db.ingredients.find(
      (candidate) => String(candidate.id) === String(body.ingredientId),
    );
    if (!ingredient) return { error: 'Bahan tidak ditemukan' };

    const requestedType = String(body.type || body.movementType || '').trim();
    const directionMap = {
      in: 'masuk',
      masuk: 'masuk',
      out: 'keluar',
      keluar: 'keluar',
      waste: 'keluar',
    };
    const direction = directionMap[requestedType];
    if (!direction) return { error: 'Type stok harus in, out, atau waste', statusCode: 400 };

    const qty = Number(body.amount ?? body.qty ?? 0);
    const now = new Date().toISOString();
    const movement = {
      id: 'SM-' + Date.now() + '-' + ingredient.id,
      ingredientId: ingredient.id,
      type: direction,
      movementType: requestedType === 'waste' ? 'waste' : direction === 'masuk' ? 'in' : 'out',
      qty: Math.abs(qty),
      unit: body.unit || ingredient.unit,
      source: body.notes || body.reason || 'Koreksi stok manual',
      sourceType: 'manual',
      sourceId: null,
      date: now,
      user: body.user || 'Owner',
    };

    if (!movement.qty) return { error: 'Jumlah koreksi stok wajib lebih dari 0', statusCode: 400 };

    db.stockMovements.push(movement);
    db.ingredients = applyStockMovements(db.ingredients, [movement]);
    db.activityLog.push({
      id: 'ACT-' + Date.now(),
      time: now,
      action: 'Koreksi stok ' + ingredient.name + ': ' + (body.reason || '-'),
      user: movement.user,
      type: 'stok',
    });

    return {
      movement,
      movements: [movement],
      stock: db.ingredients.map(stockContractFrom),
      state: bootstrapPayload(db),
    };
  });

  if (result?.error) return res.status(result.statusCode || 400).json(result);
  return res.status(201).json(result);
});

app.get('/api/opening-capital', requireRole('owner'), (req, res) => {
  res.json(openingCapitalPayload(readDb().openingCapital));
});

app.put('/api/opening-capital', requireRole('owner'), (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const businessStartDate = body.businessStartDate || body.date || null;
    const cashCapital = Number(body.cashCapital ?? 0);
    const assetContributions = normalizeCapitalItems(body.assetContributions, 'asset');
    const inventoryContributions = normalizeCapitalItems(body.inventoryContributions, 'inventory');
    const personalExcludedItems = normalizeCapitalItems(body.personalExcludedItems, 'personal');

    if (businessStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(businessStartDate))) {
      return { error: 'businessStartDate harus format YYYY-MM-DD', statusCode: 400 };
    }
    if (!Number.isFinite(cashCapital) || cashCapital < 0) {
      return { error: 'cashCapital harus berupa angka positif', statusCode: 400 };
    }

    const validations = [
      validateCapitalItems(assetContributions, 'assetContributions'),
      validateCapitalItems(inventoryContributions, 'inventoryContributions'),
      validateCapitalItems(personalExcludedItems, 'personalExcludedItems'),
    ].filter(Boolean);
    if (validations[0]) return { ...validations[0], statusCode: 400 };

    const now = new Date().toISOString();
    const user = getAuthenticatedUser(db, req.auth)?.name || body.user || 'Owner';
    const previous = db.openingCapital || {};
    db.openingCapital = {
      businessStartDate,
      cashCapital,
      assetContributions,
      inventoryContributions,
      personalExcludedItems,
      notes: String(body.notes || '').trim(),
      createdBy: previous.createdBy || user,
      createdAt: previous.createdAt || now,
      updatedBy: user,
      updatedAt: now,
    };

    // Update ingredients starting stock and unit cost based on inventory contributions
    db.ingredients = db.ingredients.map((ingredient) => {
      const contribution = inventoryContributions.find(
        (c) => String(c.ingredientId) === String(ingredient.id)
      );
      if (contribution) {
        const qty = Number(contribution.quantity || 0);
        const val = Number(contribution.estimatedValue || 0);
        const cost = qty > 0 ? Number((val / qty).toFixed(3)) : 0;
        return {
          ...ingredient,
          stock: qty,
          costPerUnit: cost,
          status: qty <= (ingredient.minStock || 0) ? 'kritis' : 'aman',
          updatedAt: now,
        };
      }
      return ingredient;
    });

    db.activityLog.push({
      id: `ACT-${Date.now()}`,
      time: now,
      action: `Update modal awal usaha: Rp ${openingCapitalPayload(db.openingCapital).totals.businessCapital.toLocaleString('id-ID')}`,
      user,
      type: 'kas',
    });

    return { openingCapital: openingCapitalPayload(db.openingCapital), state: bootstrapPayload(db) };
  });

  if (result?.error) return res.status(result.statusCode || 400).json(result);
  return res.json(result);
});

app.get('/api/cash/expected', (req, res) => {
  const openingCash = req.query.openingCash != null ? Number(req.query.openingCash) : undefined;
  if (openingCash != null && (!Number.isFinite(openingCash) || openingCash < 0)) {
    return res.status(400).json({ error: 'openingCash harus berupa angka positif' });
  }

  return res.json(cashExpectedPayload(readDb(), {
    date: req.query.date,
    openingCash,
  }));
});

app.get('/api/cash/owner', requireRole('owner'), (req, res) => {
  const openingCash = req.query.openingCash != null ? Number(req.query.openingCash) : undefined;
  if (openingCash != null && (!Number.isFinite(openingCash) || openingCash < 0)) {
    return res.status(400).json({ error: 'openingCash harus berupa angka positif' });
  }

  res.json(ownerCashPayload(readDb(), {
    date: req.query.date,
    openingCash,
    limit: req.query.limit,
    type: req.query.type,
    accountId: req.query.accountId,
  }));
});

app.get('/api/cash/accounts', requireRole('owner'), (req, res) => {
  res.json(cashLedgerPayload(readDb(), {
    limit: req.query.limit,
    type: req.query.type,
    accountId: req.query.accountId,
    date: req.query.date,
  }));
});

app.get('/api/cash/transactions', requireRole('owner'), (req, res) => {
  res.json(cashLedgerPayload(readDb(), {
    limit: req.query.limit,
    type: req.query.type,
    accountId: req.query.accountId,
    date: req.query.date,
  }).cashTransactions);
});

app.post('/api/cash/transactions', requireRole('owner'), (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const type = String(body.type || '').trim();
    const amount = Number(body.amount || 0);
    const description = String(body.description || '').trim();
    const user = body.user || getAuthenticatedUser(db, req.auth)?.name || 'Owner';

    if (!['in', 'out', 'transfer', 'koreksi'].includes(type)) {
      return { error: 'Jenis mutasi kas tidak valid', statusCode: 400 };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: 'Nominal kas wajib lebih dari 0', statusCode: 400 };
    }
    if (!description) {
      return { error: 'Catatan atau alasan wajib diisi', statusCode: 400 };
    }

    const now = new Date().toISOString();
    const transactionDate = body.date || now;
    const lockError = checkCashLock(db, String(transactionDate).substring(0, 10));
    if (lockError) return lockError;

    const transaction = {
      id: `CTX-${Date.now()}`,
      date: transactionDate,
      type,
      amount,
      category: body.category || type,
      description,
      user,
    };

    const findAccount = (id) => db.cashAccounts.find((account) => String(account.id) === String(id));

    if (type === 'transfer') {
      const fromAccount = findAccount(body.fromAccountId);
      const toAccount = findAccount(body.toAccountId);
      if (!fromAccount || !toAccount) return { error: 'Akun asal atau tujuan tidak ditemukan', statusCode: 400 };
      if (fromAccount.id === toAccount.id) return { error: 'Akun asal dan tujuan tidak boleh sama', statusCode: 400 };
      if (Number(fromAccount.balance || 0) < amount) return { error: 'Saldo akun asal tidak cukup', statusCode: 400 };
      fromAccount.balance = Number(fromAccount.balance || 0) - amount;
      toAccount.balance = Number(toAccount.balance || 0) + amount;
      transaction.fromAccountId = fromAccount.id;
      transaction.toAccountId = toAccount.id;
    } else {
      const account = findAccount(body.accountId);
      if (!account) return { error: 'Akun kas tidak ditemukan', statusCode: 400 };
      const direction = type === 'out' ? -1 : body.adjustmentType === 'minus' ? -1 : 1;
      if (direction < 0 && Number(account.balance || 0) < amount) {
        return { error: 'Saldo akun tidak cukup', statusCode: 400 };
      }
      account.balance = Number(account.balance || 0) + direction * amount;
      transaction.accountId = account.id;
      if (type === 'koreksi') transaction.adjustmentType = direction < 0 ? 'minus' : 'plus';
    }

    db.cashTransactions = [transaction, ...db.cashTransactions];
    db.activityLog.push({
      id: `ACT-${Date.now()}`,
      time: now,
      action: `Mutasi kas ${type}: ${description}`,
      user,
      type: 'kas',
    });

    return { transaction, ...cashLedgerPayload(db) };
  });

  if (result?.error) return res.status(result.statusCode || 400).json(result);
  return res.status(201).json(result);
});

app.post('/api/cash/close', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const businessDate = body.date || today();
    const existing = db.cashSessions.find((session) => session.date === businessDate);
    if (existing?.status === 'closed') {
      return {
        error: 'Kas untuk tanggal ini sudah ditutup',
        statusCode: 409,
        cashSession: existing,
      };
    }

    if (body.actualCash == null || body.actualCash === '') {
      return { error: 'actualCash wajib diisi', statusCode: 400 };
    }

    const actualCash = Number(body.actualCash);
    if (!Number.isFinite(actualCash) || actualCash < 0) {
      return { error: 'actualCash harus berupa angka positif', statusCode: 400 };
    }

    const openingCashInput = existing?.openingCash ?? body.openingCash;
    const requestedOpeningCash = openingCashInput == null || openingCashInput === ''
      ? undefined
      : Number(openingCashInput);
    if (requestedOpeningCash != null && (!Number.isFinite(requestedOpeningCash) || requestedOpeningCash < 0)) {
      return { error: 'openingCash harus berupa angka positif', statusCode: 400 };
    }

    const expected = cashExpectedPayload(db, {
      date: businessDate,
      openingCash: requestedOpeningCash,
    });
    const qris = Number(body.qris ?? expected.salesByMethod.qris ?? 0);
    const transfer = Number(body.transfer ?? expected.salesByMethod.transfer ?? 0);
    if (!Number.isFinite(qris) || qris < 0 || !Number.isFinite(transfer) || transfer < 0) {
      return { error: 'qris dan transfer harus berupa angka positif', statusCode: 400 };
    }

    const closedBy = body.user || getAuthenticatedUser(db, req.auth)?.name || 'Partner';
    const difference = actualCash - expected.expectedCash;
    const closedSession = {
      date: businessDate,
      openingCash: expected.openingCash,
      closingCash: actualCash,
      expectedCash: expected.expectedCash,
      difference,
      differenceStatus: difference === 0 ? 'balanced' : difference > 0 ? 'over' : 'short',
      qris,
      transfer,
      totalExpenseCash: expected.totalExpenseCash,
      status: 'closed',
      notes: body.notes || '',
      closedBy,
      closedAt: new Date().toISOString(),
    };

    db.cashSessions = [closedSession, ...db.cashSessions.filter((session) => session.date !== businessDate)];
    db.activityLog.push({
      id: `ACT-${Date.now()}`,
      time: new Date().toISOString(),
      action: `Tutup kas harian dengan selisih Rp ${closedSession.difference.toLocaleString('id-ID')}`,
      user: closedBy,
      type: 'kas',
    });

    return { cashSession: closedSession, state: bootstrapPayload(db) };
  });

  if (result?.error) return res.status(result.statusCode || 400).json(result);
  res.status(201).json(result);
});

app.post('/api/daily-notes', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const note = String(body.note || '').trim();
    if (!note) return null;

    const entry = {
      date: body.date || today(),
      note,
      createdBy: body.user || 'Partner',
      createdAt: new Date().toISOString(),
    };
    db.dailyNotes = [entry, ...db.dailyNotes.filter((item) => item.date !== entry.date)];
    db.activityLog.push({
      id: `ACT-${Date.now()}`,
      time: entry.createdAt,
      action: 'Partner memperbarui catatan harian',
      user: entry.createdBy,
      type: 'catatan',
    });

    return { dailyNote: entry, state: bootstrapPayload(db) };
  });

  if (!result) return res.status(400).json({ error: 'Catatan tidak boleh kosong' });
  return res.status(201).json(result);
});

app.get('/api/reports/today', (req, res) => {
  const db = readDb();
  const businessDate = req.query.date || today();
  const sales = db.sales.filter((sale) => sale.date?.startsWith(businessDate));
  const expenses = db.expenses.filter((expense) => expense.date?.startsWith(businessDate));
  const summary = getSalesSummary(sales);
  const hpp = getEstimatedHpp(sales, refreshProductCosts(db.products, db.ingredients));
  const operationalExpense = getExpenseTotal(expenses);

  res.json({
    businessDate,
    totalOmzet: summary.totalOmzet,
    totalHpp: hpp,
    grossProfit: summary.totalOmzet - hpp,
    operationalExpense,
    netProfitEstimate: summary.totalOmzet - hpp - operationalExpense,
    totalTransactions: summary.totalTransaksi,
    totalCup: summary.totalCup,
    topMenus: summary.menuTerlaris,
  });
});

app.get('/api/copilot/insights', (req, res) => {
  const db = readDb();
  const user = getAuthenticatedUser(db, req.auth);
  const context = buildCopilotContext(db, {
    date: req.query.date,
    user,
  });

  res.json({
    insights: buildCopilotInsights(context),
    context: {
      businessDate: context.businessDate,
      role: user?.role || null,
      summary: context.summary,
      cash: context.cash,
    },
    source: 'local',
  });
});

app.post('/api/copilot/chat', async (req, res, next) => {
  try {
    const db = readDb();
    const user = getAuthenticatedUser(db, req.auth);
    const result = await answerCopilot({
      db,
      prompt: req.body?.prompt,
      history: req.body?.history,
      date: req.body?.date,
      user,
    });

    if (result?.error) return res.status(result.statusCode || 400).json(result);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/reset', (req, res) => {
    res.json(bootstrapPayload(resetDb()));
  });
}

app.use((error, req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Ukuran file resi maksimal 8MB'
      : 'File resi harus berupa gambar';
    return res.status(400).json({ error: message });
  }

  console.error(error);
  res.status(500).json({ error: 'Terjadi error di server RUTE API' });
});

app.listen(port, () => {
  console.log(`RUTE API listening on http://localhost:${port}`);
});
