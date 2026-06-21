import assert from 'node:assert/strict';
import { buildStockAdjustmentPayload } from '../src/utils/stockAdjustment.js';

const ingredient = {
  id: 7,
  name: 'Kentang',
  unit: 'kg',
  stock: 12,
};

const setActualDown = buildStockAdjustmentPayload({
  mode: 'set_actual',
  ingredient,
  actualStock: '9.5',
  reason: 'Stock opname kedai',
  user: 'Owner RUTE',
});

assert.deepEqual(setActualDown, {
  ingredientId: 7,
  qty: 2.5,
  unit: 'kg',
  type: 'keluar',
  reason: 'Stock opname kedai - set stok aktual 9.5 kg dari sistem 12 kg',
  user: 'Owner RUTE',
});

const setActualUp = buildStockAdjustmentPayload({
  mode: 'set_actual',
  ingredient,
  actualStock: '14',
  reason: 'Ada stok tersimpan di kulkas',
  user: 'Owner RUTE',
});

assert.equal(setActualUp.type, 'masuk');
assert.equal(setActualUp.qty, 2);
assert.equal(setActualUp.reason, 'Ada stok tersimpan di kulkas - set stok aktual 14 kg dari sistem 12 kg');

assert.throws(
  () => buildStockAdjustmentPayload({
    mode: 'set_actual',
    ingredient,
    actualStock: '12',
    reason: 'Tidak berubah',
    user: 'Owner RUTE',
  }),
  /Stok aktual sama dengan stok sistem/,
);

const manualOut = buildStockAdjustmentPayload({
  mode: 'manual_delta',
  ingredient,
  qty: '3',
  unit: 'kg',
  type: 'keluar',
  reason: 'Rusak',
  user: 'Owner RUTE',
});

assert.deepEqual(manualOut, {
  ingredientId: 7,
  qty: 3,
  unit: 'kg',
  type: 'keluar',
  reason: 'Rusak',
  user: 'Owner RUTE',
});

console.log('Stock adjustment payload test passed.');
