# RUTE Backend API Contract

Base URL development: `http://localhost:4321/api`

Frontend Vite proxy sudah mengarah dari `/api` ke backend lokal.

## Health

`GET /health`

Response:
```json
{ "ok": true, "service": "rute-api", "time": "2026-05-17T14:00:00.000Z" }
```

## Bootstrap Data

`GET /bootstrap`

Dipakai frontend saat app start untuk mengambil data awal:

- `products`
- `sales`
- `expenses`
- `ingredients`
- `stockMovements`
- `activityLog`
- `cashSessions`
- `dailyNotes`
- `receiptUploads`
- `dashboard`

## Sales

`POST /sales`

Request minimal:
```json
{
  "items": [
    { "productId": 1, "name": "Kopi Susu RUTE", "qty": 1, "price": 10000, "subtotal": 10000 }
  ],
  "total": 10000,
  "paymentMethod": "cash",
  "user": "Partner"
}
```

Response berisi transaksi, HPP transaksi, stock movement keluar, dan snapshot state terbaru.

## Products

`GET /products`

Mengambil daftar menu dengan HPP dan margin yang dihitung ulang dari biaya bahan terbaru.

`POST /products`

Request minimal:
```json
{
  "name": "Kopi Susu RUTE",
  "category": "Kopi",
  "sellingPrice": 10000,
  "recipe": [
    { "ingredientId": 1, "name": "Kopi Blend", "qty": 18, "unit": "gram" }
  ],
  "user": "Owner"
}
```

Response berisi menu baru, HPP, margin, activity log, dan snapshot state terbaru.

## Stock Adjustment

`POST /stock/adjust`

Dipakai owner/operator untuk koreksi stok manual, barang rusak, atau stok masuk non-resi.

Request:
```json
{
  "ingredientId": 1,
  "qty": 250,
  "unit": "gram",
  "type": "masuk",
  "reason": "Stock opname",
  "user": "Owner"
}
```

`type` valid saat ini: `masuk` atau `keluar`.

Response berisi stock movement adjustment dan snapshot state terbaru.

## Receipt OCR

`POST /receipts/scan`

Multipart field:

- `receipt`: file foto resi

Response:
```json
{
  "merchantName": "Supplier Malinau",
  "transactionDate": "2026-05-17T14:00:00.000Z",
  "confidence": 0.92,
  "items": []
}
```

Saat ini OCR masih stub lokal agar flow frontend-backend siap. Nanti bisa diganti OpenAI Vision tanpa mengubah kontrak frontend.

## Receipt Expense Confirmation

`POST /receipt-expenses`

Dipanggil setelah operator mengonfirmasi preview AI. Backend menyimpan pengeluaran, receipt upload, stock movement masuk, dan activity log.

## Expense Approval

`PATCH /expenses/:id/status`

Request:
```json
{ "status": "approved" }
```

Status valid:

- `auto_approved`
- `pending`
- `approved`
- `rejected`

## Cash Closing

`POST /cash/close`

Request:
```json
{
  "date": "2026-05-17",
  "actualCash": 250000,
  "qris": 120000,
  "transfer": 0,
  "notes": "Tidak ada kendala",
  "user": "Partner"
}
```

## Daily Notes

`POST /daily-notes`

Request:
```json
{
  "date": "2026-05-17",
  "note": "Hari ini ramai mulai jam 11.",
  "user": "Partner"
}
```

## Reports

`GET /reports/today?date=2026-05-17`

Response berisi omzet, HPP, laba kotor, pengeluaran operasional, estimasi laba bersih, jumlah transaksi, total cup, dan menu terlaris.
