# RUTE Coffee Management System

Sistem manajemen operasional RUTE Coffee yang dirancang untuk menjembatani operasional harian dan pemantauan pemilik (*owner*). Aplikasi ini bukan sekadar *landing page*, melainkan **dashboard operasional** lengkap dengan pencatatan kas, penjualan, inventaris, hingga kecerdasan buatan (*AI Copilot*).

## Tech Stack (Frontend)
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4 (Warm Coffee Design System)
- **State Management**: Zustand
- **Icons**: Lucide React
- **Charts**: Recharts
- **Font**: Plus Jakarta Sans

## Modul Fungsional Utama
Aplikasi ini memiliki *role-based access* untuk 2 pihak:

### 1. Owner (Desktop-First)
- **Dashboard & Laporan**: Laba, rugi, HPP, omzet.
- **Manajemen Kas Aktif**: Pencatatan kas masuk, keluar, dan transfer antar rekening.
- **Recipe Builder**: Pembuatan menu dengan kalkulasi Harga Pokok Penjualan (HPP) otomatis.
- **Activity Log**: Fitur audit untuk melacak jejak aktivitas operator.
- **AI Copilot**: Analisis performa bisnis melalui *prompt chat*.

### 2. Partner / Operator (Mobile-First)
- **Penjualan Cepat**: Mesin POS sederhana yang terhubung langsung ke pengurangan stok resep.
- **Upload Resi AI**: Unggah foto resi belanja, dengan AI mengekstrak data item yang kemudian dikonfirmasi dan dipetakan (*mapping*) ke stok bahan baku.
- **Tutup Kas Harian**: Rekonsiliasi kas sistem dengan fisik (tunai & digital).
- **Catatan Harian**: Jurnal log operasional.

## Cara Menjalankan (Development)
```bash
# 1. Install dependencies
npm install

# 2. Jalankan backend API
npm run api

# 3. Jalankan frontend di terminal terpisah
npm run dev

# 4. Akses melalui browser (biasanya http://localhost:5174)
```

Backend lokal berjalan di `http://localhost:4321` dan Vite akan proxy request `/api` ke server tersebut.

## Cara Build (Production)
```bash
npm run build
```

*Frontend prototype ini dikembangkan oleh Antigravity.*
