// Kategori pengeluaran
export const EXPENSE_CATEGORIES = [
  { value: 'bahan_baku', label: 'Bahan Baku', addsStock: true },
  { value: 'packaging', label: 'Packaging', addsStock: true },
  { value: 'operasional', label: 'Operasional', addsStock: false },
  { value: 'transport', label: 'Transport', addsStock: false },
  { value: 'promosi', label: 'Promosi', addsStock: false },
  { value: 'peralatan', label: 'Peralatan', addsStock: false },
  { value: 'maintenance', label: 'Maintenance', addsStock: false },
  { value: 'pra_operasional', label: 'Pra-Operasional / Persiapan Usaha', addsStock: false, ownerOnly: true },
  { value: 'lainnya', label: 'Lain-lain', addsStock: false },
];

// Metode pembayaran
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: 'Banknote' },
  { value: 'qris', label: 'QRIS', icon: 'QrCode' },
  { value: 'transfer', label: 'Transfer', icon: 'ArrowRightLeft' },
];

// Status approval
export const APPROVAL_STATUS = {
  auto_approved: { label: 'Otomatis', variant: 'success' },
  pending: { label: 'Menunggu', variant: 'warning' },
  approved: { label: 'Disetujui', variant: 'success' },
  rejected: { label: 'Ditolak', variant: 'danger' },
};

// Threshold approval
export const APPROVAL_THRESHOLDS = {
  auto: 100000,         // < 100rb langsung tersimpan
  notify: 300000,       // 100-300rb notifikasi ke owner
  require_approval: Infinity, // > 300rb perlu approval
};
