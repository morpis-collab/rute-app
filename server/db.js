import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = process.env.RUTE_DATA_FILE
  ? path.resolve(process.env.RUTE_DATA_FILE)
  : path.join(__dirname, '.data', 'rute-db.json');
const dataDir = path.dirname(dataFile);

function seedData() {
  const seededAt = new Date().toISOString();
  return {
    meta: {
      app: 'RUTE Cash Tracer',
      version: 2,
      seededAt,
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
    },
    wallets: [
      { id: 'acc-bahan-baku', name: 'Bahan Baku', balance: 0, isDefault: true, createdAt: seededAt },
      { id: 'acc-operasional', name: 'Operasional', balance: 0, isDefault: false, createdAt: seededAt },
      { id: 'acc-qris', name: 'QRIS', balance: 0, isDefault: false, createdAt: seededAt },
      { id: 'acc-keuntungan', name: 'Keuntungan', balance: 0, isDefault: false, createdAt: seededAt }
    ],
    categories: {
      income: ["Penjualan Harian", "Pendapatan Bunga", "Lain-lain"],
      expense: ["Pembelian Bahan Baku", "Sewa Tempat", "Operasional", "Gaji Staff", "Listrik & Air", "Lain-lain"]
    },
    incomes: [],
    expenses: [],
    transfers: [],
    ingredients: []
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

  return {
    meta: {
      ...seed.meta,
      ...(db.meta || {}),
    },
    users: normalizedUsers,
    wallets: Array.isArray(db.wallets) ? db.wallets : seed.wallets,
    categories: db.categories && typeof db.categories === 'object' ? db.categories : seed.categories,
    incomes: Array.isArray(db.incomes) ? db.incomes : seed.incomes,
    expenses: Array.isArray(db.expenses) ? db.expenses : seed.expenses,
    transfers: Array.isArray(db.transfers) ? db.transfers : seed.transfers,
    ingredients: Array.isArray(db.ingredients) ? db.ingredients : seed.ingredients,
  };
}

export function readDb() {
  ensureDataFile();
  const db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const normalized = normalizeDb(db);
  if (
    JSON.stringify(normalized.ingredients) !== JSON.stringify(db.ingredients) ||
    JSON.stringify(normalized.users) !== JSON.stringify(db.users) ||
    JSON.stringify(normalized.wallets) !== JSON.stringify(db.wallets) ||
    JSON.stringify(normalized.categories) !== JSON.stringify(db.categories)
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
