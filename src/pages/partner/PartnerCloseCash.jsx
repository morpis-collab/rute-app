import { useState } from 'react';
import { Check } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah } from '../../utils/formatters';

export default function PartnerCloseCash() {
  const [form, setForm] = useState({ cashActual: '', qris: '120000', transfer: '0', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const { getCashExpected, closeCash } = useAppStore();
  const { user } = useAuthStore();

  const expectedCash = getCashExpected();
  const cashActual = parseInt(form.cashActual) || 0;
  const difference = cashActual - expectedCash;

  const handleSubmit = () => {
    closeCash({
      actualCash: form.cashActual,
      qris: form.qris,
      transfer: form.transfer,
      notes: form.notes,
      user: user?.name || 'Partner',
    });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 1500);
  };

  return (
    <PageWrapper title="Kas" subtitle="Tutup kas harian">
      {submitted && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-success)] text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 text-sm font-medium slide-in">
          <Check size={16} /> Kas ditutup
        </div>
      )}

      {/* Summary Tabular */}
      <div className="bg-white border border-[var(--color-border)] rounded overflow-hidden mb-4">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-[var(--color-border)]">
            <tr><td className="p-3 text-[var(--color-text-muted)]">Kas Seharusnya</td><td className="p-3 text-right font-mono font-bold text-[var(--color-accent-primary)]">{formatRupiah(expectedCash)}</td></tr>
            <tr><td className="p-3 text-[var(--color-text-muted)]">QRIS (Sistem)</td><td className="p-3 text-right font-mono">{formatRupiah(120000)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* Input Form */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Cash Fisik</label>
          <input type="number" value={form.cashActual} onChange={e => setForm({...form, cashActual: e.target.value})} placeholder="Rp 0" className="w-full p-2.5 rounded border border-[var(--color-border)] font-mono text-sm focus:outline-none focus:border-[var(--color-accent-primary)]" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Catatan Tambahan</label>
          <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Ada kendala?" className="w-full p-2.5 rounded border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent-primary)]" />
        </div>
      </div>

      {/* Difference */}
      {form.cashActual && difference !== 0 && (
        <div className="mb-4 text-sm text-center font-medium">
          Selisih: <span className={`font-mono ${difference < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}`}>{formatRupiah(Math.abs(difference))}</span>
        </div>
      )}

      <button onClick={handleSubmit} className="w-full btn btn-primary">Konfirmasi Tutup Kas</button>
    </PageWrapper>
  );
}
