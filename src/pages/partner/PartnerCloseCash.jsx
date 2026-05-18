import { useState, useEffect } from 'react';
import { Check, Loader2, AlertTriangle } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAuthStore from '../../store/useAuthStore';
import { getCashExpected, postCashClose } from '../../services/apiClient';
import { formatRupiah } from '../../utils/formatters';

export default function PartnerCloseCash() {
  const [form, setForm] = useState({ cashActual: '', qris: '0', transfer: '0', notes: '' });
  const [status, setStatus] = useState('loading'); // loading, ready, closed, error
  const [message, setMessage] = useState('');
  const [expectedData, setExpectedData] = useState(null);
  
  const { user } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function fetchExpected() {
      try {
        setStatus('loading');
        const data = await getCashExpected(today, 100000); 
        
        if (!data.canClose && data.existingSession) {
          setStatus('closed');
          setMessage('Kas untuk hari ini sudah ditutup.');
          return;
        }
        
        setExpectedData(data);
        setForm(prev => ({ 
          ...prev, 
          qris: data.salesByMethod?.qris || 0,
          transfer: data.salesByMethod?.transfer || 0 
        }));
        setStatus('ready');
      } catch {
        setStatus('error');
        setMessage('Gagal mengambil data kas dari server.');
      }
    }
    fetchExpected();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expectedCash = expectedData?.expectedCash || 0;
  const cashActual = parseInt(form.cashActual) || 0;
  const difference = cashActual - expectedCash;

  const handleSubmit = async () => {
    if (cashActual === 0) {
      setMessage('Cash Fisik (actualCash) harus diisi.');
      return;
    }
    
    try {
      setStatus('loading');
      await postCashClose({
        actualCash: cashActual,
        openingCash: 100000,
        qris: parseInt(form.qris) || 0,
        transfer: parseInt(form.transfer) || 0,
        notes: form.notes,
        user: user?.name || 'Partner',
      });
      setStatus('closed');
      setMessage('✅ Kas berhasil ditutup.');
    } catch (err) {
      setStatus('ready');
      if (err.response?.status === 409) {
        setStatus('closed');
        setMessage('Kas hari ini sudah ditutup.');
      } else {
        setMessage(err.response?.data?.message || 'Gagal menutup kas.');
      }
    }
  };

  if (status === 'loading') {
    return (
      <PageWrapper title="Kas" subtitle="Tutup kas harian">
        <div className="flex flex-col items-center justify-center h-64 text-[var(--color-text-muted)] gap-3">
          <Loader2 size={32} className="animate-spin" />
          <p>Memuat data kas...</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Kas" subtitle="Tutup kas harian">
      {(status === 'closed' || status === 'error') && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
          status === 'closed' 
            ? message.includes('✅') 
              ? 'bg-[var(--color-band-4)] border-[var(--color-band-3)] text-[var(--color-text-primary)]' 
              : 'bg-white border-[var(--color-border)] text-[var(--color-text-secondary)]'
            : 'bg-red-50 border-[var(--color-accent-red)] text-red-700'
        }`}>
          {status === 'closed' ? <Check className={message.includes('✅') ? "text-[var(--color-accent-green)]" : ""} /> : <AlertTriangle />}
          <div className="font-medium text-sm">{message}</div>
        </div>
      )}

      {status === 'ready' && message && (
        <div className="mb-4 text-sm text-[var(--color-accent-red)] slide-in text-center">
          ⚠️ {message}
        </div>
      )}

      {expectedData && status !== 'error' && (
        <>
          {/* Summary Tabular */}
          <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden mb-6 shadow-sm">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-[var(--color-border)]">
                <tr><td className="p-3 text-[var(--color-text-muted)]">Kas Seharusnya</td><td className="p-3 text-right font-mono font-bold text-[var(--color-text-primary)]">{formatRupiah(expectedCash)}</td></tr>
                <tr><td className="p-3 text-[var(--color-text-muted)]">QRIS (Sistem)</td><td className="p-3 text-right font-mono">{formatRupiah(form.qris)}</td></tr>
              </tbody>
            </table>
          </div>

          {/* Input Form */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">Cash Fisik (Laci Kasir)</label>
              <input type="number" disabled={status === 'closed'} value={form.cashActual} onChange={e => setForm({...form, cashActual: e.target.value})} placeholder="Rp 0" className="w-full p-3 rounded-xl border border-[var(--color-border)] font-mono focus:outline-none focus:border-[var(--color-band-1)] disabled:bg-gray-50" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--color-text-secondary)] mb-1 block">Catatan Tambahan</label>
              <input type="text" disabled={status === 'closed'} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Ada selisih atau kendala?" className="w-full p-3 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-band-1)] disabled:bg-gray-50" />
            </div>
          </div>

          {/* Difference */}
          {form.cashActual && difference !== 0 && status === 'ready' && (
            <div className="mb-6 text-sm text-center font-medium">
              Selisih: <span className={`font-mono font-bold ${difference < 0 ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-accent-green)]'}`}>{formatRupiah(Math.abs(difference))}</span>
            </div>
          )}

          <button 
            onClick={handleSubmit} 
            disabled={status === 'closed'} 
            className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex justify-center items-center gap-2 ${
              status === 'closed' 
                ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed'
                : 'bg-gradient-to-r from-[var(--color-band-1)] to-[var(--color-band-2)] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
            }`}
          >
            {status === 'closed' ? 'Kas Sudah Ditutup' : 'Konfirmasi Tutup Kas'}
          </button>
        </>
      )}
    </PageWrapper>
  );
}
