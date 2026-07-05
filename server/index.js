import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readDb, resetDb, updateDb } from './db.js';
import { authenticateRequest, getAuthenticatedUser, loginWithRolePin } from './auth.js';

const app = express();
const port = Number(process.env.RUTE_API_PORT || process.env.PORT || 4321);
const corsOrigin = process.env.RUTE_CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : true);

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '2mb' }));

// Helper to update ingredient costPerUnit from purchasedIngredients array
function updateIngredientCosts(db, purchasedIngredients) {
  if (!Array.isArray(purchasedIngredients)) return;
  for (const item of purchasedIngredients) {
    if (!item || !item.ingredientId) continue;
    const ingredient = db.ingredients.find(ing => String(ing.id) === String(item.ingredientId));
    if (!ingredient) continue;
    
    let nextCost = null;
    if (item.costPerUnit !== undefined && Number(item.costPerUnit) > 0) {
      nextCost = Number(item.costPerUnit);
    } else if (item.price !== undefined && Number(item.price) > 0) {
      nextCost = Number(item.price);
    } else if (item.qty && item.total && Number(item.qty) > 0) {
      nextCost = Number(item.total) / Number(item.qty);
    } else if (item.quantity && item.total && Number(item.quantity) > 0) {
      nextCost = Number(item.total) / Number(item.quantity);
    }
    
    if (nextCost !== null && !Number.isNaN(nextCost)) {
      ingredient.costPerUnit = Number(nextCost.toFixed(2));
    }
  }
}

// -------------------------------------------------------------
// Public Endpoints
// -------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'rute-api', time: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const session = loginWithRolePin(readDb(), req.body);
  if (!session) return res.status(401).json({ error: 'PIN owner tidak valid' });
  return res.json(session);
});

// -------------------------------------------------------------
// Authenticated Endpoints
// -------------------------------------------------------------
app.use('/api', authenticateRequest);

app.get('/api/auth/me', (req, res) => {
  const user = getAuthenticatedUser(readDb(), req.auth);
  if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });
  return res.json({ user });
});

// GET /api/bootstrap
app.get('/api/bootstrap', (req, res) => {
  const db = readDb();
  res.json({
    wallets: db.wallets || [],
    categories: db.categories || { income: [], expense: [] },
    incomes: db.incomes || [],
    expenses: db.expenses || [],
    transfers: db.transfers || [],
    ingredients: db.ingredients || [],
  });
});

// -------------------------------------------------------------
// Wallets CRUD
// -------------------------------------------------------------
app.get('/api/wallets', (req, res) => {
  const db = readDb();
  res.json(db.wallets || []);
});

app.post('/api/wallets', (req, res) => {
  const result = updateDb((db) => {
    const { id, name, balance } = req.body;
    if (!name || !String(name).trim()) return { error: 'Nama wallet wajib diisi', statusCode: 400 };
    const walletId = id || `wallet-${Date.now()}`;
    if (db.wallets.some(w => String(w.id) === String(walletId))) {
      return { error: 'Wallet dengan ID ini sudah ada', statusCode: 409 };
    }
    const newWallet = {
      id: walletId,
      name: String(name).trim(),
      balance: Number(balance || 0),
      createdAt: new Date().toISOString()
    };
    db.wallets.push(newWallet);
    return newWallet;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.status(201).json(result);
});

app.put('/api/wallets/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const wallet = db.wallets.find(w => String(w.id) === String(id));
    if (!wallet) return { error: 'Wallet tidak ditemukan', statusCode: 404 };
    
    if (req.body.name !== undefined) {
      wallet.name = String(req.body.name).trim();
    }
    if (req.body.balance !== undefined) {
      wallet.balance = Number(req.body.balance || 0);
    }
    return wallet;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
});

app.delete('/api/wallets/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const index = db.wallets.findIndex(w => String(w.id) === String(id));
    if (index === -1) return { error: 'Wallet tidak ditemukan', statusCode: 404 };
    db.wallets.splice(index, 1);
    return { success: true };
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
});

// -------------------------------------------------------------
// Categories CRUD
// -------------------------------------------------------------
app.post('/api/categories', (req, res) => {
  const { type, name } = req.body;
  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Type harus income atau expense' });
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  }
  const categoryName = String(name).trim();
  
  const result = updateDb((db) => {
    if (!db.categories) db.categories = { income: [], expense: [] };
    if (!db.categories[type]) db.categories[type] = [];
    
    if (db.categories[type].includes(categoryName)) {
      return { error: 'Kategori sudah ada', statusCode: 409 };
    }
    db.categories[type].push(categoryName);
    return db.categories;
  });
  
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.status(201).json(result);
});

