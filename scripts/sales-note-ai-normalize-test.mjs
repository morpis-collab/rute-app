import assert from 'node:assert/strict';
import { normalizeSalesNoteScan } from '../server/salesNoteAi.js';

const products = [
  { id: 1, name: 'Kopi Susu RUTE', sellingPrice: 10000 },
  { id: 3, name: 'Americano', sellingPrice: 8000 },
];

const parsed = normalizeSalesNoteScan({
  confidence: 0.91,
  items: [
    { rawText: 'Ruang / kopi susu', qty: '2', productId: '1' },
    { rawText: 'Ame', quantity: 1, productName: 'Americano' },
  ],
}, { products, source: 'ai' });

assert.equal(parsed.aiStatus, 'parsed');
assert.equal(parsed.requiresManualReview, false);
assert.deepEqual(parsed.items.map((item) => item.matchedProductId), [1, 3]);
assert.deepEqual(parsed.items.map((item) => item.qty), [2, 1]);

const needsReview = normalizeSalesNoteScan({
  confidence: 0.4,
  items: [],
}, { products, source: 'ai', providerError: 'low confidence' });

assert.equal(needsReview.aiStatus, 'manual_review_required');
assert.equal(needsReview.requiresManualReview, true);
assert.equal(needsReview.items.length, 0);
assert.equal(Boolean(needsReview.providerError), true);

const unmatched = normalizeSalesNoteScan({
  confidence: 0.95,
  items: [{ rawText: 'menu asing', qty: 3 }],
}, { products, source: 'ai' });

assert.equal(unmatched.aiStatus, 'manual_review_required');
assert.equal(unmatched.requiresManualReview, true);

console.log('sales-note-ai-normalize-test passed');
