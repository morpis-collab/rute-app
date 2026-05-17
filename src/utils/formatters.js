/**
 * Format nominal Rupiah: Rp 10.000
 */
export function formatRupiah(amount) {
  if (amount == null) return 'Rp 0';
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

/**
 * Format tanggal Indonesia: "17 Mei 2026"
 */
export function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format tanggal singkat: "17 Mei"
 */
export function formatTanggalSingkat(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format waktu: "14:30"
 */
export function formatWaktu(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format persentase: "32%"
 */
export function formatPersen(value, decimals = 0) {
  if (value == null) return '0%';
  return Number(value).toFixed(decimals) + '%';
}

/**
 * Format unit stok: "500 gram", "12 pcs"
 */
export function formatUnit(amount, unit) {
  if (amount == null) return '-';
  return `${Number(amount).toLocaleString('id-ID')} ${unit}`;
}

/**
 * Greeting berdasarkan waktu
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}
