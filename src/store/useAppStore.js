import { create } from 'zustand';
import {
  getBootstrap,
  postWallet,
  putWallet,
  deleteWallet,
  postCategory,
  deleteCategory,
  postIncome,
  putIncome,
  deleteIncome,
  postExpense,
  putExpense,
  deleteExpense,
  postTransfer,
  putTransfer,
  deleteTransfer,
  postIngredient,
  putIngredient,
  deleteIngredient
} from '../services/apiClient';

const useAppStore = create((set, get) => ({
  wallets: [],
  categories: { income: [], expense: [] },
  incomes: [],
  expenses: [],
  transfers: [],
  ingredients: [],
  apiStatus: 'idle',

  loadRemoteData: async () => {
    set({ apiStatus: 'loading' });
    try {
      const data = await getBootstrap();
      set({
        wallets: data.wallets || [],
        categories: data.categories || { income: [], expense: [] },
        incomes: data.incomes || [],
        expenses: data.expenses || [],
        transfers: data.transfers || [],
        ingredients: data.ingredients || [],
        apiStatus: 'connected',
      });
      return data;
    } catch (error) {
      console.error('Failed to load remote data:', error);
      set({ apiStatus: 'offline' });
      throw error;
    }
  },

  addWallet: async (walletData) => {
    try {
      const res = await postWallet(walletData);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to add wallet:', error);
      throw error;
    }
  },

  updateWallet: async (id, walletData) => {
    try {
      const res = await putWallet(id, walletData);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to update wallet:', error);
      throw error;
    }
  },

  deleteWallet: async (id) => {
    try {
      const res = await deleteWallet(id);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      throw error;
    }
  },

  addCategory: async (type, name) => {
    try {
      const res = await postCategory({ type, name });
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to add category:', error);
      throw error;
    }
  },

  deleteCategory: async (type, name) => {
    try {
      const res = await deleteCategory(type, name);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  },

  addIncome: async (incomeData) => {
    try {
      const res = await postIncome(incomeData);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to add income:', error);
      throw error;
    }
  },

  updateIncome: async (id, incomeData) => {
    try {
      const res = await putIncome(id, incomeData);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to update income:', error);
      throw error;
    }
  },

  deleteIncome: async (id) => {
    try {
      const res = await deleteIncome(id);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to delete income:', error);
      throw error;
    }
  },

  addExpense: async (expenseData) => {
    try {
      const res = await postExpense(expenseData);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to add expense:', error);
      throw error;
    }
  },

  updateExpense: async (id, expenseData) => {
    try {
      const res = await putExpense(id, expenseData);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to update expense:', error);
      throw error;
    }
  },

  deleteExpense: async (id) => {
    try {
      const res = await deleteExpense(id);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to delete expense:', error);
      throw error;
    }
  },

  addTransfer: async (transferData) => {
    try {
      const res = await postTransfer(transferData);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to add transfer:', error);
      throw error;
    }
  },

  updateTransfer: async (id, transferData) => {
    try {
      const res = await putTransfer(id, transferData);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to update transfer:', error);
      throw error;
    }
  },

  deleteTransfer: async (id) => {
    try {
      const res = await deleteTransfer(id);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to delete transfer:', error);
      throw error;
    }
  },

  addIngredient: async (ingredientData) => {
    try {
      const res = await postIngredient(ingredientData);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to add ingredient:', error);
      throw error;
    }
  },

  updateIngredient: async (id, ingredientData) => {
    try {
      const res = await putIngredient(id, ingredientData);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to update ingredient:', error);
      throw error;
    }
  },

  deleteIngredient: async (id) => {
    try {
      const res = await deleteIngredient(id);
      await get().loadRemoteData();
      return res;
    } catch (error) {
      console.error('Failed to delete ingredient:', error);
      throw error;
    }
  },
}));

export default useAppStore;
