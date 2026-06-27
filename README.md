# RUTE Coffee Management System

Sistem manajemen operasional RUTE Coffee untuk pemilik (*owner*) sebagai satu panel kerja outlet. Aplikasi ini bukan sekadar *landing page*, melainkan **dashboard operasional** lengkap dengan pencatatan kas, penjualan, inventaris, hingga kecerdasan buatan (*AI Copilot*).

## Tech Stack
- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 (Sage Green Design System)
- **Animation**: Framer Motion
- **State Management**: Zustand 5
- **Icons**: Lucide React
- **Charts**: Recharts 3
- **Font**: Plus Jakarta Sans + Fraunces (display) + JetBrains Mono (angka)
- **Backend**: Express 5 (server lokal di `server/`)
- **PWA**: vite-plugin-pwa

## Modul Fungsional Utama
Aplikasi ini berjalan owner-only, dengan layout desktop untuk dashboard dan input operasional yang tetap nyaman dipakai di HP.

- **Dashboard & Laporan**: Laba, rugi, HPP, omzet.
- **Manajemen Kas Aktif**: Pencatatan kas masuk, keluar, dan transfer antar rekening.
- **Recipe Builder**: Pembuatan menu dengan kalkulasi Harga Pokok Penjualan (HPP) otomatis.
- **Activity Log**: Fitur audit untuk melacak jejak aktivitas operasional.
- **AI Copilot**: Analisis performa bisnis melalui *prompt chat*.
- **Upload Resi AI**: Unggah foto resi belanja, dengan AI mengekstrak data item yang kemudian dikonfirmasi dan dipetakan (*mapping*) ke stok bahan baku.
- **Tutup Kas Harian**: Rekonsiliasi kas sistem dengan fisik (tunai & digital).
- **Catatan Operasional**: Jurnal log kondisi outlet.

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

*Frontend + Backend dikembangkan oleh tim AI (Antigravity, Codex).*
