import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAuthStore from '../../store/useAuthStore';
import { getCashExpected, postCashClose } from '../../services/apiClient';
import { formatRupiah } from '../../utils/formatters';

const cashSourceLabel = {
  openingCapital: 'Modal awal usaha',
  cashSession: 'Sesi kas tersimpan',
  query: 'Override manual',
  default: 'Tanpa kas awal',
};

export default function PartnerCloseCash() {
  const getPastDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toLocaleDateString('en-CA'));
    }
    return dates;
  };

  const pastDates = getPastDates();
  const [selectedDate, setSelectedDate] = useState(pastDates[0]);
  const [form, setForm] = useState({ cashActual: '', qris: '0', transfer: '0', notes: '' });
  const [status, setStatus] = useState('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [expectedData, setExpectedData] = useState(null);

  const { user } = useAuthStore();

  useEffect(() => {
    async function fetchExpected() {
      try {
        setStatus('loading');
        setMessage('');
        const data = await getCashExpected(selectedDate);

        setExpectedData(data);
        setForm((prev) => ({
          ...prev,
          cashActual: data.existingSession?.closingCash != null ? String(data.existingSession.closingCash) : '',
          qris: data.existingSession != null ? data.existingSession.qris : (data.salesByMethod?.qris || 0),
          transfer: data.existingSession != null ? data.existingSession.transfer : (data.salesByMethod?.transfer || 0),
          notes: data.existingSession?.notes || '',
        }));

        if (!data.canClose && data.existingSession) {
          setStatus('closed');
          setMessage(`Kas untuk tanggal ${selectedDate} sudah ditutup.`);
          return;
        }

        setStatus('ready');
      } catch {
        setStatus('error');
        setMessage('Gagal mengambil data kas dari server.');
      }
    }

    fetchExpected();
  }, [selectedDate]);

  const expectedCash = Number(expectedData?.expectedCash || 0);
  const cashActual = Number(form.cashActual || 0);
  const difference = cashActual - expectedCash;
  const openingCashSource = cashSourceLabel[expectedData?.openingCashSource] || cashSourceLabel.default;

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!expectedData) {
      setMessage('Data kas sistem belum siap.');
      return;
    }
    if (form.cashActual === '') {
      setMessage('Cash fisik wajib diisi.');
      return;
    }
    if (cashActual < 0) {
      setMessage('Cash fisik tidak boleh negatif.');
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage('');
      await postCashClose({
        date: expectedData.date,
        actualCash: cashActual,
        qris: Number(form.qris || 0),
        transfer: Number(form.transfer || 0),
        notes: form.notes,
        user: user?.name || 'Partner',
      });
      setStatus('closed');
      setMessage('Kas berhasil ditutup.');
    } catch (err) {
      setStatus('ready');
      if (err.response?.status === 409) {
        setStatus('closed');
        setMessage('Kas hari ini sudah ditutup.');
      } else {
        setMessage(err.response?.data?.error || err.response?.data?.message || 'Gagal menutup kas.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <PageWrapper title="Kas" subtitle="Tutup kas harian">
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-[var(--color-text-muted)]">
          <Loader2 size={32} className="animate-spin" />
          <p>Memuat data kas...</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Kas" subtitle="Tutup kas harian">
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[#faf6ef] p-4 flex flex-col gap-2">
        <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">Pilih Tanggal Kas</label>
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-[var(--color-border)] p-2.5 text-sm bg-white focus:outline-none focus:border-[var(--color-band-1)]"
        >
          {pastDates.map((date, idx) => (
            <option key={date} value={date}>
              {idx === 0 ? `Hari Ini (${date})` : idx === 1 ? `Kemarin (${date})` : `${date}`}
            </option>
          ))}
        </select>
      </div>

      {(status === 'closed' || status === 'error') && (
        <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
          status === 'closed'
            ? message.includes('berhasil')
              ? 'border-[var(--color-band-3)] bg-[var(--color-band-4)] text-[var(--color-text-primary)]'
              : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]'
            : 'border-[var(--color-accent-red)] bg-red-50 text-red-700'
        }`}>
          {status === 'closed' ? <Check className={message.includes('berhasil') ? 'text-[var(--color-accent-green)]' : ''} /> : <AlertTriangle />}
          <div className="text-sm font-medium">{message}</div>
        </div>
      )}

      {status === 'ready' && message && (
        <div className="slide-in mb-4 text-center text-sm text-[var(--color-accent-red)]">
          {message}
        </div>
      )}

      {expectedData && status !== 'error' && (
        <>
          <div className="mb-6 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-[var(--color-border)]">
                <tr>
                  <td className="p-3 text-[var(--color-text-muted)]">Tanggal Kas</td>
                  <td className="p-3 text-right font-mono font-semibold">{expectedData.date}</td>
                </tr>
                <tr>
                  <td className="p-3 text-[var(--color-text-muted)]">
                    Kas Awal
                    <div className="text-[11px] text-[var(--color-text-muted)]">{openingCashSource}</div>
                  </td>
                  <td className="p-3 text-right font-mono">{formatRupiah(expectedData.openingCash || 0)}</td>
                </tr>
                <tr>
                  <td className="p-3 text-[var(--color-text-muted)]">Penjualan Tunai</td>
                  <td className="p-3 text-right font-mono">{formatRupiah(expectedData.cashSales || 0)}</td>
                </tr>
                <tr>
                  <td className="p-3 text-[var(--color-text-muted)]">Pengeluaran Tunai</td>
                  <td className="p-3 text-right font-mono">{formatRupiah(expectedData.cashExpenses || 0)}</td>
                </tr>
                <tr>
                  <td className="p-3 text-[var(--color-text-muted)]">Kas Seharusnya</td>
                  <td className="p-3 text-right font-mono font-bold text-[var(--color-text-primary)]">{formatRupiah(expectedCash)}</td>
                </tr>
                <tr>
                  <td className="p-3 text-[var(--color-text-muted)]">QRIS Sistem</td>
                  <td className="p-3 text-right font-mono">{formatRupiah(form.qris)}</td>
                </tr>
                <tr>
                  <td className="p-3 text-[var(--color-text-muted)]">Transfer Sistem</td>
                  <td className="p-3 text-right font-mono">{formatRupiah(form.transfer)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Cash Fisik (Laci Kasir)</label>
              <input
                type="number"
                min="0"
                disabled={status === 'closed'}
                value={form.cashActual}
                onChange={(event) => updateForm('cashActual', event.target.value)}
                placeholder="Rp 0"
                className="w-full rounded-xl border border-[var(--color-border)] p-3 font-mono focus:border-[var(--color-band-1)] focus:outline-none disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Catatan Tambahan</label>
              <input
                type="text"
                disabled={status === 'closed'}
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
                placeholder="Ada selisih atau kendala?"
                className="w-full rounded-xl border border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-band-1)] focus:outline-none disabled:bg-gray-50"
              />
            </div>
          </div>

          {form.cashActual !== '' && difference !== 0 && status === 'ready' && (
            <div className="mb-6 text-center text-sm font-medium">
              Selisih: <span className={`font-mono font-bold ${difference < 0 ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-accent-green)]'}`}>{formatRupiah(Math.abs(difference))}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={status === 'closed' || isSubmitting}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all duration-200 ${
              status === 'closed' || isSubmitting
                ? 'cursor-not-allowed bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                : 'bg-gradient-to-r from-[var(--color-band-1)] to-[var(--color-band-2)] text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl'
            }`}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {status === 'closed' ? 'Kas Sudah Ditutup' : isSubmitting ? 'Menutup Kas...' : 'Konfirmasi Tutup Kas'}
          </button>
        </>
      )}
    </PageWrapper>
  );
}
