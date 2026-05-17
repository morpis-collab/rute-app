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

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const port = Number(process.env.RUTE_API_PORT || process.env.PORT || 4321);

app.use(cors({ origin: process.env.RUTE_CORS_ORIGIN || true }));
app.use(express.json({ limit: '2mb' }));

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
    dailyNotes: db.dailyNotes,
    receiptUploads: db.receiptUploads,
    dashboard: dashboardFrom(db),
  };
}

function notFound(res, entity = 'Data') {
  return res.status(404).json({ error: `${entity} tidak ditemukan` });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'rute-api', time: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { role } = req.body || {};
  const user = readDb().users[role];
  if (!user) return res.status(401).json({ error: 'Role tidak valid' });
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

app.get('/api/ingredients', (req, res) => {
  res.json(readDb().ingredients);
});

app.get('/api/sales', (req, res) => {
  const { date } = req.query;
  const sales = readDb().sales;
  res.json(date ? sales.filter((sale) => sale.date?.startsWith(date)) : sales);
});

app.post('/api/sales', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const products = refreshProductCosts(db.products, db.ingredients);
    const transaction = body.transaction || {
      id: `TRX-${Date.now()}`,
      date: new Date().toISOString(),
      items: body.items || [],
      total: Number(body.total || 0),
      paymentMethod: body.paymentMethod || 'cash',
      user: body.user || 'Partner',
    };
    transaction.items = transaction.items.map((item) => {
      const product = products.find((candidate) => String(candidate.id) === String(item.productId));
      const qty = Number(item.qty || item.quantity || 0);
      return {
        ...item,
        qty,
        estimatedHpp: Math.round(Number(product?.hpp || item.estimatedHpp || 0) * qty),
      };
    });
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

  res.status(201).json(result);
});

app.get('/api/expenses', (req, res) => {
  const { date } = req.query;
  const expenses = readDb().expenses;
  res.json(date ? expenses.filter((expense) => expense.date?.startsWith(date)) : expenses);
});

app.post('/api/expenses', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const expense = body.expense || {
      id: `EXP-${Date.now()}`,
      date: body.date || new Date().toISOString(),
      category: body.category || 'lainnya',
      description: body.description || 'Pengeluaran manual',
      items: body.items || [],
      total: Number(body.total || 0),
      status: calculateApprovalStatus(Number(body.total || 0)),
      photoUrl: body.photoUrl || null,
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
    expense.status = status;
    db.activityLog.push({
      id: `ACT-${Date.now()}`,
      time: new Date().toISOString(),
      action: `Pengeluaran ${expense.id} ${status === 'approved' ? 'disetujui' : 'ditolak'}`,
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
    const result = await scanReceipt({ file: req.file });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/receipt-expenses', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const receipt = body.receipt || {};
    const total = receipt.items?.reduce((sum, item) => sum + Number(item.total || 0), 0) || 0;
    const expense = body.expense || {
      id: `EXP-${Date.now()}`,
      date: receipt.transactionDate || new Date().toISOString(),
      category: receipt.items?.some((item) => item.category === 'packaging') ? 'packaging' : 'bahan_baku',
      description: `Resi ${receipt.merchantName || 'pembelian'}`,
      items: receipt.items || [],
      total,
      status: calculateApprovalStatus(total),
      photoUrl: body.imageUrl || null,
      sourceType: 'receipt_ai',
      user: body.user || 'Partner',
    };
    const movements = body.stockMovements || buildExpenseStockMovements(expense);
    const uploadRecord = body.upload || {
      id: `RCPT-${Date.now()}`,
      expenseId: expense.id,
      originalFileName: receipt.originalFileName,
      imageUrl: body.imageUrl || null,
      aiStatus: 'confirmed',
      aiRaw: receipt,
      createdAt: new Date().toISOString(),
      user: body.user || 'Partner',
    };

    db.expenses.unshift(expense);
    db.receiptUploads.unshift(uploadRecord);
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

    return { expense, upload: uploadRecord, movements, state: bootstrapPayload(db) };
  });

  res.status(201).json(result);
});

app.get('/api/stock-movements', (req, res) => {
  res.json(readDb().stockMovements);
});

app.post('/api/stock/adjust', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const ingredient = db.ingredients.find(
      (candidate) => String(candidate.id) === String(body.ingredientId),
    );
    if (!ingredient) return { error: 'Bahan tidak ditemukan' };

    const direction = body.type === 'keluar' || body.movementType === 'out' ? 'keluar' : 'masuk';
    const now = new Date().toISOString();
    const movement = {
      id: 'SM-' + Date.now() + '-' + ingredient.id,
      ingredientId: ingredient.id,
      type: direction === 'keluar' ? 'keluar' : 'koreksi',
      movementType: 'adjustment',
      qty: Math.abs(Number(body.qty || 0)),
      unit: body.unit || ingredient.unit,
      source: body.reason || 'Koreksi stok manual',
      sourceType: 'manual',
      sourceId: null,
      date: now,
      user: body.user || 'Owner',
    };

    if (!movement.qty) return { error: 'Jumlah koreksi stok wajib lebih dari 0' };

    db.stockMovements.push(movement);
    db.ingredients = applyStockMovements(db.ingredients, [movement]);
    db.activityLog.push({
      id: 'ACT-' + Date.now(),
      time: now,
      action: 'Koreksi stok ' + ingredient.name + ': ' + (body.reason || '-'),
      user: movement.user,
      type: 'stok',
    });

    return { movements: [movement], state: bootstrapPayload(db) };
  });

  if (result?.error) return res.status(400).json({ error: result.error });
  return res.status(201).json(result);
});

app.post('/api/cash/close', (req, res) => {
  const result = updateDb((db) => {
    const body = req.body || {};
    const businessDate = body.date || today();
    const existing = db.cashSessions.find((session) => session.date === businessDate);
    const expectedCash = getCashExpected({
      sales: db.sales,
      expenses: db.expenses,
      openingCash: existing?.openingCash || body.openingCash || 0,
      businessDate,
    });
    const actualCash = Number(body.actualCash || 0);
    const closedSession = {
      date: businessDate,
      openingCash: Number(existing?.openingCash || body.openingCash || 0),
      closingCash: actualCash,
      expectedCash,
      difference: actualCash - expectedCash,
      qris: Number(body.qris || 0),
      transfer: Number(body.transfer || 0),
      totalExpenseCash: getExpenseTotal(db.expenses.filter((expense) => expense.date?.startsWith(businessDate))),
      status: 'closed',
      notes: body.notes || '',
    };

    db.cashSessions = [closedSession, ...db.cashSessions.filter((session) => session.date !== businessDate)];
    db.activityLog.push({
      id: `ACT-${Date.now()}`,
      time: new Date().toISOString(),
      action: `Tutup kas harian dengan selisih Rp ${closedSession.difference.toLocaleString('id-ID')}`,
      user: body.user || 'Partner',
      type: 'kas',
    });

    return { cashSession: closedSession, state: bootstrapPayload(db) };
  });

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

if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/reset', (req, res) => {
    res.json(bootstrapPayload(resetDb()));
  });
}

app.use((error, req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Terjadi error di server RUTE API' });
});

app.listen(port, () => {
  console.log(`RUTE API listening on http://localhost:${port}`);
});
