import { create } from 'zustand';
import { activityLog as initialActivityLog, cashSessions as initialCashSessions, dailyNotes as initialDailyNotes } from '../data/mock/activity';
import { stockMovements as initialStockMovements } from '../data/mock/ingredients';
import {
  applyStockMovements,
  buildExpenseStockMovements,
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
  getSales,
  getProducts,
  getExpenses,
  getStock,
  postSale,
  postExpense,
  postStockAdjustment,
  postProduct
} from '../services/apiClient';
import { getBusinessDate, isSameBusinessDate } from '../utils/businessDate';

const clone = (value) => structuredClone(value);

const useAppStore = create((set, get) => ({
  products: [],
  sales: [],
  expenses: [],
  ingredients: [],
  stockMovements: clone(initialStockMovements),
  activityLog: clone(initialActivityLog),
  cashSessions: clone(initialCashSessions),
  dailyNotes: clone(initialDailyNotes),
  receiptUploads: [],
  apiStatus: 'idle',

  loadRemoteData: async () => {
    set({ apiStatus: 'loading' });
    try {
      const [sales, products, expenses, stock, bootstrapData] = await Promise.all([
        getSales(),
        getProducts(),
        getExpenses(),
        getStock(),
        getBootstrap().catch(() => ({}))
      ]);
      set({
        products: products || [],
        sales: sales || [],
        expenses: expenses || [],
        ingredients: stock || [],
        stockMovements: bootstrapData.stockMovements || clone(initialStockMovements),
        activityLog: bootstrapData.activityLog || clone(initialActivityLog),
        cashSessions: bootstrapData.cashSessions || clone(initialCashSessions),
        dailyNotes: bootstrapData.dailyNotes || clone(initialDailyNotes),
        receiptUploads: bootstrapData.receiptUploads || [],
        apiStatus: 'connected',
      });
      return { sales, products, expenses, stock };
    } catch (error) {
      console.warn('RUTE API tidak aktif atau error.', error);
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

  recordSale: async (payload) => {
    try {
      await postSale(payload);
      await get().loadRemoteData();
    } catch (err) {
      console.error('Failed to sync sale', err);
      throw err;
    }
  },

  saveReceiptExpense: async ({ receipt, imageUrl, user = 'Partner' }) => {
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
      imageUrl: receipt.imageUrl || imageUrl,
      fileName: receipt.upload?.fileName || null,
      mimeType: receipt.upload?.mimeType || null,
      fileSize: receipt.fileSize || receipt.upload?.fileSize || null,
      aiStatus: 'confirmed',
      aiRaw: receipt,
      createdAt: new Date().toISOString(),
      user,
    };

    const applyLocalState = () => set((state) => ({
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

    try {
      const result = await postReceiptExpense({ expense, upload, stockMovements, receipt, imageUrl: upload.imageUrl, user });
      if (result?.state) {
        set({
          products: result.state.products || [],
          sales: result.state.sales || [],
          expenses: result.state.expenses || [],
          ingredients: result.state.ingredients || [],
          stockMovements: result.state.stockMovements || [],
          activityLog: result.state.activityLog || [],
          cashSessions: result.state.cashSessions || [],
          dailyNotes: result.state.dailyNotes || [],
          receiptUploads: result.state.receiptUploads || [],
          apiStatus: 'connected',
        });
      } else {
        applyLocalState();
      }
      return result?.expense || expense;
    } catch (error) {
      console.warn('Gagal sinkron resi ke RUTE API.', error);
      applyLocalState();
      return expense;
    }
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
      await postExpense(expenseData);
      await get().loadRemoteData();
    } catch (err) {
      console.error('Failed to add expense', err);
      throw err;
    }
  },

  adjustStock: async (adjustmentData) => {
    try {
      await postStockAdjustment(adjustmentData);
      await get().loadRemoteData();
    } catch (err) {
      console.error('Failed to adjust stock', err);
      throw err;
    }
  },

  addProduct: async (productData) => {
    try {
      await postProduct(productData);
      await get().loadRemoteData();
    } catch (err) {
      console.error('Failed to add product', err);
      throw err;
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
