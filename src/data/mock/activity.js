// Mock data: Activity log
export const activityLog = [
  { id: 1, time: '2026-05-17T09:02:00', action: 'Buka kas awal Rp 100.000', user: 'Partner', type: 'kas' },
  { id: 2, time: '2026-05-17T09:15:00', action: 'Input penjualan: Kopi Susu 2x, Americano 1x', user: 'Partner', type: 'penjualan' },
  { id: 3, time: '2026-05-17T10:30:00', action: 'Input penjualan: Matcha Latte 2x (QRIS)', user: 'Partner', type: 'penjualan' },
  { id: 4, time: '2026-05-17T10:35:00', action: 'Upload resi pembelian susu UHT Rp 216.000', user: 'Partner', type: 'pengeluaran' },
  { id: 5, time: '2026-05-17T11:45:00', action: 'Input penjualan: Kopi Susu 3x, Chocolate 1x, Thai Tea 2x', user: 'Partner', type: 'penjualan' },
  { id: 6, time: '2026-05-17T13:00:00', action: 'Input penjualan: Es Kopi 2x, Matcha 1x (Transfer)', user: 'Partner', type: 'penjualan' },
  { id: 7, time: '2026-05-17T14:20:00', action: 'Input penjualan: Kopi Susu 4x (QRIS)', user: 'Partner', type: 'penjualan' },
  { id: 8, time: '2026-05-17T14:45:00', action: 'Stok Cup 16oz diupdate: +100 pcs', user: 'Partner', type: 'stok' },
  { id: 9, time: '2026-05-17T15:20:00', action: 'Koreksi stok kopi: -50 gram (tumpah)', user: 'Partner', type: 'stok' },
];

// Mock data: Catatan harian
export const dailyNotes = [
  {
    date: '2026-05-17',
    note: 'Hari ini agak sepi pagi tapi ramai mulai jam 11. Banyak yang pesan kopi susu. Stok cup mulai menipis, sudah dibeli 100 pcs. Grinder agak bunyi aneh, mungkin perlu dicek. Ada pelanggan tanya menu baru rasa taro.',
    createdBy: 'Partner',
    createdAt: '2026-05-17T16:00:00',
  },
  {
    date: '2026-05-16',
    note: 'Hari ramai, total 25 cup. QRIS sempat error sekitar jam 2 siang tapi sudah normal. Ada komplain es kurang, besok beli es lebih banyak.',
    createdBy: 'Partner',
    createdAt: '2026-05-16T21:00:00',
  },
];

// Mock data: Cash sessions
export const cashSessions = [
  {
    date: '2026-05-16',
    openingCash: 100000,
    closingCash: 280000,
    expectedCash: 280000,
    difference: 0,
    qris: 124000,
    transfer: 56000,
    totalExpenseCash: 150000,
    status: 'closed',
    notes: 'Tidak ada kendala',
  },
  {
    date: '2026-05-17',
    openingCash: 100000,
    closingCash: null,
    expectedCash: null,
    difference: null,
    qris: null,
    transfer: null,
    totalExpenseCash: null,
    status: 'open',
    notes: null,
  },
];

export default activityLog;
