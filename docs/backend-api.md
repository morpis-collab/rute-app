# RUTE Backend API Contract

Base URL development: `http://localhost:4321/api`

Frontend Vite proxy sudah mengarah dari `/api` ke backend lokal.

## Environment

Env penting untuk development/production:

- `RUTE_API_PORT`: port API lokal.
- `RUTE_BUSINESS_TZ`: timezone business date, default `Asia/Makassar`.
- `RUTE_CORS_ORIGIN`: origin frontend yang diizinkan. Wajib diset eksplisit di production.
- `RUTE_DATA_FILE`: path file JSON database. Set ke persistent disk saat deploy.
- `JWT_SECRET`: secret JWT. Wajib panjang dan random di production.
- `JWT_EXPIRES_SECONDS`: durasi token.
- `RUTE_OWNER_PIN` dan `RUTE_PARTNER_PIN`: PIN login role.
- `AI_API_KEY` atau `OPENAI_API_KEY`: key provider AI Copilot.
- `AI_MODEL` dan `AI_BASE_URL`: opsional untuk model/provider kompatibel OpenAI chat completions.

Mulai fase auth, semua endpoint `/api/*` membutuhkan header:

```http
Authorization: Bearer <token>
```

Endpoint publik:

- `GET /health`
- `POST /auth/login`

## Auth

`POST /auth/login`

Request:
```json
{
  "role": "owner",
  "pin": "123456"
}
```

