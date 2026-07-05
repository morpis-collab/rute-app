# Task 7: Pengeluaran (Expenses) Page Implementation Report

## Perubahan yang Dilakukan

Kami telah menulis ulang halaman `OwnerExpenses.jsx` dan modal `ExpenseModal.jsx` untuk menyesuaikan dengan design system (Sage Green theme), menyamakan pemanggilan store dengan state Zustand terbaru (`wallets`, `categories.expense`, `ingredients`), serta menambahkan fitur-fitur baru berikut:

### 1. `src/pages/owner/OwnerExpenses.jsx`
*   **Penyegaran Filter Pengeluaran:**
    *   Input pencarian teks pencocokan pada deskripsi/catatan, kategori, serta nama wallet.
    *   Filter rentang tanggal (Mulai Tanggal s.d. Sampai Tanggal).
    *   Filter dropdown Dompet / Sumber Dana.
    *   Seluruh input filter menggunakan `.form-input` dan `.form-select` dengan tinggi minimal 44px (padding `p-3`).
*   **Daftar Pengeluaran:**
    *   Menampilkan data pengeluaran dengan format mata uang rupiah dan tanggal singkat Indonesia.
    *   Detail bahan baku terhubung ditampilkan secara rapi jika pengeluaran merupakan kategori "Pembelian Bahan Baku".
    *   Menyediakan tombol "Edit" dan "Hapus" yang muncul pada area ekspansi item pengeluaran.
*   **Operasi CRUD:**
    *   Delete: memanggil `deleteExpense(id)` dari Zustand store dengan pesan konfirmasi (`window.confirm`).
    *   Edit: memuat data pengeluaran yang dipilih ke modal, lalu memanggil `updateExpense(id, data)` saat formulir disimpan.

### 2. `src/components/shared/ExpenseModal.jsx`
*   **Formulir Input:**
    *   Catatan (Text field).
    *   Nominal Rp (Number field).
    *   Tanggal (Date picker dengan dukungan backdating).
    *   Kategori (Dropdown berisi data dari `categories.expense`).
    *   Dompet / Sumber Dana (Dropdown berisi opsi dari `wallets` store).
*   **Integrasi Master Bahan Baku:**
    *   Jika kategori yang dipilih adalah "Pembelian Bahan Baku" (menggunakan pencocokan case-insensitive), modal akan memunculkan bagian opsional "Hubungkan ke Master Bahan".
    *   Jika diaktifkan, owner dapat memilih bahan baku dari `ingredients` dan memasukkan kuantitas (Qty).
    *   Saat disimpan, jika data bahan baku terhubung, data `purchasedIngredients` akan dikompilasi secara otomatis menjadi `[{ ingredientId, qty: Number(qty), price: Number(amount / qty) }]`.
*   **Kesesuaian Desain & Touch Targets:**
    *   Tinggi touch target untuk seluruh input, select, dan tombol di dalam modal minimal 44px (padding `p-3`).
    *   Seluruh pengiriman modal dibungkus dalam blok `try/catch` untuk mencegah penutupan modal jika terjadi kegagalan pemanggilan API.

### 3. `scripts/expense-stock-reconciliation-test.mjs`
*   Memperbarui payload pengeluaran pada script testing agar menyertakan parameter `walletId` (misal: `'acc-bahan-baku'`) guna memenuhi aturan validasi skema data pada backend RUTE.

---

## Perbaikan Berdasarkan Ulasan Reviewer (5 Juli 2026)

Kami telah menerapkan perbaikan berikut pada komponen frontend pengeluaran:

1. **Penerjemahan & Lokalisasi Bahasa (Bahasa Indonesia):**
   * Mengubah `'Pilih Wallet'` menjadi `'Pilih Dompet'` pada dropdown pilihan sumber dana di `ExpenseModal.jsx`.
   * Mengubah `'Wallet wajib dipilih'` menjadi `'Dompet wajib dipilih'` pada validasi form di `ExpenseModal.jsx`.
   * Mengubah `'Unknown Wallet'` menjadi `'Dompet Tidak Dikenal'` pada helper `getWalletLabel` di `OwnerExpenses.jsx`.

2. **Penyempurnaan Bagian "Hubungkan ke Master Bahan" di `ExpenseModal.jsx`:**
   * **Satuan (Unit) Read-Only**: Menambahkan input read-only untuk menampilkan satuan (unit) dari bahan baku yang sedang dipilih (contoh: `gram`, `pcs`).
   * **Total Harga Bahan (Total Price)**: Menambahkan input angka untuk total harga khusus bahan baku ini. Input ini diinisialisasi secara dinamis dengan nominal pengeluaran utama (`amount`) dan tetap sinkron jika nominal utama berubah (selama pengguna belum mengubah total harga bahan baku secara manual). Pengguna bebas mengubah nilai ini jika pengeluaran utama mencakup item lain selain bahan baku tersebut.
   * **Harga per Satuan (Price per Unit) Read-Only**: Menambahkan tampilan read-only yang menghitung otomatis `Total Harga Bahan / Qty` secara real-time di layar.
   * **Proteksi Pembagian Nol & NaN**: Menambahkan pengecekan defensif `qty > 0` sebelum melakukan pembagian harga per unit untuk menghindari kesalahan pembagian dengan nol atau nilai `NaN`.
   * **Payload API yang Akurat**: Mengirimkan parameter `price` (harga per satuan bahan baku) dalam `purchasedIngredients` berdasarkan kalkulasi harga per satuan di atas, bukan lagi menggunakan total nominal pengeluaran utama.

---

## Verifikasi dan Pengujian

*   **Pemeriksaan Build:** Menjalankan command `npm run build` dan berhasil dikompilasi dengan sukses tanpa kendala (Built in 673ms).
*   **Pemeriksaan Linter:** Menjalankan command `npm run lint` dan berhasil lulus (0 error, 1 warning tidak relevan pada berkas lain).
*   **Pengujian Owner-Only:** Menjalankan command `npm run test:owner-only` dan semuanya dinyatakan lolos (Owner-only check passed).

---

## Catatan dan Perhatian (Concerns)

1.  **Test Suite (Codex Scope):**
    *   `test:smoke` saat ini gagal karena kegagalan endpoint `/api/cash/expected` (mengembalikan 404). Endpoint ini belum diimplementasikan di Express server backend atau router belum terdaftar.
    *   Pengujian `expense-stock-reconciliation-test.mjs` gagal pada tahap pencarian data karena endpoint backend `/api/expenses/:id/stock-items` yang dicari oleh pengujian tidak ditemukan/tidak terdaftar di berkas `server/index.js`.
    *   Sesuai dengan pembagian peran kerja di `AGENTS.md`, perbaikan endpoint server, router, dan pengujian API backend adalah tugas dari agen **Codex**. Kami merekomendasikan Codex untuk mengintegrasikan endpoint tersebut sesuai kontrak dokumentasi `docs/backend-api.md`.
