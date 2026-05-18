const sampleItems = [
  {
    id: 1,
    name: 'Susu UHT 1L',
    category: 'bahan_baku',
    qty: 12,
    unit: 'pcs',
    price: 18000,
    total: 216000,
    addsStock: true,
    ingredientId: 2,
    stockQty: 12,
    stockUnit: 'pcs',
  },
  {
    id: 2,
    name: 'Gula Aren 1L',
    category: 'bahan_baku',
    qty: 2,
    unit: 'botol',
    price: 25000,
    total: 50000,
    addsStock: true,
    ingredientId: 3,
    stockQty: 2000,
    stockUnit: 'ml',
  },
  {
    id: 3,
    name: 'Cup 16oz',
    category: 'packaging',
    qty: 100,
    unit: 'pcs',
    price: 750,
    total: 75000,
    addsStock: true,
    ingredientId: 6,
    stockQty: 100,
    stockUnit: 'pcs',
  },
  {
    id: 4,
    name: 'Sedotan',
    category: 'packaging',
    qty: 100,
    unit: 'pcs',
    price: 150,
    total: 15000,
    addsStock: true,
    ingredientId: 8,
    stockQty: 100,
    stockUnit: 'pcs',
  },
];

const VALID_CATEGORIES = new Set(['bahan_baku', 'packaging', 'operasional', 'lainnya']);
const MAX_INGREDIENT_OPTIONS = 40;

function dataUrlFrom(file) {
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype || 'image/jpeg'};base64,${base64}`;
}

function parseJsonObject(text) {
  const clean = String(text || '').trim();
  if (!clean) return null;

  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

function ingredientOptions(ingredients = []) {
  return ingredients.slice(0, MAX_INGREDIENT_OPTIONS).map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
  }));
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeItem(item, index, ingredients = []) {
  const qty = normalizeNumber(item.qty ?? item.quantity, 1);
  const price = normalizeNumber(item.price ?? item.unitPrice, 0);
  const total = normalizeNumber(item.total, qty * price);
  const ingredientId = item.ingredientId == null || item.ingredientId === ''
    ? null
    : Number(item.ingredientId);
  const matchedIngredient = ingredients.find((ingredient) => Number(ingredient.id) === ingredientId);

  return {
    id: index + 1,
    name: String(item.name || item.description || `Item ${index + 1}`).trim(),
    category: VALID_CATEGORIES.has(item.category) ? item.category : 'lainnya',
    qty,
    unit: String(item.unit || 'pcs').trim(),
    price,
    total,
    addsStock: Boolean(item.addsStock ?? matchedIngredient),
    ingredientId: matchedIngredient ? matchedIngredient.id : null,
    stockQty: normalizeNumber(item.stockQty, qty),
    stockUnit: String(item.stockUnit || matchedIngredient?.unit || item.unit || 'pcs').trim(),
  };
}

function normalizeReceipt(payload, { file, upload, ingredients, source, providerError } = {}) {
  const items = Array.isArray(payload?.items) && payload.items.length
    ? payload.items.map((item, index) => normalizeItem(item, index, ingredients))
    : sampleItems.map((item) => ({ ...item }));
  const confidence = normalizeNumber(payload?.confidence, source === 'ai' ? 0.75 : 0.92);

  return {
    merchantName: String(payload?.merchantName || payload?.merchant || 'Supplier Malinau').trim(),
    transactionDate: payload?.transactionDate || new Date().toISOString(),
    confidence: Math.min(confidence, 1),
    originalFileName: upload?.originalFileName || file?.originalname || 'foto-resi.jpg',
    fileSize: upload?.fileSize || file?.size || null,
    imageUrl: upload?.imageUrl || null,
    upload,
    items,
    source,
    providerError: providerError ? 'OCR AI gagal, memakai fallback lokal.' : undefined,
  };
}

async function callOpenAiVision({ file, ingredients }) {
  const apiKey = process.env.RECEIPT_AI_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey || !file?.buffer?.length) return null;

  const model = process.env.RECEIPT_AI_MODEL || process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'gpt-4o-mini';
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const system = [
    'Kamu adalah OCR dan expense parser untuk RUTE Cash Tracer.',
    'Ekstrak foto resi belanja menjadi JSON valid saja, tanpa markdown.',
    'Gunakan rupiah sebagai angka integer. Jika item tidak jelas, tetap buat estimasi konservatif dan turunkan confidence.',
    'Kategori item harus salah satu: bahan_baku, packaging, operasional, lainnya.',
    'Jika cocok dengan bahan baku yang tersedia, isi ingredientId, stockQty, stockUnit, dan addsStock=true.',
    `Bahan baku tersedia: ${JSON.stringify(ingredientOptions(ingredients))}`,
    'Format JSON: {"merchantName":"string","transactionDate":"ISO string atau null","confidence":0.0,"items":[{"name":"string","category":"bahan_baku|packaging|operasional|lainnya","qty":1,"unit":"pcs","price":1000,"total":1000,"addsStock":true,"ingredientId":1,"stockQty":1,"stockUnit":"pcs"}]}',
  ].join('\n');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Baca resi ini dan ekstrak semua item pembelian.' },
            { type: 'image_url', image_url: { url: dataUrlFrom(file), detail: 'high' } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Receipt OCR provider error ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return parseJsonObject(data.choices?.[0]?.message?.content);
}

export async function scanReceipt({ file, upload, ingredients = [] }) {
  if (!file) {
    return {
      error: 'File resi wajib diunggah',
      statusCode: 400,
    };
  }

  let aiPayload = null;
  let providerError = null;
  try {
    aiPayload = await callOpenAiVision({ file, ingredients });
  } catch (error) {
    providerError = error.message;
  }

  return normalizeReceipt(aiPayload, {
    file,
    upload,
    ingredients,
    source: aiPayload ? 'ai' : 'local',
    providerError,
  });
}
