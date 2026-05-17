import { create } from 'zustand';
import { products as initialProducts } from '../data/mock/products';
import { sales as initialSales } from '../data/mock/sales';
import { expenses as initialExpenses } from '../data/mock/expenses';
import { ingredients as initialIngredients, stockMovements as initialStockMovements } from '../data/mock/ingredients';
import { activityLog as initialActivityLog, cashSessions as initialCashSessions, dailyNotes as initialDailyNotes } from '../data/mock/activity';
import {
  applyStockMovements,
  buildExpenseStockMovements,
  buildSaleStockMovements,
  calculateApprovalStatus,
  getCashExpected,
  getEstimatedHpp,
  getExpenseTotal,
  getSalesSummary,
} from '../services/businessRules';
import {
  getBootstrap,
  patchExpenseStatus,
  postCashClose,
  postDailyNote,
  postReceiptExpense,
  postSale,
} from '../services/apiClient';
import { getBusinessDate, isSameBusinessDate } from '../utils/businessDate';

const clone = (value) => structuredClone(value);

const useAppStore = create((set, get) => ({
  products: clone(initialProducts),
  sales: clone(initialSales),
  expenses: clone(initialExpenses),
  ingredients: clone(initialIngredients),
  stockMovements: clone(initialStockMovements),
  activityLog: clone(initialActivityLog),
  cashSessions: clone(initialCashSessions),
  dailyNotes: clone(initialDailyNotes),
  receiptUploads: [],
  apiStatus: 'idle',

  loadRemoteData: async () => {
    set({ apiStatus: 'loading' });
    try {
      const data = await getBootstrap();
      set({
        products: data.products || clone(initialProducts),
        sales: data.sales || clone(initialSales),
        expenses: data.expenses || clone(initialExpenses),
        ingredients: data.ingredients || clone(initialIngredients),
        stockMovements: data.stockMovements || clone(initialStockMovements),
        activityLog: data.activityLog || clone(initialActivityLog),
        cashSessions: data.cashSessions || clone(initialCashSessions),
        dailyNotes: data.dailyNotes || clone(initialDailyNotes),
        receiptUploads: data.receiptUploads || [],
        apiStatus: 'connected',
      });
      return data;
    } catch (error) {
      console.warn('RUTE API tidak aktif, memakai data lokal.', error);
      set({ apiStatus: 'offline' });
      return null;
    }
  },

  getBusinessDate: () => getBusinessDate(),
  getTodaySales: (businessDate = getBusinessDate()) => (
    get().sales.filter((sale) => isSameBusinessDate(sale.date, businessDate))
  ),
  getTodayExpenses: (businessDate = getBusinessDate()) => (
    get().expenses.filter((expense) => isSameBusinessDate(expense.date, businessDate))
  ),
  getSalesSummary: (businessDate = getBusinessDate()) => getSalesSummary(get().getTodaySales(businessDate)),
  getExpenseTotal: (businessDate = getBusinessDate()) => getExpenseTotal(get().getTodayExpenses(businessDate)),
  getEstimatedHpp: (businessDate = getBusinessDate()) => (
    getEstimatedHpp(get().getTodaySales(businessDate), get().products)
  ),
  getCashExpected: (businessDate = getBusinessDate()) => {
    const session = get().cashSessions.find((cash) => cash.date === businessDate);
    return getCashExpected({
      sales: get().sales,
      expenses: get().expenses,
      openingCash: session?.openingCash || 0,
      businessDate,
    });
  },

  recordSale: ({ items, total, paymentMethod, user = 'Partner' }) => {
    const transaction = {
      id: `TRX-${Date.now()}`,
      date: new Date().toISOString(),
      items: items.map((item) => ({ ...item })),
      total,
      paymentMethod,
      user,
    };
    const movements = buildSaleStockMovements(transaction, get().products).map((movement, index) => ({
      ...movement,
      id: `SM-${Date.now()}-${index}`,
    }));

    set((state) => ({
      sales: [...state.sales, transaction],
      stockMovements: [...state.stockMovements, ...movements],
      ingredients: applyStockMovements(state.ingredients, movements),
      activityLog: [
        ...state.activityLog,
        {
          id: `ACT-${Date.now()}`,
          time: transaction.date,
          action: `Input penjualan: ${transaction.items.map((item) => `${item.name} ${item.qty}x`).join(', ')}`,
          user,
          type: 'penjualan',
        },
      ],
    }));

    postSale({ transaction, stockMovements: movements }).catch((error) => {
      console.warn('Gagal sinkron penjualan ke RUTE API.', error);
    });

    return transaction;
  },

  saveReceiptExpense: ({ receipt, imageUrl, user = 'Partner' }) => {
    const total = receipt.items.reduce((sum, item) => sum + item.total, 0);
    const expense = {
      id: `EXP-${Date.now()}`,
      date: receipt.transactionDate || new Date().toISOString(),
      category: receipt.items.some((item) => item.category === 'packaging') ? 'packaging' : 'bahan_baku',
      description: `Resi ${receipt.merchantName || 'pembelian'}`,
      items: receipt.items.map((item) => ({ ...item })),
      total,
      status: calculateApprovalStatus(total),
      photoUrl: imageUrl,
      sourceType: 'receipt_ai',
      user,
    };
    const stockMovements = buildExpenseStockMovements(expense).map((movement, index) => ({
      ...movement,
      id: `SM-${Date.now()}-${index}`,
    }));
    const upload = {
      id: `RCPT-${Date.now()}`,
      expenseId: expense.id,
      originalFileName: receipt.originalFileName,
      imageUrl,
      aiStatus: 'confirmed',
      aiRaw: receipt,
      createdAt: new Date().toISOString(),
      user,
    };

    set((state) => ({
      expenses: [expense, ...state.expenses],
      receiptUploads: [upload, ...state.receiptUploads],
      stockMovements: [...state.stockMovements, ...stockMovements],
      ingredients: applyStockMovements(state.ingredients, stockMovements),
      activityLog: [
        ...state.activityLog,
        {
          id: `ACT-${Date.now()}`,
          time: expense.date,
          action: `Upload resi ${expense.description} ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(expense.total)}`,
          user,
          type: 'pengeluaran',
        },
      ],
    }));

    postReceiptExpense({ expense, upload, stockMovements, receipt, imageUrl, user }).catch((error) => {
      console.warn('Gagal sinkron resi ke RUTE API.', error);
    });

    return expense;
  },

  updateExpenseStatus: (expenseId, status) => {
    set((state) => ({
      expenses: state.expenses.map((expense) => (
        expense.id === expenseId ? { ...expense, status } : expense
      )),
      activityLog: [
        ...state.activityLog,
        {
          id: `ACT-${Date.now()}`,
          time: new Date().toISOString(),
          action: `Pengeluaran ${expenseId} ${status === 'approved' ? 'disetujui' : 'ditolak'}`,
          user: 'Owner',
          type: 'approval',
        },
      ],
    }));

    patchExpenseStatus(expenseId, status).catch((error) => {
      console.warn('Gagal sinkron status pengeluaran ke RUTE API.', error);
    });
  },

  addExpense: async (expenseData) => {
    try {
      const { postExpense } = await import('../services/apiClient');
      const response = await postExpense(expenseData);
      if (response && response.expense) {
        set((state) => ({
          expenses: [response.expense, ...state.expenses],
          stockMovements: [...state.stockMovements, ...(response.movements || [])],
          ingredients: applyStockMovements(state.ingredients, response.movements || []),
          activityLog: [
            ...state.activityLog,
            {
              id: `ACT-${Date.now()}`,
              time: response.expense.date,
              action: `Input pengeluaran: ${response.expense.description}`,
              user: response.expense.user,
              type: 'pengeluaran',
            },
          ]
        }));
      }
    } catch (err) {
      console.error('Failed to add expense', err);
    }
  },

  adjustStock: async (adjustmentData) => {
    try {
      const { postStockAdjustment } = await import('../services/apiClient');
      const response = await postStockAdjustment(adjustmentData);
      if (response && response.movements) {
        set((state) => ({
          stockMovements: [...state.stockMovements, ...(response.movements || [])],
          ingredients: applyStockMovements(state.ingredients, response.movements || []),
          activityLog: [
            ...state.activityLog,
            {
              id: `ACT-${Date.now()}`,
              time: new Date().toISOString(),
              action: `Koreksi stok: ${adjustmentData.reason}`,
              user: adjustmentData.user || 'Owner',
              type: 'stok',
            },
          ]
        }));
      }
    } catch (err) {
      console.error('Failed to adjust stock', err);
    }
  },

  addProduct: async (productData) => {
    try {
      const { postProduct } = await import('../services/apiClient');
      const response = await postProduct(productData);
      if (response && response.product) {
        set((state) => ({
          products: [...state.products, response.product],
          activityLog: [
            ...state.activityLog,
            {
              id: `ACT-${Date.now()}`,
              time: new Date().toISOString(),
              action: `Menu baru ditambahkan: ${response.product.name}`,
              user: 'Owner',
              type: 'menu',
            },
          ]
        }));
      }
    } catch (err) {
      console.error('Failed to add product', err);
    }
  },

  closeCash: ({ actualCash, qris, transfer, notes, user = 'Partner' }) => {
    const businessDate = getBusinessDate();
    const expectedCash = get().getCashExpected(businessDate);
    const difference = Number(actualCash || 0) - expectedCash;
    const closedSession = {
      date: businessDate,
      openingCash: 100000,
      closingCash: Number(actualCash || 0),
      expectedCash,
      difference,
      qris: Number(qris || 0),
      transfer: Number(transfer || 0),
      totalExpenseCash: get().getExpenseTotal(),
      status: 'closed',
      notes,
    };

    set((state) => ({
      cashSessions: [
        closedSession,
        ...state.cashSessions.filter((session) => session.date !== businessDate),
      ],
      activityLog: [
        ...state.activityLog,
        {
          id: `ACT-${Date.now()}`,
          time: new Date().toISOString(),
          action: `Tutup kas harian dengan selisih Rp ${difference.toLocaleString('id-ID')}`,
          user,
          type: 'kas',
        },
      ],
    }));

    postCashClose({
      date: businessDate,
      actualCash,
      qris,
      transfer,
      notes,
      user,
    }).catch((error) => {
      console.warn('Gagal sinkron tutup kas ke RUTE API.', error);
    });

    return closedSession;
  },

  addDailyNote: (note, user = 'Partner') => {
    if (!note.trim()) return null;
    const businessDate = getBusinessDate();

    const entry = {
      date: businessDate,
      note: note.trim(),
      createdBy: user,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      dailyNotes: [entry, ...state.dailyNotes.filter((item) => item.date !== businessDate)],
      activityLog: [
        ...state.activityLog,
        {
          id: `ACT-${Date.now()}`,
          time: entry.createdAt,
          action: 'Partner memperbarui catatan harian',
          user,
          type: 'catatan',
        },
      ],
    }));

    postDailyNote({ date: businessDate, note: entry.note, user }).catch((error) => {
      console.warn('Gagal sinkron catatan harian ke RUTE API.', error);
    });

    return entry;
  },
}));

export default useAppStore;
