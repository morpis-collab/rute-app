import {
  getEstimatedHpp,
  getExpenseTotal,
  getSalesSummary,
  refreshProductCosts,
} from './rules.js';

const MAX_PROMPT_LENGTH = 1200;
const MAX_HISTORY_ITEMS = 8;

function businessToday() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: process.env.RUTE_BUSINESS_TZ || 'Asia/Makassar',
  });
}

function rupiah(value) {
  return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

function getBusinessDate(date) {
  const value = String(date || businessToday()).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : businessToday();
}

function topMenus(summary) {
  return summary.menuTerlaris.slice(0, 3).map((menu) => `${menu.name} (${menu.qty} cup)`);
}

export function buildCopilotContext(db, { date, user } = {}) {
  const businessDate = getBusinessDate(date);
  const daySales = db.sales.filter((sale) => sale.date?.startsWith(businessDate));
  const dayExpenses = db.expenses.filter((expense) => expense.date?.startsWith(businessDate));
  const products = refreshProductCosts(db.products, db.ingredients);
  const summary = getSalesSummary(daySales);
  const estimatedHpp = getEstimatedHpp(daySales, products);
  const expenseTotal = getExpenseTotal(dayExpenses);
  const grossProfit = summary.totalOmzet - estimatedHpp;
  const netProfitEstimate = grossProfit - expenseTotal;
  const pendingExpenses = db.expenses.filter((expense) => expense.status === 'pending');
  const criticalStock = db.ingredients.filter((ingredient) => ingredient.status === 'kritis');
  const cashSession = db.cashSessions.find((session) => session.date === businessDate) || null;
  const latestNote = db.dailyNotes.find((note) => note.date === businessDate) || db.dailyNotes[0] || null;

  return {
    businessDate,
    user: user ? { name: user.name, role: user.role } : null,
    summary: {
      totalOmzet: summary.totalOmzet,
      totalTransactions: summary.totalTransaksi,
      totalCup: summary.totalCup,
      salesByMethod: summary.byMethod,
      topMenus: topMenus(summary),
      estimatedHpp,
      grossProfit,
      expenseTotal,
      netProfitEstimate,
    },
    cash: cashSession ? {
      status: cashSession.status,
      expectedCash: cashSession.expectedCash,
      closingCash: cashSession.closingCash,
      difference: cashSession.difference,
      differenceStatus: cashSession.differenceStatus,
    } : {
      status: 'open',
      expectedCash: null,
      closingCash: null,
      difference: null,
      differenceStatus: null,
    },
    criticalStock: criticalStock.slice(0, 6).map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      stock: ingredient.stock,
      unit: ingredient.unit,
      minStock: ingredient.minStock,
    })),
    pendingExpenses: pendingExpenses.slice(0, 5).map((expense) => ({
      id: expense.id,
      description: expense.description,
      total: expense.total,
      date: expense.date,
      user: expense.user,
    })),
    latestNote,
    recentActivity: db.activityLog.slice(-6).reverse().map((activity) => ({
      time: activity.time,
      action: activity.action,
      user: activity.user,
      type: activity.type,
    })),
  };
}

export function buildCopilotInsights(context) {
  const insights = [];

  if (context.criticalStock.length) {
    const item = context.criticalStock[0];
    insights.push({
      id: `stock-${item.id}`,
      type: 'alert',
      title: 'Stok kritis',
      text: `${item.name} tersisa ${item.stock} ${item.unit}, sudah di bawah batas minimum ${item.minStock} ${item.unit}.`,
      action: 'Cek stok',
      priority: 'high',
    });
  }

  if (context.pendingExpenses.length) {
    const total = context.pendingExpenses.reduce((sum, expense) => sum + Number(expense.total || 0), 0);
    insights.push({
      id: 'pending-expenses',
      type: 'warning',
      title: 'Pengeluaran menunggu approval',
      text: `${context.pendingExpenses.length} pengeluaran senilai ${rupiah(total)} masih perlu direview owner.`,
      action: 'Review pengeluaran',
      priority: 'medium',
    });
  }

  if (context.cash.status !== 'closed') {
    insights.push({
      id: 'cash-open',
      type: 'info',
      title: 'Kas belum ditutup',
      text: `Kas tanggal ${context.businessDate} masih terbuka. Tutup kas setelah transaksi selesai agar laporan harian terkunci.`,
      action: 'Tutup kas',
      priority: 'medium',
    });
  } else if (Number(context.cash.difference || 0) !== 0) {
    insights.push({
      id: 'cash-difference',
      type: context.cash.difference > 0 ? 'info' : 'warning',
      title: 'Selisih tutup kas',
      text: `Tutup kas punya selisih ${rupiah(context.cash.difference)}. Cek ulang catatan transaksi cash dan pengeluaran.`,
      action: 'Lihat kas',
      priority: 'high',
    });
  }

  if (context.summary.totalTransactions > 0) {
    insights.push({
      id: 'sales-summary',
      type: 'info',
      title: 'Ringkasan penjualan hari ini',
      text: `Omzet ${rupiah(context.summary.totalOmzet)} dari ${context.summary.totalTransactions} transaksi. Estimasi laba bersih ${rupiah(context.summary.netProfitEstimate)}.`,
      action: 'Lihat dashboard',
      priority: 'low',
    });
  }

  return insights.slice(0, 5);
}

