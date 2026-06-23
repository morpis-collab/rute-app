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

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function matchProduct(value, products = []) {
  const query = String(value || '').toLowerCase().trim();
  if (!query) return null;

  const byId = products.find((product) => String(product.id) === query);
  if (byId) return byId;

  const scored = products.map((product) => {
    const name = String(product.name || '').toLowerCase();
    const queryWords = query.split(/\W+/).filter(Boolean);
    const nameWords = name.split(/\W+/).filter(Boolean);
    const commonWords = queryWords.filter((word) => nameWords.includes(word));
    let score = commonWords.length * 20;

    if (name === query) score += 100;
    else if (name.includes(query)) score += 80;
    else if (query.includes(name)) score += 60;

    return { product, score };
  }).sort((a, b) => b.score - a.score);

  return scored[0]?.score > 30 ? scored[0].product : null;
}

function normalizeItem(item, index, products = []) {
  const product = matchProduct(
    item.productId ?? item.matchedProductId ?? item.productName ?? item.name ?? item.rawText,
    products,
  );
  const qty = normalizeNumber(item.qty ?? item.quantity, 1);

  return {
    id: index + 1,
    rawText: String(item.rawText || item.name || item.productName || `Baris ${index + 1}`).trim(),
    qty: qty > 0 ? qty : 1,
    matchedProductId: product?.id || '',
    price: Number(product?.sellingPrice ?? product?.price ?? item.price ?? 0),
  };
}

export function normalizeSalesNoteScan(payload, { file, upload, products = [], source, providerError } = {}) {
  const items = Array.isArray(payload?.items)
    ? payload.items.map((item, index) => normalizeItem(item, index, products))
    : [];
  const confidence = Math.min(normalizeNumber(payload?.confidence, source === 'ai' ? 0.75 : 0), 1);
  const hasMatchedItem = items.some((item) => item.matchedProductId);
  const requiresManualReview = source !== 'ai' || !items.length || !hasMatchedItem || confidence < 0.6;

  return {
    confidence,
    originalFileName: upload?.originalFileName || file?.originalname || 'foto-catatan.jpg',
    fileSize: upload?.fileSize || file?.size || null,
    imageUrl: upload?.imageUrl || null,
    upload,
    items,
    source,
    aiStatus: requiresManualReview ? 'manual_review_required' : 'parsed',
    requiresManualReview,
    providerError: providerError ? 'OCR AI gagal. Isi rekap secara manual atau coba foto yang lebih jelas.' : undefined,
  };
}

async function callOpenAiVision({ file, products }) {
  const apiKey = process.env.SALES_NOTE_AI_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey || !file?.buffer?.length) {
    return {
      payload: null,
      providerError: !apiKey ? 'SALES_NOTE_AI_API_KEY belum diset.' : 'File catatan kosong.',
    };
  }

  const model = process.env.SALES_NOTE_AI_MODEL || process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'gpt-4o-mini';
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.sellingPrice ?? product.price ?? 0,
  }));
  const system = [
    'Kamu adalah OCR catatan closing penjualan RUTE Cash Tracer.',
    'Baca foto buku catatan harian dan ekstrak menu yang terjual menjadi JSON valid saja, tanpa markdown.',
    'Cocokkan setiap baris ke productId dari daftar menu. Jika tidak yakin, isi productName/rawText dan turunkan confidence.',
    `Menu tersedia: ${JSON.stringify(productOptions)}`,
    'Format JSON: {"confidence":0.0,"items":[{"rawText":"string","productId":1,"productName":"string","qty":1}]}',
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
            { type: 'text', text: 'Scan foto catatan closing ini dan ambil nama menu beserta jumlah terjual.' },
            { type: 'image_url', image_url: { url: dataUrlFrom(file), detail: 'high' } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sales note OCR provider error ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return {
    payload: parseJsonObject(data.choices?.[0]?.message?.content),
    providerError: null,
  };
}

async function callGeminiVision({ file, products }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !file?.buffer?.length) {
    return {
      payload: null,
      providerError: !apiKey ? 'GEMINI_API_KEY belum diset.' : 'File catatan kosong.',
    };
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.sellingPrice ?? product.price ?? 0,
  }));
  const prompt = [
    'Kamu adalah OCR catatan closing penjualan RUTE Cash Tracer.',
    'Baca foto buku catatan harian dan ekstrak menu yang terjual menjadi JSON valid saja, tanpa markdown.',
    'Cocokkan setiap baris ke productId dari daftar menu. Jika tidak yakin, isi productName/rawText dan turunkan confidence.',
    `Menu tersedia: ${JSON.stringify(productOptions)}`,
    'Format JSON: {"confidence":0.0,"items":[{"rawText":"string","productId":1,"productName":"string","qty":1}]}',
  ].join('\n');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: file.mimetype || 'image/jpeg', data: file.buffer.toString('base64') } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini sales note OCR provider error ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return {
    payload: parseJsonObject(data.candidates?.[0]?.content?.parts?.[0]?.text),
    providerError: null,
  };
}

export async function scanSalesNote({ file, upload, products = [] }) {
  if (!file) {
    return {
      error: 'File catatan wajib diunggah',
      statusCode: 400,
    };
  }

  let aiPayload = null;
  let providerError;

  // Try Gemini first, fall back to OpenAI if it fails
  if (process.env.GEMINI_API_KEY) {
    try {
      const aiResult = await callGeminiVision({ file, products });
      aiPayload = aiResult?.payload || null;
      providerError = aiResult?.providerError || null;
    } catch (error) {
      console.error('[salesNoteAi] Gemini failed, falling back to OpenAI:', error.message);
      providerError = error.message;
    }
  }

  // Fallback to OpenAI if Gemini didn't produce results
  if (!aiPayload) {
    try {
      const aiResult = await callOpenAiVision({ file, products });
      if (aiResult?.payload) {
        aiPayload = aiResult.payload;
        providerError = aiResult.providerError || null;
      } else {
        providerError = providerError || aiResult?.providerError || 'Tidak ada AI provider yang berhasil memproses.';
      }
    } catch (error) {
      console.error('[salesNoteAi] OpenAI fallback also failed:', error.message);
      providerError = providerError || error.message;
    }
  }

  return normalizeSalesNoteScan(aiPayload, {
    file,
    upload,
    products,
    source: aiPayload ? 'ai' : 'local',
    providerError,
  });
}
