export const cashAccounts = [
  { id: 'acc-01', name: 'Kas Tunai Outlet', type: 'tunai', balance: 1850000, description: 'Uang tunai fisik di laci kasir' },
  { id: 'acc-02', name: 'QRIS BCA', type: 'qris', balance: 4250000, description: 'Penerimaan QRIS otomatis' },
  { id: 'acc-03', name: 'Bank Mandiri (Owner)', type: 'bank', balance: 12500000, description: 'Rekening utama usaha' },
  { id: 'acc-04', name: 'GoPay / OVO', type: 'ewallet', balance: 850000, description: 'Penerimaan E-Wallet online' },
];

export const cashTransactions = [
  { id: 'ctx-01', date: '2026-05-17T08:30:00Z', type: 'in', accountId: 'acc-01', amount: 500000, category: 'modal', description: 'Modal tunai awal hari', user: 'Rute Owner' },
  { id: 'ctx-02', date: '2026-05-17T10:15:00Z', type: 'out', accountId: 'acc-01', amount: 120000, category: 'bahan', description: 'Beli es batu kristal', user: 'Kasir Malinau' },
  { id: 'ctx-03', date: '2026-05-17T14:00:00Z', type: 'transfer', fromAccountId: 'acc-02', toAccountId: 'acc-03', amount: 2000000, category: 'transfer', description: 'Settlement QRIS ke Bank', user: 'Rute Owner' },
];
