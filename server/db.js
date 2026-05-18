import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from '../src/data/mock/products.js';
import { sales } from '../src/data/mock/sales.js';
import { expenses } from '../src/data/mock/expenses.js';
import { ingredients, stockMovements } from '../src/data/mock/ingredients.js';
import { activityLog, cashSessions, dailyNotes } from '../src/data/mock/activity.js';
import { cashAccounts, cashTransactions } from '../src/data/mock/cashAccounts.js';
import { convertQuantityToIngredientUnit, getIngredientStatus } from './rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = process.env.RUTE_DATA_FILE
  ? path.resolve(process.env.RUTE_DATA_FILE)
  : path.join(__dirname, '.data', 'rute-db.json');
const dataDir = path.dirname(dataFile);

const clone = (value) => structuredClone(value);

function seedData() {
  return {
    meta: {
      app: 'RUTE CoffeeOps',
      version: 1,
      seededAt: new Date().toISOString(),
    },
    users: {
      owner: {
        id: 1,
        name: 'Owner RUTE',
        email: 'owner@rute.coffee',
        role: 'owner',
        authMethod: 'pin',
        active: true,
      },
      partner: {
        id: 2,
        name: 'Partner Malinau',
        email: 'partner@rute.coffee',
        role: 'partner',
        authMethod: 'pin',
        active: true,
      },
    },
    products: clone(products),
    sales: clone(sales),
    expenses: clone(expenses),
    ingredients: clone(ingredients),
    stockMovements: clone(stockMovements),
    activityLog: clone(activityLog),
    cashSessions: clone(cashSessions),
    cashAccounts: clone(cashAccounts),
    cashTransactions: clone(cashTransactions),
    dailyNotes: clone(dailyNotes),
    receiptUploads: [],
  };
}

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile) || fs.statSync(dataFile).size === 0) {
    fs.writeFileSync(dataFile, JSON.stringify(seedData(), null, 2));
  }
}

function normalizeDb(db) {
  const seed = seedData();
  const existingUsers = db.users && typeof db.users === 'object' ? db.users : {};
  const userByRole = Array.isArray(existingUsers)
    ? Object.fromEntries(existingUsers.map((user) => [user.role, user]))
    : existingUsers;
  const normalizedUsers = Object.fromEntries(
    Object.entries(seed.users).map(([role, seedUser]) => [
      role,
      {
        ...seedUser,
        ...userByRole[role],
        role,
        authMethod: 'pin',
        active: userByRole[role]?.active ?? true,
      },
    ]),
  );
  const existingIngredients = Array.isArray(db.ingredients) ? db.ingredients : [];
  const existingById = new Map(existingIngredients.map((ingredient) => [String(ingredient.id), ingredient]));

  const normalizedIngredients = seed.ingredients.map((seedIngredient) => {
    const existing = existingById.get(String(seedIngredient.id));
    if (!existing) return seedIngredient;

    const stock = existing.unit && existing.unit !== seedIngredient.unit
      ? convertQuantityToIngredientUnit(existing.stock, existing.unit, seedIngredient)
      : Number(existing.stock ?? seedIngredient.stock);
    const minStock = existing.unit && existing.unit !== seedIngredient.unit
      ? convertQuantityToIngredientUnit(existing.minStock, existing.unit, seedIngredient)
      : Number(existing.minStock ?? seedIngredient.minStock);

    return {
      ...seedIngredient,
      ...existing,
      unit: seedIngredient.unit,
      unitConversions: seedIngredient.unitConversions,
      costPerUnit: seedIngredient.costPerUnit,
      stock: Number(stock.toFixed(3)),
      minStock: Number(minStock.toFixed(3)),
      status: getIngredientStatus(stock, minStock),
    };
  });

  return {
    ...seed,
    ...db,
    users: normalizedUsers,
    products: Array.isArray(db.products) ? db.products : seed.products,
    sales: Array.isArray(db.sales) ? db.sales : seed.sales,
    expenses: Array.isArray(db.expenses) ? db.expenses : seed.expenses,
    ingredients: normalizedIngredients,
    stockMovements: Array.isArray(db.stockMovements) ? db.stockMovements : seed.stockMovements,
    activityLog: Array.isArray(db.activityLog) ? db.activityLog : seed.activityLog,
    cashSessions: Array.isArray(db.cashSessions) ? db.cashSessions : seed.cashSessions,
    cashAccounts: Array.isArray(db.cashAccounts) ? db.cashAccounts : seed.cashAccounts,
    cashTransactions: Array.isArray(db.cashTransactions) ? db.cashTransactions : seed.cashTransactions,
    dailyNotes: Array.isArray(db.dailyNotes) ? db.dailyNotes : seed.dailyNotes,
    receiptUploads: Array.isArray(db.receiptUploads) ? db.receiptUploads : [],
  };
}

export function readDb() {
  ensureDataFile();
  const db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const normalized = normalizeDb(db);
  if (
    JSON.stringify(normalized.ingredients) !== JSON.stringify(db.ingredients) ||
    JSON.stringify(normalized.users) !== JSON.stringify(db.users)
  ) {
    fs.writeFileSync(dataFile, JSON.stringify(normalized, null, 2));
  }
  return normalized;
}

export function writeDb(nextDb) {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(nextDb, null, 2));
  return nextDb;
}

export function updateDb(mutator) {
  const db = readDb();
  const result = mutator(db);
  writeDb(db);
  return result ?? db;
}

export function resetDb() {
  const db = seedData();
  writeDb(db);
  return db;
}
