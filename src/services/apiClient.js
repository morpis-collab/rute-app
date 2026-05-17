import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

export async function getBootstrap() {
  const { data } = await api.get('/bootstrap');
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

export async function postCashClose(payload) {
  const { data } = await api.post('/cash/close', payload);
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

export async function postProduct(payload) {
  const { data } = await api.post('/products', payload);
  return data;
}

export async function postStockAdjustment(payload) {
  const { data } = await api.post('/stock/adjust', payload);
  return data;
}

export default api;
