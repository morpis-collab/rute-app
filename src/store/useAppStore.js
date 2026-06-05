import { create } from 'zustand';
import {
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
  putExpense,
  postProduct,
  putProduct,
  deleteProduct,
  postIngredient,
  deleteIngredient,
  postStockAdjustment,
  updateOpeningCapital
} from '../services/apiClient';
import { getBusinessDate, isSameBusinessDate } from '../utils/businessDate';

const useAppStore = create((set, get) => ({
  products: [],
  sales: [],
  expenses: [],
  ingredients: [],
  stockMovements: [],
  activityLog: [],
  cashSessions: [],
  cashAccounts: [],
  cashTransactions: [],
  dailyNotes: [],
  receiptUploads: [],
  openingCapital: null,
  apiStatus: 'idle',

  loadRemoteData: async () => {
    set({ apiStatus: 'loading' });
    try {
      const [sales, products, expenses, stock, bootstrapData] = await Promise.all([
        getSales({ all: 'true' }),
        getProducts(),
        getExpenses({ all: 'true' }),
        getStock(),
        getBootstrap().catch(() => ({}))
      ]);
      set({
        products: products || [],
        sales: sales || [],
        expenses: expenses || [],
        ingredients: stock || [],
        stockMovements: bootstrapData.stockMovements || [],
        activityLog: bootstrapData.activityLog || [],
        cashSessions: bootstrapData.cashSessions || [],
        cashAccounts: bootstrapData.cashAccounts || [],
        cashTransactions: bootstrapData.cashTransactions || [],
        dailyNotes: bootstrapData.dailyNotes || [],
        receiptUploads: bootstrapData.receiptUploads || [],
        openingCapital: bootstrapData.openingCapital || null,
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
    const cashExpensesList = get().expenses.filter((expense) => {
      if (!expense.cashAccountId) return true;
      const account = get().cashAccounts.find(a => String(a.id) === String(expense.cashAccountId));
      return account ? account.type === 'cash' : true;
    });
    return getCashExpected({
      sales: get().sales,
      expenses: cashExpensesList,
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

  saveReceiptExpense: async ({ receipt, imageUrl, cashAccountId, user = 'Partner' }) => {
    try {
      const result = await postReceiptExpense({
        receipt: {
          ...receipt,
          imageUrl: receipt.imageUrl || imageUrl,
        },
        imageUrl: receipt.imageUrl || imageUrl,
        cashAccountId,
        user,
      });
      if (result?.state) {
        set({
          products: result.state.products || [],
          sales: result.state.sales || [],
          expenses: result.state.expenses || [],
          ingredients: result.state.ingredients || [],
          stockMovements: result.state.stockMovements || [],
          activityLog: result.state.activityLog || [],
          cashSessions: result.state.cashSessions || [],
          cashAccounts: result.state.cashAccounts || [],
          cashTransactions: result.state.cashTransactions || [],
          dailyNotes: result.state.dailyNotes || [],
          receiptUploads: result.state.receiptUploads || [],
          apiStatus: 'connected',
        });
      }
      return result?.expense;
    } catch (error) {
      console.warn('Gagal sinkron resi ke RUTE API.', error);
      set({ apiStatus: 'offline' });
      throw error;
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

  updateExpense: async (id, expenseData) => {
    try {
      await putExpense(id, expenseData);
      await get().loadRemoteData();
    } catch (err) {
      console.error('Failed to update expense', err);
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

  addIngredient: async (ingredientData) => {
    try {
      await postIngredient(ingredientData);
      await get().loadRemoteData();
    } catch (err) {
      console.error('Failed to add ingredient', err);
      throw err;
    }
  },

  removeIngredient: async (id) => {
    try {
      await deleteIngredient(id);
      await get().loadRemoteData();
    } catch (err) {
      console.error('Failed to delete ingredient', err);
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

  updateProduct: async (id, productData) => {
    try {
      await putProduct(id, productData);
      await get().loadRemoteData();
    } catch (err) {
      console.error('Failed to update product', err);
      throw err;
    }
  },

  deleteProduct: async (id) => {
    try {
      await deleteProduct(id);
      await get().loadRemoteData();
    } catch (err) {
      console.error('Failed to delete product', err);
      throw err;
    }
  },

  closeCash: ({ actualCash, qris, transfer, notes, user = 'Partner' }) => {
    const businessDate = getBusinessDate();
    const session = get().cashSessions.find((cash) => cash.date === businessDate);
    const expectedCash = get().getCashExpected(businessDate);
    const difference = Number(actualCash || 0) - expectedCash;

    const cashExpensesList = get().expenses.filter((expense) => {
      if (!isSameBusinessDate(expense.date, businessDate)) return false;
      if (!expense.cashAccountId) return true;
      const account = get().cashAccounts.find(a => String(a.id) === String(expense.cashAccountId));
      return account ? account.type === 'cash' : true;
    });
    const totalExpenseCash = cashExpensesList.reduce((sum, e) => sum + e.total, 0);

    const closedSession = {
      date: businessDate,
      openingCash: session?.openingCash || 0,
      closingCash: Number(actualCash || 0),
      expectedCash,
      difference,
      qris: Number(qris || 0),
      transfer: Number(transfer || 0),
      totalExpenseCash,
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

  saveOpeningCapital: async (payload) => {
    try {
      const result = await updateOpeningCapital(payload);
      if (result) {
        set((state) => ({
          openingCapital: result.openingCapital || state.openingCapital,
          ...(result.state ? {
            products: result.state.products || state.products,
            sales: result.state.sales || state.sales,
            expenses: result.state.expenses || state.expenses,
            ingredients: result.state.ingredients || state.ingredients,
            stockMovements: result.state.stockMovements || state.stockMovements,
            activityLog: result.state.activityLog || state.activityLog,
            cashSessions: result.state.cashSessions || state.cashSessions,
            cashAccounts: result.state.cashAccounts || state.cashAccounts,
            cashTransactions: result.state.cashTransactions || state.cashTransactions,
            dailyNotes: result.state.dailyNotes || state.dailyNotes,
            receiptUploads: result.state.receiptUploads || state.receiptUploads,
          } : {})
        }));
      }
      return result;
    } catch (err) {
      console.error('Failed to save opening capital', err);
      throw err;
    }
  },
}));

export default useAppStore;
