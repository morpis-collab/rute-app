// Mock data: Transaksi penjualan hari ini
export const sales = [
  {
    id: 'TRX-001',
    date: '2026-05-17T09:15:00',
    items: [
      { productId: 1, name: 'Kopi Susu RUTE', qty: 2, price: 10000, subtotal: 20000 },
      { productId: 3, name: 'Americano', qty: 1, price: 8000, subtotal: 8000 },
    ],
    total: 28000,
    paymentMethod: 'cash',
    user: 'Partner',
  },
  {
    id: 'TRX-002',
    date: '2026-05-17T10:30:00',
    items: [
      { productId: 2, name: 'Matcha Latte', qty: 2, price: 12000, subtotal: 24000 },
    ],
    total: 24000,
    paymentMethod: 'qris',
    user: 'Partner',
  },
  {
    id: 'TRX-003',
    date: '2026-05-17T11:45:00',
    items: [
      { productId: 1, name: 'Kopi Susu RUTE', qty: 3, price: 10000, subtotal: 30000 },
      { productId: 4, name: 'Chocolate', qty: 1, price: 10000, subtotal: 10000 },
      { productId: 6, name: 'Thai Tea', qty: 2, price: 10000, subtotal: 20000 },
    ],
    total: 60000,
    paymentMethod: 'cash',
    user: 'Partner',
  },
  {
    id: 'TRX-004',
    date: '2026-05-17T13:00:00',
    items: [
      { productId: 5, name: 'Es Kopi', qty: 2, price: 8000, subtotal: 16000 },
      { productId: 2, name: 'Matcha Latte', qty: 1, price: 12000, subtotal: 12000 },
    ],
    total: 28000,
    paymentMethod: 'transfer',
    user: 'Partner',
  },
  {
    id: 'TRX-005',
    date: '2026-05-17T14:20:00',
    items: [
      { productId: 1, name: 'Kopi Susu RUTE', qty: 4, price: 10000, subtotal: 40000 },
    ],
    total: 40000,
    paymentMethod: 'qris',
    user: 'Partner',
  },
];

// Summary helper
export function getSalesSummary(salesData = sales) {
  const totalOmzet = salesData.reduce((sum, s) => sum + s.total, 0);
  const totalTransaksi = salesData.length;
  const totalCup = salesData.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.qty, 0), 0);

  const byMethod = { cash: 0, qris: 0, transfer: 0 };
  salesData.forEach(s => { byMethod[s.paymentMethod] += s.total; });

  const menuCount = {};
  salesData.forEach(s => {
    s.items.forEach(item => {
      menuCount[item.name] = (menuCount[item.name] || 0) + item.qty;
    });
  });
  const menuTerlaris = Object.entries(menuCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, qty]) => ({ name, qty }));

  return { totalOmzet, totalTransaksi, totalCup, byMethod, menuTerlaris };
}

export default sales;