Role valid: `owner` atau `partner`.

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": 1,
    "name": "Owner RUTE",
    "email": "owner@rute.coffee",
    "role": "owner",
    "authMethod": "pin",
    "active": true
  }
}
```

`GET /auth/me`

Memvalidasi token aktif dan mengembalikan user saat ini.

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
- `openingCapital`
- `dailyNotes`
- `receiptUploads`
- `dashboard`

## Sales

`GET /sales`

Mengambil transaksi penjualan business date hari ini. Query opsional:

- `date=YYYY-MM-DD`: ambil tanggal tertentu.
- `all=true`: ambil semua transaksi.

Response:
```json
[
  {
    "id": "TRX-001",
    "date": "2026-05-18T09:15:00.000Z",
    "items": [
      { "productId": 1, "name": "Kopi Susu RUTE", "qty": 1, "price": 10000, "subtotal": 10000 }
    ],
    "total": 10000,
    "paymentMethod": "cash",
    "user": "Partner"
  }
]
```

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

## Stock

`GET /stock`

Mengambil daftar bahan baku dengan field kontrak frontend `stockCurrent`.

Response:
```json
[
  {
    "id": 1,
    "name": "Kopi Blend",
    "category": "Bahan",
    "unit": "gram",
    "costPerUnit": 150,
    "stockCurrent": 450,
    "minStock": 500,
    "emoji": "☕"
  }
]
```

`POST /ingredients`

Khusus owner. Membuat master bahan baku baru agar bisa dipakai di stok, resi pembelian, dan recipe builder HPP.

Request:
```json
{
  "name": "Kopi Blend",
  "category": "bahan_baku",
  "unit": "gram",
  "stock": 1000,
  "minStock": 200,
  "costPerUnit": 50,
  "user": "Owner"
}
```

Response berisi bahan baru, daftar stok terbaru, dan snapshot state. Nama bahan tidak boleh duplikat.

`POST /stock/adjust`

Dipakai owner/operator untuk koreksi stok manual, barang rusak, atau stok masuk non-resi.

Request:
```json
{
  "ingredientId": 1,
  "type": "in",
  "amount": 250,
  "user": "Owner",
  "notes": "Stock opname"
}
```

`type` valid: `in`, `out`, atau `waste`. Alias lama `masuk` dan `keluar` tetap diterima.

Response berisi stock movement adjustment dan snapshot state terbaru.

## Expenses

`GET /expenses`

Mengambil pengeluaran business date hari ini. Query opsional:

- `date=YYYY-MM-DD`: ambil tanggal tertentu.
- `all=true`: ambil semua pengeluaran.

Response:
```json
[
  {
    "id": "EXP-001",
    "date": "2026-05-18T08:30:00.000Z",
    "user": "Partner",
    "items": [{ "name": "Susu UHT", "amount": 216000 }],
    "total": 216000,
    "status": "approved",
    "proofUrl": null
  }
]
```

`POST /expenses`

Request minimal:
```json
{
  "items": [{ "name": "Susu UHT", "amount": 216000 }],
  "total": 216000,
  "user": "Partner",
  "proofUrl": null
}
```

Response berisi pengeluaran baru, stock movement bila item menambah stok, dan snapshot state terbaru.

## Receipt OCR

`POST /receipts/scan`

Multipart field:

- `receipt`: file foto resi
- Tipe file yang diterima: JPEG, PNG, WebP, HEIC, HEIF
- Ukuran maksimal: 8MB

Response:
```json
{
  "merchantName": "Supplier Malinau",
  "transactionDate": "2026-05-17T14:00:00.000Z",
  "confidence": 0.92,
  "originalFileName": "resi.jpg",
  "fileSize": 245000,
  "imageUrl": "/uploads/receipts/1716000000000-abcd1234.jpg",
  "upload": {
    "originalFileName": "resi.jpg",
    "fileName": "1716000000000-abcd1234.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 245000,
    "imageUrl": "/uploads/receipts/1716000000000-abcd1234.jpg"
  },
  "items": [],
  "source": "ai",
  "aiStatus": "parsed",
  "requiresManualReview": false
}
```

Backend menyimpan file resi ke `RUTE_UPLOAD_DIR` lalu mencoba OCR memakai OpenAI-compatible Vision API. Pakai `RECEIPT_AI_API_KEY` atau fallback ke `AI_API_KEY`/`OPENAI_API_KEY`; model default `RECEIPT_AI_MODEL` lalu `AI_MODEL`.

Jika API key belum ada, provider gagal, confidence rendah, atau item tidak terbaca, backend tetap mengembalikan upload metadata tetapi tidak mengisi item palsu. Frontend harus menampilkan mode input/koreksi manual sebelum konfirmasi:

```json
{
  "merchantName": "",
  "transactionDate": null,
  "confidence": 0,
  "items": [],
  "source": "local",
  "aiStatus": "manual_review_required",
  "requiresManualReview": true,
  "providerError": "OCR AI gagal. Isi item secara manual sebelum konfirmasi."
}
```

## Receipt Expense Confirmation

`POST /receipt-expenses`

Dipanggil setelah operator mengonfirmasi preview AI. Backend menyimpan pengeluaran, receipt upload termasuk `imageUrl` file permanen, stock movement masuk, dan activity log.

Kontrak penting:

- `receipt.items` wajib berisi minimal satu item valid. Backend menolak item kosong agar hasil scan manual review tidak langsung menyimpan data palsu.
- Untuk item `addsStock: true`, `ingredientId` harus cocok dengan bahan di database dan `stockQty` wajib lebih dari 0.
- Backend menghitung ulang `total` dari item dan membangun stock movement sendiri. `stockMovements` dari client diabaikan untuk mencegah manipulasi stok.
- `cashAccountId` opsional. Jika dikirim, backend mencatat kas keluar dari akun tersebut. Jika tidak dikirim, backend memakai akun kas tunai/default pertama.
- Jika file/image resi yang sama sudah pernah dikonfirmasi, backend mengembalikan `409`.
- Jika tanggal resi berada pada hari kas yang sudah ditutup, backend mengembalikan `403`.

Request minimal setelah preview dikoreksi:

```json
{
  "receipt": {
    "merchantName": "Supplier Malinau",
    "transactionDate": "2026-05-18T10:00:00.000Z",
    "imageUrl": "/uploads/receipts/1716000000000-abcd1234.jpg",
    "upload": {
      "fileName": "1716000000000-abcd1234.jpg",
      "imageUrl": "/uploads/receipts/1716000000000-abcd1234.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 245000
    },
    "items": [
      {
        "name": "Susu UHT 1L",
        "category": "bahan_baku",
        "qty": 12,
        "unit": "pcs",
        "price": 18000,
        "total": 216000,
        "addsStock": true,
        "ingredientId": 2,
        "stockQty": 12,
        "stockUnit": "pcs"
      }
    ]
  },
  "cashAccountId": "kas-utama",
  "user": "Partner"
}
```

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

## Opening Capital

`GET /opening-capital`

Mengambil setup modal awal. Butuh token role `owner`.

`PUT /opening-capital`

Menyimpan modal awal usaha tanpa mencampur barang pribadi ke laporan bisnis. Butuh token role `owner`.

Request:
```json
{
  "businessStartDate": "2026-05-18",
  "cashCapital": 1500000,
  "assetContributions": [
    {
      "name": "Grinder",
      "quantity": 1,
      "unit": "unit",
      "estimatedValue": 1200000,
      "notes": "Disetor owner"
    }
  ],
  "inventoryContributions": [
    {
      "name": "Kopi house blend",
      "quantity": 2,
      "unit": "kg",
      "estimatedValue": 360000,
      "notes": "Stok awal usaha"
    }
  ],
  "personalExcludedItems": [
    {
      "name": "Laptop pribadi",
      "estimatedValue": 8000000,
      "reason": "Barang pribadi, tidak masuk usaha"
    }
  ],
  "notes": "Barang pribadi hanya dicatat sebagai excluded."
}
```

Response:
```json
{
  "openingCapital": {
    "businessStartDate": "2026-05-18",
    "cashCapital": 1500000,
    "assetContributions": [],
    "inventoryContributions": [],
    "personalExcludedItems": [],
    "totals": {
      "cashCapital": 1500000,
      "assetContributions": 1200000,
      "inventoryContributions": 360000,
      "businessCapital": 3060000,
      "personalExcluded": 8000000
    }
  },
  "state": {}
}
```

Catatan:

- `cashCapital`, `assetContributions`, dan `inventoryContributions` dihitung sebagai modal usaha.
- `personalExcludedItems` hanya catatan audit, tidak masuk modal, stok, aset, cash, laba, atau HPP.
- `GET /bootstrap` hanya mengirim ringkasan modal awal tanpa detail `personalExcludedItems`; detail barang pribadi hanya tersedia via endpoint owner.
- `cashCapital` otomatis menjadi default `openingCash` di `GET /cash/expected` hanya jika `businessStartDate` sama dengan tanggal tutup kas dan belum ada `cashSession` tanggal itu.

## Cash Closing

`GET /cash/owner`

Endpoint agregat utama untuk halaman Owner Cash. Butuh token role `owner`.

Query filter: `date`, `openingCash`, `limit` (default 50, maksimal 100), `type`, dan `accountId`.

Response berisi `businessDate`, `cashAccounts`, `cashTransactions`, `totalCash`, `transactionCount`, `expectedCash`, `cashSession`, `summary`, dan `filters`.

`GET /cash/accounts`

Mengambil saldo semua akun kas dan riwayat mutasi kas. Butuh token role `owner`.

Query filter yang didukung: `limit`, `type`, `accountId`, dan `date`.

Response:
```json
{
  "cashAccounts": [
    { "id": "acc-01", "name": "Kas Tunai Outlet", "type": "tunai", "balance": 1850000 }
  ],
  "cashTransactions": [],
  "totalCash": 1850000,
  "transactionCount": 3
}
```

`POST /cash/transactions`

Mencatat mutasi kas manual dari halaman Owner Cash. Butuh token role `owner`.

Request kas masuk/keluar/koreksi:
```json
{
  "type": "in",
  "accountId": "acc-01",
  "amount": 500000,
  "description": "Modal awal",
  "adjustmentType": "plus",
  "user": "Owner"
}
```

Request transfer antar akun:
```json
{
  "type": "transfer",
  "fromAccountId": "acc-02",
  "toAccountId": "acc-03",
  "amount": 2000000,
  "description": "Settlement QRIS",
  "user": "Owner"
}
```

Validasi backend:

- `type` valid: `in`, `out`, `transfer`, `koreksi`.
- `amount` wajib lebih dari 0.
- `description` wajib diisi.
- Transfer tidak boleh ke akun yang sama.
- Kas keluar/koreksi minus/transfer ditolak jika saldo tidak cukup.
- Mutasi ditolak `403` jika tanggal transaksi sudah punya sesi kas berstatus `closed`.

`GET /cash/expected?date=2026-05-17&openingCash=100000`

Mengambil angka kas seharusnya sebelum Partner menutup kas. Endpoint ini sudah memakai data transaksi backend, jadi frontend tidak perlu menghitung ulang.

Query:

- `date` opsional, format `YYYY-MM-DD`. Default: business date hari ini.
- `openingCash` opsional. Jika tidak dikirim, backend memakai `openingCash` dari cash session tanggal tersebut atau `0`.

Response:
```json
{
  "date": "2026-05-17",
  "openingCash": 100000,
  "openingCashSource": "query",
  "cashSales": 250000,
  "cashExpenses": 70000,
  "expectedCash": 280000,
  "salesByMethod": {
    "cash": 250000,
    "qris": 120000,
    "transfer": 0
  },
  "totalSales": 370000,
  "totalExpenseCash": 70000,
  "existingSession": {
    "date": "2026-05-17",
    "status": "open"
  },
  "canClose": true
}
```

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

Backend menghitung ulang `expectedCash` dari data transaksi dan menolak tutup kas ganda untuk tanggal yang sudah `closed`.

Response sukses `201`:
```json
{
  "cashSession": {
    "date": "2026-05-17",
    "openingCash": 100000,
    "closingCash": 280000,
    "expectedCash": 280000,
    "difference": 0,
    "differenceStatus": "balanced",
    "qris": 120000,
    "transfer": 0,
    "totalExpenseCash": 70000,
    "status": "closed",
    "notes": "Tidak ada kendala",
    "closedBy": "Partner",
    "closedAt": "2026-05-18T02:25:00.000Z"
  },
  "state": {}
}
```

Jika tanggal yang sama sudah ditutup, backend mengembalikan `409 Conflict`:
```json
{
  "error": "Kas untuk tanggal ini sudah ditutup",
  "statusCode": 409,
  "cashSession": {}
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

## AI Copilot

Endpoint Copilot sudah protected JWT. Backend memakai ringkasan data finansial server-side, jadi frontend cukup mengirim prompt dan tidak perlu menyusun konteks finansial sendiri.

`GET /copilot/insights?date=2026-05-17`

Mengambil insight feed awal untuk kartu rekomendasi/actionable insight.

Response:
```json
{
  "insights": [
    {
      "id": "stock-1",
      "type": "alert",
      "title": "Stok kritis",
      "text": "Susu UHT tersisa 2 liter, sudah di bawah batas minimum 5 liter.",
      "action": "Cek stok",
      "priority": "high"
    }
  ],
  "context": {
    "businessDate": "2026-05-17",
    "role": "owner",
    "summary": {},
    "cash": {}
  },
  "source": "local"
}
```

`POST /copilot/chat`

Request:
```json
{
  "prompt": "Berapa profit hari ini?",
  "date": "2026-05-17",
  "history": [
    { "role": "user", "text": "Ringkas performa hari ini" },
    { "role": "assistant", "text": "Omzet hari ini..." }
  ]
}
```

Field:

- `prompt` wajib, maksimal 1200 karakter.
- `date` opsional, format `YYYY-MM-DD`. Default business date hari ini.
- `history` opsional, maksimal 8 pesan terakhir akan dipakai backend.

Response:
```json
{
  "message": {
    "id": "COP-1760000000000",
    "role": "assistant",
    "text": "Estimasi laba bersih tanggal 2026-05-17 adalah Rp 180.000...",
    "createdAt": "2026-05-18T02:45:00.000Z"
  },
  "insights": [],
  "context": {
    "businessDate": "2026-05-17",
    "role": "owner",
    "summary": {},
    "cash": {}
  },
  "source": "ai"
}
```

`source` bernilai `ai` jika `AI_API_KEY` atau `OPENAI_API_KEY` tersedia dan provider berhasil menjawab. Jika belum ada API key, atau provider AI sedang gagal, backend tetap mengembalikan jawaban lokal berbasis rule dengan `source: "local"` agar frontend bisa dikembangkan dan dites. Saat provider gagal, response juga dapat berisi `providerError` dengan pesan aman untuk UI/log.
