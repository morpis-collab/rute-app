// Mock data: Pengeluaran
export const expenses = [
  {
    id: 'EXP-001',
    date: '2026-05-17T08:30:00',
    category: 'bahan_baku',
    description: 'Pembelian susu UHT',
    items: [
      { name: 'Susu UHT 1L', qty: 12, price: 18000, total: 216000, addsStock: true, ingredientId: 2 },
    ],
    total: 216000,
    status: 'approved',
    photoUrl: null,
    user: 'Partner',
  },
  {
    id: 'EXP-002',
    date: '2026-05-17T09:00:00',
    category: 'bahan_baku',
    description: 'Pembelian gula aren dan kopi',
    items: [
      { name: 'Gula Aren', qty: 2, price: 25000, total: 50000, addsStock: true, ingredientId: 3 },
      { name: 'Kopi Blend 1kg', qty: 1, price: 110000, total: 110000, addsStock: true, ingredientId: 1 },
    ],
    total: 160000,
    status: 'approved',
    photoUrl: null,
    user: 'Partner',
  },
  {
    id: 'EXP-003',
    date: '2026-05-17T10:00:00',
    category: 'packaging',
    description: 'Pembelian cup dan sedotan',
    items: [
      { name: 'Cup 16oz', qty: 100, price: 750, total: 75000, addsStock: true, ingredientId: 6 },
      { name: 'Sedotan', qty: 100, price: 150, total: 15000, addsStock: true, ingredientId: 8 },
    ],
    total: 90000,
    status: 'auto_approved',
    photoUrl: null,
    user: 'Partner',
  },
  {
    id: 'EXP-004',
    date: '2026-05-16T14:00:00',
    category: 'peralatan',
    description: 'Service grinder',
    items: [
      { name: 'Service grinder + ganti burr', qty: 1, price: 450000, total: 450000, addsStock: false },
    ],
    total: 450000,
    status: 'pending',
    photoUrl: null,
    user: 'Partner',
  },
  {
    id: 'EXP-005',
    date: '2026-05-16T07:00:00',
    category: 'operasional',
    description: 'Beli es batu',
    items: [
      { name: 'Es Batu', qty: 20, price: 5000, total: 100000, addsStock: true, ingredientId: 10 },
    ],
    total: 100000,
    status: 'approved',
    photoUrl: null,
    user: 'Partner',
  },
];

export default expenses;
