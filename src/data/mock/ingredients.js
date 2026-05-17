// Mock data: Stok bahan baku RUTE Coffee
export const ingredients = [
  { id: 1, name: 'Kopi Blend', unit: 'gram', stock: 450, minStock: 500, status: 'kritis', costPerUnit: 150, unitConversions: { kg: 1000, kilogram: 1000, gram: 1, g: 1 } }, // Rp 150/g
  { id: 2, name: 'Susu UHT', unit: 'ml', stock: 8000, minStock: 2000, status: 'aman', costPerUnit: 18, unitConversions: { pcs: 1000, kotak: 1000, liter: 1000, l: 1000, ml: 1 } }, // Rp 18/ml, 1 pcs/kotak = 1 liter
  { id: 3, name: 'Gula Aren', unit: 'ml', stock: 800, minStock: 500, status: 'aman', costPerUnit: 25, unitConversions: { botol: 1000, liter: 1000, l: 1000, ml: 1 } }, // Rp 25/ml
  { id: 4, name: 'Matcha Powder', unit: 'gram', stock: 150, minStock: 200, status: 'kritis', costPerUnit: 200, unitConversions: { kg: 1000, kilogram: 1000, gram: 1, g: 1 } }, // Rp 200/g
  { id: 5, name: 'Chocolate Powder', unit: 'gram', stock: 350, minStock: 200, status: 'aman', costPerUnit: 120, unitConversions: { kg: 1000, kilogram: 1000, gram: 1, g: 1 } }, // Rp 120/g
  { id: 6, name: 'Cup 16oz', unit: 'pcs', stock: 45, minStock: 50, status: 'kritis', costPerUnit: 400, unitConversions: { pack: 50, pcs: 1 } }, // Rp 400/pcs
  { id: 7, name: 'Lid', unit: 'pcs', stock: 120, minStock: 50, status: 'aman', costPerUnit: 100, unitConversions: { pack: 50, pcs: 1 } }, // Rp 100/pcs
  { id: 8, name: 'Sedotan', unit: 'pcs', stock: 200, minStock: 50, status: 'aman', costPerUnit: 50, unitConversions: { pack: 100, pcs: 1 } }, // Rp 50/pcs
  { id: 9, name: 'Plastik', unit: 'pcs', stock: 80, minStock: 50, status: 'aman', costPerUnit: 150, unitConversions: { pack: 50, pcs: 1 } }, // Rp 150/pcs
  { id: 10, name: 'Es Batu', unit: 'porsi', stock: 15, minStock: 10, status: 'aman', costPerUnit: 200, unitConversions: { porsi: 1, bungkus: 10 } }, // Rp 200/porsi
];


// Mock data: Riwayat mutasi stok
export const stockMovements = [
  { id: 1, ingredientId: 2, type: 'masuk', qty: 12, source: 'Pembelian (Resi #R001)', date: '2026-05-17T10:30:00', user: 'Partner' },
  { id: 2, ingredientId: 1, type: 'keluar', qty: 54, source: 'Penjualan (3x Kopi Susu)', date: '2026-05-17T11:00:00', user: 'Sistem' },
  { id: 3, ingredientId: 1, type: 'koreksi', qty: -50, source: 'Tumpah', date: '2026-05-17T15:20:00', user: 'Partner' },
  { id: 4, ingredientId: 6, type: 'masuk', qty: 100, source: 'Pembelian (Resi #R002)', date: '2026-05-16T09:00:00', user: 'Partner' },
  { id: 5, ingredientId: 4, type: 'keluar', qty: 25, source: 'Penjualan (5x Matcha)', date: '2026-05-16T14:00:00', user: 'Sistem' },
];

export default ingredients;
