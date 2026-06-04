import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import useToastStore from '../store/useToastStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isLoggingOut = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!isLoggingOut) {
        isLoggingOut = true;
        useAuthStore.getState().logout();
        useToastStore.getState().addToast('Sesi Anda telah berakhir, silakan login kembali.', 'error');
        setTimeout(() => { isLoggingOut = false; }, 3000);
      }
    } else if (error.response?.status === 403) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Anda tidak memiliki akses ke fitur ini.';
      useToastStore.getState().addToast(msg, 'error');
    }
    return Promise.reject(error);
  }
);

export async function getBootstrap() {
  const { data } = await api.get('/bootstrap');
  return data;
}

export async function postLogin(payload) {
  const { data } = await api.post('/auth/login', payload);
  return data;
}

export async function postSale(payload) {
  const { data } = await api.post('/sales', payload);
  return data;
}

export async function postReceiptScan(file) {
  const formData = new FormData();
  formData.append('receipt', file);
  const { data } = await api.post('/receipts/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // 60 seconds timeout for OCR processing
  });
  return data;
}

export async function postReceiptExpense(payload) {
  const { data } = await api.post('/receipt-expenses', payload);
  return data;
}

export async function patchExpenseStatus(expenseId, status) {
  const { data } = await api.patch(`/expenses/${expenseId}/status`, { status });
  return data;
}

export async function getCashExpected(date, openingCash) {
  const params = {};
  if (date) params.date = date;
  if (openingCash !== undefined && openingCash !== null && openingCash !== '') {
    params.openingCash = openingCash;
  }

  const { data } = await api.get('/cash/expected', {
    params,
  });
  return data;
}

export async function postCashClose(payload) {
  const { data } = await api.post('/cash/close', payload);
  return data;
}

export async function postCashOpen(payload) {
  const { data } = await api.post('/cash/open', payload);
  return data;
}


export async function getCashAccounts() {
  const { data } = await api.get('/cash/accounts');
  return data;
}

export async function getOwnerCash(params = {}) {
  const { data } = await api.get('/cash/owner', { params });
  return data;
}

export async function postCashTransaction(payload) {
  const { data } = await api.post('/cash/transactions', payload);
  return data;
}

export async function postDailyNote(payload) {
  const { data } = await api.post('/daily-notes', payload);
  return data;
}

export async function postExpense(payload) {
  const { data } = await api.post('/expenses', payload);
  return data;
}

export async function putExpense(id, payload) {
  const { data } = await api.put(`/expenses/${id}`, payload);
  return data;
}

export async function postProduct(payload) {
  const { data } = await api.post('/products', payload);
  return data;
}

export async function putProduct(id, payload) {
  const { data } = await api.put(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/products/${id}`);
  return data;
}

export async function postStockAdjustment(payload) {
  const { data } = await api.post('/stock/adjust', payload);
  return data;
}

export async function postIngredient(payload) {
  const { data } = await api.post('/ingredients', payload);
  return data;
}

export async function deleteIngredient(id) {
  const { data } = await api.delete(`/ingredients/${id}`);
  return data;
}


export async function getCopilotInsights(date) {
  const { data } = await api.get('/copilot/insights', {
    params: date ? { date } : {},
  });
  return data;
}

export async function postCopilotChat(payload) {
  const { data } = await api.post('/copilot/chat', payload, {
    timeout: 60000, // 60 seconds timeout for Gemini AI generation
  });
  return data;
}

export async function getSales(params = {}) {
  const { data } = await api.get('/sales', { params });
  return data;
}

export async function getProducts() {
  const { data } = await api.get('/products');
  return data;
}

export async function getStock() {
  const { data } = await api.get('/stock');
  return data;
}

export async function getExpenses(params = {}) {
  const { data } = await api.get('/expenses', { params });
  return data;
}

export async function getOpeningCapital() {
  const { data } = await api.get('/opening-capital');
  return data;
}

export async function updateOpeningCapital(payload) {
  const { data } = await api.put('/opening-capital', payload);
  return data;
}

export default api;