function localAnswer(prompt, context) {
  const question = prompt.toLowerCase();
  const summary = context.summary;

  if (question.includes('profit') || question.includes('laba')) {
    return `Estimasi laba bersih tanggal ${context.businessDate} adalah ${rupiah(summary.netProfitEstimate)}. Rinciannya: omzet ${rupiah(summary.totalOmzet)}, estimasi HPP ${rupiah(summary.estimatedHpp)}, dan pengeluaran ${rupiah(summary.expenseTotal)}.`;
  }

  if (question.includes('omzet') || question.includes('penjualan')) {
    const menus = summary.topMenus.length ? ` Menu terlaris: ${summary.topMenus.join(', ')}.` : '';
    return `Omzet tanggal ${context.businessDate} adalah ${rupiah(summary.totalOmzet)} dari ${summary.totalTransactions} transaksi dan ${summary.totalCup} cup.${menus}`;
  }

  if (question.includes('stok') || question.includes('bahan')) {
    if (!context.criticalStock.length) return 'Belum ada stok kritis dari data saat ini.';
    return `Stok kritis utama: ${context.criticalStock.map((item) => `${item.name} ${item.stock} ${item.unit}`).join(', ')}. Prioritaskan restock bahan yang paling dekat menghambat menu terlaris.`;
  }

  if (question.includes('kas')) {
    if (context.cash.status === 'closed') {
      return `Kas tanggal ${context.businessDate} sudah closed. Expected cash ${rupiah(context.cash.expectedCash)}, closing cash ${rupiah(context.cash.closingCash)}, selisih ${rupiah(context.cash.difference)}.`;
    }
    return `Kas tanggal ${context.businessDate} masih open. Setelah transaksi selesai, gunakan endpoint expected cash lalu close cash agar laporan terkunci.`;
  }

  const insights = buildCopilotInsights(context);
  if (insights.length) return insights.map((insight) => insight.text).join(' ');
  return `Data tanggal ${context.businessDate}: omzet ${rupiah(summary.totalOmzet)}, transaksi ${summary.totalTransactions}, estimasi laba bersih ${rupiah(summary.netProfitEstimate)}.`;
}

function sanitizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY_ITEMS).map((item) => ({
    role: item.role === 'assistant' || item.role === 'ai' ? 'assistant' : 'user',
    content: String(item.text || item.content || '').slice(0, MAX_PROMPT_LENGTH),
  })).filter((item) => item.content.trim());
}

async function callGeminiCopilot({ prompt, history, context }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  const systemInstruction = [
    'Kamu adalah RUTE Business Copilot untuk operasional coffee shop.',
    'Jawab dalam Bahasa Indonesia, ringkas, langsung actionable, dan hanya gunakan data finansial yang diberikan.',
    'Jika data tidak cukup, katakan data belum cukup dan sarankan data apa yang perlu dicek.',
    `Data finansial JSON: ${JSON.stringify(context)}`,
  ].join('\n');

  const geminiContents = sanitizeHistory(history).map((item) => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: item.content }],
  }));

  geminiContents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  const response = await fetch(`${baseUrl}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: geminiContents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini Copilot error ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

async function callOpenAi({ prompt, history, context }) {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const system = [
    'Kamu adalah RUTE Business Copilot untuk operasional coffee shop.',
    'Jawab dalam Bahasa Indonesia, ringkas, langsung actionable, dan hanya gunakan data finansial yang diberikan.',
    'Jika data tidak cukup, katakan data belum cukup dan sarankan data apa yang perlu dicek.',
    `Data finansial JSON: ${JSON.stringify(context)}`,
  ].join('\n');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        ...sanitizeHistory(history),
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI provider error ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

export async function answerCopilot({ db, prompt, history, date, user }) {
  const cleanPrompt = String(prompt || '').trim().slice(0, MAX_PROMPT_LENGTH);
  if (!cleanPrompt) {
    return { error: 'Prompt tidak boleh kosong', statusCode: 400 };
  }

  const context = buildCopilotContext(db, { date, user });
  const insights = buildCopilotInsights(context);
  const createdAt = new Date().toISOString();

  let aiText = null;
  let providerError = null;
  try {
    if (process.env.GEMINI_API_KEY) {
      aiText = await callGeminiCopilot({ prompt: cleanPrompt, history, context });
    } else {
      aiText = await callOpenAi({ prompt: cleanPrompt, history, context });
    }
  } catch (error) {
    providerError = error.message;
  }
  const text = aiText || localAnswer(cleanPrompt, context);

  return {
    message: {
      id: `COP-${Date.now()}`,
      role: 'assistant',
      text,
      createdAt,
    },
    insights,
    context: {
      businessDate: context.businessDate,
      role: user?.role || null,
      summary: context.summary,
      cash: context.cash,
    },
    source: aiText ? 'ai' : 'local',
    providerError: providerError ? 'AI provider gagal, memakai fallback lokal.' : undefined,
  };
}
