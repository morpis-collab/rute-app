import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatWaktu } from '../../utils/formatters';

export default function OwnerLiveSales() {
  const { getTodaySales, getSalesSummary } = useAppStore();
  const summary = getSalesSummary();
  const todaySales = getTodaySales();
  return (
    <PageWrapper title="Live Transactions" subtitle="Hari ini">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase text-[var(--color-text-muted)] font-semibold mb-1">Cash</p>
          <p className="text-lg font-mono">{formatRupiah(summary.byMethod.cash)}</p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase text-[var(--color-text-muted)] font-semibold mb-1">QRIS</p>
          <p className="text-lg font-mono">{formatRupiah(summary.byMethod.qris)}</p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase text-[var(--color-text-muted)] font-semibold mb-1">Transfer</p>
          <p className="text-lg font-mono">{formatRupiah(summary.byMethod.transfer)}</p>
        </div>
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAFAFA] border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="p-3 font-medium w-20">Waktu</th>
              <th className="p-3 font-medium">Items</th>
              <th className="p-3 font-medium w-24">Metode</th>
              <th className="p-3 font-medium text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {[...todaySales].reverse().map(trx => (
              <tr key={trx.id}>
                <td className="p-3 font-mono text-[var(--color-text-muted)] text-xs">{formatWaktu(trx.date)}</td>
                <td className="p-3 text-[var(--color-text-secondary)]">{trx.items.map(i => `${i.name} x${i.qty}`).join(', ')}</td>
                <td className="p-3"><span className="text-[10px] uppercase px-1.5 py-0.5 border border-[var(--color-border)] rounded text-[var(--color-text-muted)]">{trx.paymentMethod}</span></td>
                <td className="p-3 text-right font-mono font-medium">{formatRupiah(trx.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}
