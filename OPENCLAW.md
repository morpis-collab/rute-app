# OPENCLAW.md - RUTE Cash Tracer Backend Tasks

Panduan ini ditujukan untuk **OpenClaw / Codex / Morpis** yang bertugas menangani sisi Backend, Arsitektur Database, dan Logika Bisnis dari RUTE Cash Tracer.

## Status Proyek Saat Ini (Fase MVP Selesai)
- Integrasi UI Frontend (Antigravity) dan Backend (OpenClaw) untuk fitur utama (Dashboard, Pengeluaran Manual, Koreksi Stok, dan Pembuatan Menu Baru) telah **selesai 100% dan berhasil diuji**.
- *Database* JSON lokal berfungsi dengan baik untuk melacak *Stock Movements* dan menghitung HPP (Harga Pokok Penjualan) secara dinamis dengan metode rata-rata tertimbang (*weighted average*).

## Fokus Pengembangan Selanjutnya (Fase 2)

Tugas OpenClaw berikutnya adalah mematangkan backend agar siap di-*deploy* ke *production* dan mengimplementasikan fitur-fitur tingkat lanjut. 

Berikut adalah prioritas tugas untuk Anda:

### 1. Sistem Autentikasi Nyata (JWT / Session)
- Saat ini `POST /api/auth/login` hanya menerima `role` dan langsung memberikan akses (simulasi).
- **Tugas:** Implementasikan autentikasi sungguhan menggunakan JWT (JSON Web Tokens) atau berbasis *session*.
- Buat skema *users* yang solid di *database* (Owner & Partner) dengan kombinasi PIN atau *password*.
- Lindungi (*protect*) semua *endpoint* operasional agar membutuhkan token otorisasi di *headers*.

### 2. Integrasi AI Copilot Asli (LLM)
- Frontend telah memiliki UI untuk "AI Copilot / Assistant", tetapi masih menggunakan teks statis.
- **Tugas:** Buat *endpoint* baru (misal: `POST /api/copilot/chat`) yang menerima pesan *prompt* dari *frontend*.
- Hubungkan *endpoint* ini dengan API LLM sungguhan (Gemini / Claude / OpenAI).
- **Konteks:** *Endpoint* ini harus menyisipkan ringkasan data finansial terbaru (penjualan hari ini, stok kritis, tren laba) ke dalam *system prompt* LLM agar AI bisa menjawab pertanyaan terkait bisnis RUTE dengan akurat.

### 3. Pematangan Modul Tutup Kas
- Perkuat endpoint `POST /api/cash/close`.
- Tambahkan validasi lebih ketat terkait selisih (*difference*) uang tunai.
- Pastikan logika perhitungan sisa uang (*expected cash*) sinkron sempurna dengan total penjualan tunai, pengeluaran kas tunai, dan modal awal.

### 4. Persiapan Deployment (Production Ready)
- Siapkan pengaturan *Environment Variables* (`.env`) yang matang untuk *Production* (seperti `RUTE_CORS_ORIGIN`, `JWT_SECRET`, `AI_API_KEY`, dll).
- Pastikan konfigurasi *CORS* aman.
- Ganti/siapkan adaptor penyimpanan (jika diperlukan) apabila File-Based JSON Database (`rute-db.json`) dinilai rentan terhadap masalah konkurensi di *hosting* seperti Render/Railway (opsional, tergantung keputusan arsitektur hosting).

## Aturan Kolaborasi
- Pertahankan kontrak API yang sudah berjalan dengan Antigravity. Jika ada perubahan pada format *Response*, pastikan Anda mendokumentasikannya atau memperbarui `docs/backend-api.md`.
- Jaga *codebase* tetap bersih dan efisien. Gunakan port `4322` atau baca secara dinamis melalui `.env` agar tidak bertabrakan dengan layanan lain di mesin lokal.

Selamat bekerja, OpenClaw!
