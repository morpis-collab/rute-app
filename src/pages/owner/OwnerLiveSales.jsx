import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatWaktu } from '../../utils/formatters';

export default function OwnerLiveSales() {
  const { getTodaySales, getSalesSummary } = useAppStore();
  const summary = getSalesSummary();
  const todaySales = getTodaySales();
  return (
    <PageWrapper title="Live Penjualan" subtitle="Transaksi masuk hari ini">
      <div className="glass-card bg-white/70 p-5 rounded-2xl border border-[var(--color-border)] shadow-sm mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="pb-2 border-b border-[var(--color-border)]">
            <p className="text-[10px] uppercase text-[var(--color-text-muted)] font-extrabold tracking-wider mb-1">Cash / Tunai</p>
            <p className="text-lg font-mono font-black text-[var(--color-band-1)]">{formatRupiah(summary.byMethod.cash)}</p>
          </div>
          <div className="pb-2 border-b border-[var(--color-border)]">
            <p className="text-[10px] uppercase text-[var(--color-text-muted)] font-extrabold tracking-wider mb-1">QRIS</p>
            <p className="text-lg font-mono font-black text-amber-600">{formatRupiah(summary.byMethod.qris)}</p>
          </div>
          <div className="pb-2 border-b border-[var(--color-border)]">
            <p className="text-[10px] uppercase text-[var(--color-text-muted)] font-extrabold tracking-wider mb-1">Transfer Bank</p>
            <p className="text-lg font-mono font-black text-blue-600">{formatRupiah(summary.byMethod.transfer)}</p>
          </div>
        </div>
      </div>

      <div className="glass-card bg-white/70 p-0 overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-sm">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-24">Waktu</th>
              <th>Menu / Items</th>
              <th className="w-24">Metode</th>
              <th className="text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...todaySales].reverse().map(trx => (
              <tr key={trx.id}>
                <td className="font-mono text-xs font-bold text-[var(--color-text-muted)]">{formatWaktu(trx.date)}</td>
                <td className="font-semibold text-[var(--color-text-primary)]">{trx.items.map(i => `${i.name} (x${i.qty})`).join(', ')}</td>
                <td>
                  <span className="badge badge-info uppercase tracking-wider text-[9px]">
                    {trx.paymentMethod}
                  </span>
                </td>
                <td className="text-right font-mono font-bold text-[var(--color-band-1)]">{formatRupiah(trx.total)}</td>
              </tr>
            ))}
            {todaySales.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-xs text-[var(--color-text-muted)] font-bold">
                  Belum ada transaksi hari ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}