const deleteCategoryHandler = (req, res) => {
  const type = req.params.type || req.body.type || req.query.type;
  const name = req.params.name || req.body.name || req.query.name;
  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Type harus income atau expense' });
  }
  if (!name) {
    return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  }
  const categoryName = String(name).trim();
  
  const result = updateDb((db) => {
    if (!db.categories || !db.categories[type]) return { error: 'Kategori tidak ditemukan', statusCode: 404 };
    const index = db.categories[type].indexOf(categoryName);
    if (index === -1) return { error: 'Kategori tidak ditemukan', statusCode: 404 };
    db.categories[type].splice(index, 1);
    return db.categories;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
};

app.delete('/api/categories', deleteCategoryHandler);
app.delete('/api/categories/:type/:name', deleteCategoryHandler);

// -------------------------------------------------------------
// Incomes CRUD
// -------------------------------------------------------------
app.get('/api/incomes', (req, res) => {
  const db = readDb();
  res.json(db.incomes || []);
});

app.post('/api/incomes', (req, res) => {
  const result = updateDb((db) => {
    const { id, amount, walletId, category, notes, date, user } = req.body;
    if (amount === undefined || Number(amount) <= 0) {
      return { error: 'Nominal income harus lebih dari 0', statusCode: 400 };
    }
    if (!walletId) {
      return { error: 'Wallet ID wajib ditentukan', statusCode: 400 };
    }
    const wallet = db.wallets.find(w => String(w.id) === String(walletId));
    if (!wallet) {
      return { error: 'Wallet tidak ditemukan', statusCode: 404 };
    }
    
    const incomeId = id || `inc-${Date.now()}`;
    const newIncome = {
      id: incomeId,
      amount: Number(amount),
      walletId,
      category: category ? String(category).trim() : 'Lain-lain',
      notes: notes ? String(notes).trim() : '',
      date: date || new Date().toISOString(),
      user: user || 'Owner',
      createdAt: new Date().toISOString()
    };
    
    db.incomes.push(newIncome);
    wallet.balance = Number((Number(wallet.balance || 0) + Number(amount)).toFixed(2));
    
    return newIncome;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.status(201).json(result);
});

app.put('/api/incomes/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const incomeIndex = db.incomes.findIndex(inc => String(inc.id) === String(id));
    if (incomeIndex === -1) return { error: 'Income tidak ditemukan', statusCode: 404 };
    
    const oldIncome = db.incomes[incomeIndex];
    const newAmount = req.body.amount !== undefined ? Number(req.body.amount) : oldIncome.amount;
    const newWalletId = req.body.walletId !== undefined ? req.body.walletId : oldIncome.walletId;
    
    if (newAmount <= 0) {
      return { error: 'Nominal income harus lebih dari 0', statusCode: 400 };
    }
    
    const oldWallet = db.wallets.find(w => String(w.id) === String(oldIncome.walletId));
    const newWallet = db.wallets.find(w => String(w.id) === String(newWalletId));
    if (!newWallet) {
      return { error: 'Wallet tujuan tidak ditemukan', statusCode: 404 };
    }
    
    if (oldWallet) {
      oldWallet.balance = Number((Number(oldWallet.balance || 0) - Number(oldIncome.amount)).toFixed(2));
    }
    newWallet.balance = Number((Number(newWallet.balance || 0) + Number(newAmount)).toFixed(2));
    
    const updatedIncome = {
      ...oldIncome,
      amount: newAmount,
      walletId: newWalletId,
      category: req.body.category !== undefined ? String(req.body.category).trim() : oldIncome.category,
      notes: req.body.notes !== undefined ? req.body.notes : oldIncome.notes,
      date: req.body.date !== undefined ? req.body.date : oldIncome.date,
      user: req.body.user !== undefined ? req.body.user : oldIncome.user,
      updatedAt: new Date().toISOString()
    };
    
    db.incomes[incomeIndex] = updatedIncome;
    return updatedIncome;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
});

app.delete('/api/incomes/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const index = db.incomes.findIndex(inc => String(inc.id) === String(id));
    if (index === -1) return { error: 'Income tidak ditemukan', statusCode: 404 };
    
    const income = db.incomes[index];
    const wallet = db.wallets.find(w => String(w.id) === String(income.walletId));
    if (wallet) {
      wallet.balance = Number((Number(wallet.balance || 0) - Number(income.amount)).toFixed(2));
    }
    
    db.incomes.splice(index, 1);
    return { success: true };
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
});

// -------------------------------------------------------------
// Expenses CRUD
// -------------------------------------------------------------
app.get('/api/expenses', (req, res) => {
  const db = readDb();
  res.json(db.expenses || []);
});

app.post('/api/expenses', (req, res) => {
  const result = updateDb((db) => {
    const { id, amount, total, walletId, category, description, date, user, purchasedIngredients } = req.body;
    const expenseValue = amount !== undefined ? Number(amount) : (total !== undefined ? Number(total) : 0);
    if (expenseValue <= 0) {
      return { error: 'Nominal expense harus lebih dari 0', statusCode: 400 };
    }
    if (!walletId) {
      return { error: 'Wallet ID wajib ditentukan', statusCode: 400 };
    }
    const wallet = db.wallets.find(w => String(w.id) === String(walletId));
    if (!wallet) {
      return { error: 'Wallet tidak ditemukan', statusCode: 404 };
    }
    
    const expenseId = id || `exp-${Date.now()}`;
    const newExpense = {
      id: expenseId,
      amount: expenseValue,
      total: expenseValue,
      walletId,
      category: category ? String(category).trim() : 'Lain-lain',
      description: description ? String(description).trim() : '',
      date: date || new Date().toISOString(),
      user: user || 'Owner',
      purchasedIngredients: purchasedIngredients || [],
      createdAt: new Date().toISOString()
    };
    
    wallet.balance = Number((Number(wallet.balance || 0) - expenseValue).toFixed(2));
    db.expenses.push(newExpense);
    
    if (newExpense.category === 'Pembelian Bahan Baku' && purchasedIngredients) {
      updateIngredientCosts(db, purchasedIngredients);
    }
    
    return newExpense;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.status(201).json(result);
});

app.put('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const expenseIndex = db.expenses.findIndex(exp => String(exp.id) === String(id));
    if (expenseIndex === -1) return { error: 'Expense tidak ditemukan', statusCode: 404 };
    
    const oldExpense = db.expenses[expenseIndex];
    const oldVal = oldExpense.amount !== undefined ? oldExpense.amount : (oldExpense.total !== undefined ? oldExpense.total : 0);
    const newAmount = req.body.amount !== undefined ? Number(req.body.amount) : req.body.total !== undefined ? Number(req.body.total) : oldVal;
    const newWalletId = req.body.walletId !== undefined ? req.body.walletId : oldExpense.walletId;
    
    if (newAmount <= 0) {
      return { error: 'Nominal expense harus lebih dari 0', statusCode: 400 };
    }
    
    const oldWallet = db.wallets.find(w => String(w.id) === String(oldExpense.walletId));
    const newWallet = db.wallets.find(w => String(w.id) === String(newWalletId));
    if (!newWallet) {
      return { error: 'Wallet tidak ditemukan', statusCode: 404 };
    }
    
    if (oldWallet) {
      oldWallet.balance = Number((Number(oldWallet.balance || 0) + Number(oldVal)).toFixed(2));
    }
    newWallet.balance = Number((Number(newWallet.balance || 0) - Number(newAmount)).toFixed(2));
    
    const category = req.body.category !== undefined ? String(req.body.category).trim() : oldExpense.category;
    const purchasedIngredients = req.body.purchasedIngredients !== undefined ? req.body.purchasedIngredients : oldExpense.purchasedIngredients;
    
    const updatedExpense = {
      ...oldExpense,
      amount: newAmount,
      total: newAmount,
      walletId: newWalletId,
      category,
      description: req.body.description !== undefined ? String(req.body.description).trim() : oldExpense.description,
      date: req.body.date !== undefined ? req.body.date : oldExpense.date,
      user: req.body.user !== undefined ? req.body.user : oldExpense.user,
      purchasedIngredients,
      updatedAt: new Date().toISOString()
    };
    
    db.expenses[expenseIndex] = updatedExpense;
    
    if (category === 'Pembelian Bahan Baku' && purchasedIngredients) {
      updateIngredientCosts(db, purchasedIngredients);
    }
    
    return updatedExpense;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
});

app.delete('/api/expenses/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const index = db.expenses.findIndex(exp => String(exp.id) === String(id));
    if (index === -1) return { error: 'Expense tidak ditemukan', statusCode: 404 };
    
    const expense = db.expenses[index];
    const expenseVal = expense.amount !== undefined ? expense.amount : (expense.total !== undefined ? expense.total : 0);
    const wallet = db.wallets.find(w => String(w.id) === String(expense.walletId));
    if (wallet) {
      wallet.balance = Number((Number(wallet.balance || 0) + Number(expenseVal)).toFixed(2));
    }
    
    db.expenses.splice(index, 1);
    return { success: true };
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
});

// -------------------------------------------------------------
// Transfers CRUD
// -------------------------------------------------------------
app.get('/api/transfers', (req, res) => {
  const db = readDb();
  res.json(db.transfers || []);
});

app.post('/api/transfers', (req, res) => {
  const result = updateDb((db) => {
    const { id, fromWalletId, toWalletId, amount, description, date, user } = req.body;
    if (!amount || Number(amount) <= 0) {
      return { error: 'Nominal transfer harus lebih dari 0', statusCode: 400 };
    }
    if (!fromWalletId || !toWalletId) {
      return { error: 'Wallet asal dan tujuan wajib ditentukan', statusCode: 400 };
    }
    if (String(fromWalletId) === String(toWalletId)) {
      return { error: 'Wallet asal dan tujuan tidak boleh sama', statusCode: 400 };
    }
    
    const fromWallet = db.wallets.find(w => String(w.id) === String(fromWalletId));
    const toWallet = db.wallets.find(w => String(w.id) === String(toWalletId));
    if (!fromWallet || !toWallet) {
      return { error: 'Wallet asal atau tujuan tidak ditemukan', statusCode: 404 };
    }
    
    const transferId = id || `trf-${Date.now()}`;
    const newTransfer = {
      id: transferId,
      fromWalletId,
      toWalletId,
      amount: Number(amount),
      description: description ? String(description).trim() : '',
      date: date || new Date().toISOString(),
      user: user || 'Owner',
      createdAt: new Date().toISOString()
    };
    
    fromWallet.balance = Number((Number(fromWallet.balance || 0) - Number(amount)).toFixed(2));
    toWallet.balance = Number((Number(toWallet.balance || 0) + Number(amount)).toFixed(2));
    
    db.transfers.push(newTransfer);
    return newTransfer;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.status(201).json(result);
});

app.put('/api/transfers/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const transferIndex = db.transfers.findIndex(t => String(t.id) === String(id));
    if (transferIndex === -1) return { error: 'Transfer tidak ditemukan', statusCode: 404 };
    
    const oldTransfer = db.transfers[transferIndex];
    const newAmount = req.body.amount !== undefined ? Number(req.body.amount) : oldTransfer.amount;
    const newFromWalletId = req.body.fromWalletId !== undefined ? req.body.fromWalletId : oldTransfer.fromWalletId;
    const newToWalletId = req.body.toWalletId !== undefined ? req.body.toWalletId : oldTransfer.toWalletId;
    
    if (newAmount <= 0) {
      return { error: 'Nominal transfer harus lebih dari 0', statusCode: 400 };
    }
    if (String(newFromWalletId) === String(newToWalletId)) {
      return { error: 'Wallet asal dan tujuan tidak boleh sama', statusCode: 400 };
    }
    
    const oldFromWallet = db.wallets.find(w => String(w.id) === String(oldTransfer.fromWalletId));
    const oldToWallet = db.wallets.find(w => String(w.id) === String(oldTransfer.toWalletId));
    const newFromWallet = db.wallets.find(w => String(w.id) === String(newFromWalletId));
    const newToWallet = db.wallets.find(w => String(w.id) === String(newToWalletId));
    
    if (!newFromWallet || !newToWallet) {
      return { error: 'Wallet asal atau tujuan tidak ditemukan', statusCode: 404 };
    }
    
    if (oldFromWallet) {
      oldFromWallet.balance = Number((Number(oldFromWallet.balance || 0) + Number(oldTransfer.amount)).toFixed(2));
    }
    if (oldToWallet) {
      oldToWallet.balance = Number((Number(oldToWallet.balance || 0) - Number(oldTransfer.amount)).toFixed(2));
    }
    
    newFromWallet.balance = Number((Number(newFromWallet.balance || 0) - Number(newAmount)).toFixed(2));
    newToWallet.balance = Number((Number(newToWallet.balance || 0) + Number(newAmount)).toFixed(2));
    
    const updatedTransfer = {
      ...oldTransfer,
      fromWalletId: newFromWalletId,
      toWalletId: newToWalletId,
      amount: newAmount,
      description: req.body.description !== undefined ? String(req.body.description).trim() : oldTransfer.description,
      date: req.body.date !== undefined ? req.body.date : oldTransfer.date,
      user: req.body.user !== undefined ? req.body.user : oldTransfer.user,
      updatedAt: new Date().toISOString()
    };
    
    db.transfers[transferIndex] = updatedTransfer;
    return updatedTransfer;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
});

app.delete('/api/transfers/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const index = db.transfers.findIndex(t => String(t.id) === String(id));
    if (index === -1) return { error: 'Transfer tidak ditemukan', statusCode: 404 };
    
    const transfer = db.transfers[index];
    const fromWallet = db.wallets.find(w => String(w.id) === String(transfer.fromWalletId));
    const toWallet = db.wallets.find(w => String(w.id) === String(transfer.toWalletId));
    
    if (fromWallet) {
      fromWallet.balance = Number((Number(fromWallet.balance || 0) + Number(transfer.amount)).toFixed(2));
    }
    if (toWallet) {
      toWallet.balance = Number((Number(toWallet.balance || 0) - Number(transfer.amount)).toFixed(2));
    }
    
    db.transfers.splice(index, 1);
    return { success: true };
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
});

// -------------------------------------------------------------
// Ingredients CRUD
// -------------------------------------------------------------
app.get('/api/ingredients', (req, res) => {
  const db = readDb();
  res.json(db.ingredients || []);
});

app.post('/api/ingredients', (req, res) => {
  const result = updateDb((db) => {
    const { id, name, category, unit, stock, minStock, costPerUnit } = req.body;
    if (!name || !String(name).trim()) {
      return { error: 'Nama bahan baku wajib diisi', statusCode: 400 };
    }
    const ingredientName = String(name).trim();
    const isDuplicate = db.ingredients.some(ing => ing.name.toLowerCase() === ingredientName.toLowerCase());
    if (isDuplicate) {
      return { error: 'Bahan baku dengan nama tersebut sudah ada', statusCode: 409 };
    }
    
    const ingredientId = id || `ing-${Date.now()}`;
    const newIngredient = {
      id: ingredientId,
      name: ingredientName,
      category: category ? String(category).trim() : 'Bahan Baku',
      unit: unit ? String(unit).trim() : 'pcs',
      stock: Number(stock || 0),
      minStock: Number(minStock || 0),
      costPerUnit: Number(costPerUnit || 0),
      createdAt: new Date().toISOString()
    };
    db.ingredients.push(newIngredient);
    return newIngredient;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.status(201).json(result);
});

app.put('/api/ingredients/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const ingredient = db.ingredients.find(ing => String(ing.id) === String(id));
    if (!ingredient) return { error: 'Bahan baku tidak ditemukan', statusCode: 404 };
    
    const { name, category, unit, stock, minStock, costPerUnit } = req.body;
    if (name !== undefined) {
      const ingredientName = String(name).trim();
      if (!ingredientName) return { error: 'Nama bahan baku tidak boleh kosong', statusCode: 400 };
      const isDuplicate = db.ingredients.some(ing => String(ing.id) !== String(id) && ing.name.toLowerCase() === ingredientName.toLowerCase());
      if (isDuplicate) {
        return { error: 'Bahan baku dengan nama tersebut sudah ada', statusCode: 409 };
      }
      ingredient.name = ingredientName;
    }
    if (category !== undefined) ingredient.category = String(category).trim();
    if (unit !== undefined) ingredient.unit = String(unit).trim();
    if (stock !== undefined) ingredient.stock = Number(stock || 0);
    if (minStock !== undefined) ingredient.minStock = Number(minStock || 0);
    if (costPerUnit !== undefined) ingredient.costPerUnit = Number(costPerUnit || 0);
    
    return ingredient;
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
});

app.delete('/api/ingredients/:id', (req, res) => {
  const { id } = req.params;
  const result = updateDb((db) => {
    const index = db.ingredients.findIndex(ing => String(ing.id) === String(id));
    if (index === -1) return { error: 'Bahan baku tidak ditemukan', statusCode: 404 };
    db.ingredients.splice(index, 1);
    return { success: true };
  });
  if (result.error) return res.status(result.statusCode).json({ error: result.error });
  res.json(result);
});

// -------------------------------------------------------------
// Dev Reset Route
// -------------------------------------------------------------
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/reset', (req, res) => {
    const db = resetDb();
    res.json({
      wallets: db.wallets || [],
      categories: db.categories || { income: [], expense: [] },
      incomes: db.incomes || [],
      expenses: db.expenses || [],
      transfers: db.transfers || [],
      ingredients: db.ingredients || [],
    });
  });
}

// -------------------------------------------------------------
// Global Error Handler & Startup
// -------------------------------------------------------------
app.use((error, req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Terjadi error di server RUTE API' });
});

app.listen(port, () => {
  console.log(`RUTE API listening on http://localhost:${port}`);
});
