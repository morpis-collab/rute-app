import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from '../src/data/mock/products.js';
import { sales } from '../src/data/mock/sales.js';
import { expenses } from '../src/data/mock/expenses.js';
import { ingredients, stockMovements } from '../src/data/mock/ingredients.js';
import { activityLog, cashSessions, dailyNotes } from '../src/data/mock/activity.js';
import { convertQuantityToIngredientUnit, getIngredientStatus } from './rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '.data');
const dataFile = path.join(dataDir, 'rute-db.json');

const clone = (value) => structuredClone(value);

function seedData() {
  return {
    meta: {
      app: 'RUTE CoffeeOps',
      version: 1,
      seededAt: new Date().toISOString(),
    },
    users: {
      owner: { id: 1, name: 'Owner RUTE', email: 'owner@rute.coffee', role: 'owner' },
      partner: { id: 2, name: 'Partner Malinau', email: 'partner@rute.coffee', role: 'partner' },
    },
    products: clone(products),
    sales: clone(sales),
    expenses: clone(expenses),
    ingredients: clone(ingredients),
    stockMovements: clone(stockMovements),
    activityLog: clone(activityLog),
    cashSessions: clone(cashSessions),
    dailyNotes: clone(dailyNotes),
    receiptUploads: [],
  };
}

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(seedData(), null, 2));
  }
}

function normalizeDb(db) {
  const seed = seedData();
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
    products: Array.isArray(db.products) ? db.products : seed.products,
    sales: Array.isArray(db.sales) ? db.sales : seed.sales,
    expenses: Array.isArray(db.expenses) ? db.expenses : seed.expenses,
    ingredients: normalizedIngredients,
    stockMovements: Array.isArray(db.stockMovements) ? db.stockMovements : seed.stockMovements,
    activityLog: Array.isArray(db.activityLog) ? db.activityLog : seed.activityLog,
    cashSessions: Array.isArray(db.cashSessions) ? db.cashSessions : seed.cashSessions,
    dailyNotes: Array.isArray(db.dailyNotes) ? db.dailyNotes : seed.dailyNotes,
    receiptUploads: Array.isArray(db.receiptUploads) ? db.receiptUploads : [],
  };
}

export function readDb() {
  ensureDataFile();
  const db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const normalized = normalizeDb(db);
  if (JSON.stringify(normalized.ingredients) !== JSON.stringify(db.ingredients)) {
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
