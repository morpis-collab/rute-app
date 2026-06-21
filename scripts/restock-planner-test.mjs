import assert from 'node:assert/strict';
import { buildRestockRecommendations } from '../src/services/businessRules.js';

const ingredients = [
  {
    id: 1,
    name: 'Kopi House Blend',
    unit: 'gram',
    stock: 100,
    minStock: 100,
    costPerUnit: 20,
  },
  {
    id: 2,
    name: 'Cup 16oz',
    unit: 'pcs',
    stock: 1000,
    minStock: 100,
    costPerUnit: 850,
  },
];

const products = [
  {
    id: 10,
    name: 'Kopi Susu',
    recipe: [
      { ingredientId: 1, qty: 0.01, unit: 'kg' },
    ],
  },
  {
    id: 11,
    name: 'Menu Tanpa Resep',
    recipe: [],
  },
];

const sales = [
  {
    id: 'S-1',
    date: '2026-06-15T03:00:00.000Z',
    items: [
      { productId: 10, name: 'Kopi Susu', qty: 10 },
      { productId: 11, name: 'Menu Tanpa Resep', qty: 3 },
    ],
  },
  {
    id: 'S-2',
    date: '2026-06-10T03:00:00.000Z',
    items: [
      { productId: 10, name: 'Kopi Susu', qty: 10 },
    ],
  },
  {
    id: 'S-3',
    date: '2026-06-01T03:00:00.000Z',
    items: [
      { productId: 10, name: 'Kopi Susu', qty: 99 },
    ],
  },
];

const result = buildRestockRecommendations({
  sales,
  products,
  ingredients,
  days: 7,
  asOfDate: '2026-06-15',
});

const coffee = result.recommendations.find((item) => item.ingredientId === 1);
const cup = result.recommendations.find((item) => item.ingredientId === 2);

assert.equal(result.periodDates.at(0), '2026-06-09');
assert.equal(result.periodDates.at(-1), '2026-06-15');
assert.equal(coffee.projectedUsage7d, 200);
assert.equal(coffee.recommendedQty, 200);
assert.equal(coffee.priority, 'kritis');
assert.equal(coffee.estimatedCost, 4000);
assert.equal(cup.recommendedQty, 0);
assert.equal(cup.priority, 'aman');
assert.equal(result.recipeWarnings.length, 1);
assert.equal(result.recipeWarnings[0].productName, 'Menu Tanpa Resep');

console.log('Restock Planner forecast test passed.');
