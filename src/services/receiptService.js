import { postReceiptScan } from './apiClient';

export async function scanReceiptImage(file) {
  return postReceiptScan(file);
}
