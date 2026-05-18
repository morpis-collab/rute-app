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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
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
    dailyNotes: db.dailyNotes,
    receiptUploads: db.receiptUploads,
    dashboard: dashboardFrom(db),
  };
}

function cashExpectedPayload(db, { date, openingCash } = {}) {
  const businessDate = date || today();
  const existingSession = db.cashSessions.find((session) => session.date === businessDate) || null;
  const resolvedOpeningCash = Number(openingCash ?? existingSession?.openingCash ?? 0);
  const daySales = db.sales.filter((sale) => sale.date?.startsWith(businessDate));
  const dayExpenses = db.expenses.filter((expense) => expense.date?.startsWith(businessDate));
  const salesSummary = getSalesSummary(daySales);
  const cashSales = Number(salesSummary.byMethod.cash || 0);
  const cashExpenses = getExpenseTotal(dayExpenses);
  const expectedCash = getCashExpected({
    sales: db.sales,
    expenses: db.expenses,
    openingCash: resolvedOpeningCash,
    businessDate,
  });

  return {
    date: businessDate,
    openingCash: resolvedOpeningCash,
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

function expenseContractFrom(expense) {
  return {
    ...expense,
    proofUrl: expense.proofUrl ?? expense.photoUrl ?? null,
  };
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.auth?.role !== role) {
      return res.status(403).json({ error: 'Akses hanya untuk ' + role });
    }
    return next();
  };
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

app.get('/api/ingredients', (req, res) => {
  res.json(readDb().ingredients);
});

app.get('/api/sales', (req, res) => {
  const { date, all } = req.query;
  const businessDate = date || today();
  const sales = readDb().sales;
  res.json(all === 'true' ? sales : sales.filter((sale) => sale.date?.startsWith(businessDate)));
});

app.post('/api/sales', (req, res) => {
  const result = updateDb((db) => {
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
      fileName: receipt.upload?.fileName || null,
      mimeType: receipt.upload?.mimeType || null,
      fileSize: receipt.fileSize || receipt.upload?.fileSize || null,
      aiStatus: 'confirmed',
      aiRaw: receipt,
      createdAt: new Date().toISOString(),
      user: body.user || 'Partner',
    };
    uploadRecord.imageUrl = uploadRecord.imageUrl || receipt.imageUrl || body.imageUrl || null;

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
    const transaction = {
      id: `CTX-${Date.now()}`,
      date: now,
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

    const requestedOpeningCash = Number(existing?.openingCash ?? body.openingCash ?? 0);
    if (!Number.isFinite(requestedOpeningCash) || requestedOpeningCash < 0) {
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
