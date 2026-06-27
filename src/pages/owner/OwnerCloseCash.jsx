import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAuthStore from '../../store/useAuthStore';
import useAppStore from '../../store/useAppStore';
import { getCashExpected, postCashClose, postCashOpen } from '../../services/apiClient';
import { formatRupiah } from '../../utils/formatters';

const BUSINESS_TIME_ZONE = 'Asia/Makassar';

const cashSourceLabel = {
  openingCapital: 'Modal awal usaha',
  cashSession: 'Sesi kas tersimpan',
  query: 'Override manual',
  default: 'Uang kembalian bawaan (Rp 100.000)',
};

const drawerAccountIds = new Set(['acc-01', 'kas-utama']);
const vaultAccountIds = new Set(['acc-brankas', 'kas-brankas']);

const isDrawerAccount = (account) => drawerAccountIds.has(String(account?.id || ''));
const isPhysicalCashAccount = (account) => ['cash', 'tunai'].includes(String(account?.type || '').toLowerCase());

const getDefaultCashSourceId = (accounts) => (
  accounts.find((account) => vaultAccountIds.has(String(account.id)))?.id || accounts[0]?.id || ''
);

export default function OwnerCloseCash() {
  const pastDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toLocaleDateString('en-CA', { timeZone: BUSINESS_TIME_ZONE }));
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = useState(pastDates[0]);
  const [form, setForm] = useState({ cashActual: '', cashSourceAccountId: '', qris: '0', transfer: '0', notes: '' });
  const [status, setStatus] = useState('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [expectedData, setExpectedData] = useState(null);

  const { user } = useAuthStore();
  const cashAccounts = useAppStore((state) => state.cashAccounts);
  const loadRemoteData = useAppStore((state) => state.loadRemoteData);
  const cashSourceOptions = cashAccounts.filter((account) => (
    account?.status !== 'inactive'
    && isPhysicalCashAccount(account)
    && !isDrawerAccount(account)
  ));
  const defaultCashSourceId = getDefaultCashSourceId(cashSourceOptions);
  const selectedCashSourceId = form.cashSourceAccountId || defaultCashSourceId;

  useEffect(() => {
    async function fetchExpected() {
      try {
        setStatus('loading');
        setMessage('');
        const data = await getCashExpected(selectedDate);

        setExpectedData(data);

        if (!data.existingSession) {
          setStatus('not_opened');
          setForm((prev) => ({
            ...prev,
            cashActual: '100000', // Saran modal awal di input field
            cashSourceAccountId: prev.cashSourceAccountId || defaultCashSourceId,
            qris: '0',
            transfer: '0',
            notes: '',
          }));
          return;
        }

        setForm((prev) => ({
          ...prev,
          cashActual: data.existingSession?.closingCash != null ? String(data.existingSession.closingCash) : '',
          cashSourceAccountId: data.existingSession?.openingCashSourceAccountId || prev.cashSourceAccountId || defaultCashSourceId,
          qris: data.existingSession != null ? String(data.existingSession.qris) : String(data.salesByMethod?.qris || 0),
          transfer: data.existingSession != null ? String(data.existingSession.transfer) : String(data.salesByMethod?.transfer || 0),
          notes: data.existingSession?.notes || '',
        }));

        if (data.existingSession?.status === 'closed') {
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
  }, [defaultCashSourceId, selectedDate]);

  const expectedCash = Number(expectedData?.expectedCash || 0);
  const cashActual = Number(form.cashActual || 0);
  const difference = cashActual - expectedCash;
  const selectedCashSource = cashSourceOptions.find((account) => String(account.id) === String(selectedCashSourceId));
  const openingCashSource = expectedData?.openingCashSourceAccountName
    ? `Diambil dari ${expectedData.openingCashSourceAccountName}`
    : cashSourceLabel[expectedData?.openingCashSource] || cashSourceLabel.default;

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleOpenCash = async () => {
    if (form.cashActual === '') {
      setMessage('Modal awal wajib diisi.');
      return;
    }
    const val = Number(form.cashActual);
    if (val < 0) {
      setMessage('Modal awal tidak boleh negatif.');
      return;
    }
    if (cashSourceOptions.length && !selectedCashSourceId) {
      setMessage('Sumber kas untuk uang laci wajib dipilih.');
      return;
    }
    if (selectedCashSource && Number(selectedCashSource.balance || 0) < val) {
      setMessage(`Saldo ${selectedCashSource.name} tidak cukup untuk modal awal ${formatRupiah(val)}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage('');
      await postCashOpen({
        date: selectedDate,
        openingCash: val,
        sourceCashAccountId: selectedCashSourceId || undefined,
        user: user?.name || 'Owner',
      });
      await loadRemoteData();
      // Reload expected data and update to open state
      const data = await getCashExpected(selectedDate);
      setExpectedData(data);
      setStatus('ready');
      setForm((prev) => ({
        ...prev,
        cashActual: '',
        cashSourceAccountId: data.existingSession?.openingCashSourceAccountId || selectedCashSourceId,
        qris: String(data.salesByMethod?.qris || 0),
        transfer: String(data.salesByMethod?.transfer || 0),
        notes: '',
      }));
    } catch (err) {
      setMessage(err.response?.data?.error || 'Gagal membuka kas.');
    } finally {
      setIsSubmitting(false);
    }
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
        user: user?.name || 'Owner',
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

  if (status === 'not_opened') {
    return (
      <PageWrapper title="Kas" subtitle="Buka kasir harian">
        <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-cream-light p-4 flex flex-col gap-2">
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

        {message && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border p-4 border-[var(--color-accent-red)] bg-red-50 text-red-700">
            <AlertTriangle className="flex-shrink-0" />
            <div className="text-sm font-medium">{message}</div>
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
          <div className="mb-5">
            <label className="mb-2 block text-sm font-bold text-[var(--color-text-secondary)]">Sumber Kas untuk Uang Laci</label>
            {cashSourceOptions.length ? (
              <>
                <select
                  value={selectedCashSourceId}
                  onChange={(event) => updateForm('cashSourceAccountId', event.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-3.5 text-sm font-semibold text-[var(--color-text-primary)] focus:border-[var(--color-band-1)] focus:outline-none disabled:bg-gray-50"
                >
                  {cashSourceOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - saldo {formatRupiah(account.balance || 0)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                  Pilih akun kas yang uangnya diambil untuk mengisi laci kasir.
                </p>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-cream-light p-3 text-sm text-[var(--color-text-muted)]">
                Belum ada akun sumber kas selain laci. Owner bisa menambahkan atau mengaktifkan Brankas di Kas Usaha.
              </div>
            )}
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-bold text-[var(--color-text-secondary)]">Modal Awal Laci (Uang Kembalian)</label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-sm font-semibold text-[var(--color-text-muted)]">Rp</span>
              <input
                type="number"
                min="0"
                value={form.cashActual}
                onChange={(event) => updateForm('cashActual', event.target.value)}
                placeholder="100.000"
                className="w-full rounded-xl border border-[var(--color-border)] py-3.5 pl-10 pr-4 font-mono text-lg font-bold focus:border-[var(--color-band-1)] focus:outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Masukkan jumlah uang fisik yang ditaruh di laci kasir pagi ini untuk kembalian awal.
            </p>
          </div>

          <button
            onClick={handleOpenCash}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-gradient-to-r from-[var(--color-band-1)] to-[var(--color-band-2)] py-3.5 text-sm font-semibold text-white shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Membuka Kas...' : 'Mulai Sesi Kasir (Buka Kas)'}
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Kas" subtitle="Tutup kas harian">
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-cream-light p-4 flex flex-col gap-2">
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
          {status === 'closed' ? <Check className={message.includes('berhasil') ? 'text-[var(--color-accent-green)]' : ''} /> : <AlertTriangle className="flex-shrink-0" />}
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
              <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">Cash Fisik Akhir (Laci Kasir)</label>
              <input
                type="number"
                min="0"
                disabled={status === 'closed'}
                value={form.cashActual}
                onChange={(event) => updateForm('cashActual', event.target.value)}
                placeholder="Rp 0"
                className="w-full rounded-xl border border-[var(--color-border)] p-3 font-mono focus:border-[var(--color-band-1)] focus:outline-none disabled:bg-gray-50"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Seluruh uang fisik ini akan disetor ke Brankas, menyisakan Rp 0 di laci kasir setelah kas ditutup.
              </p>
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
            className={`flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] py-3.5 text-sm font-semibold transition-all duration-200 ${
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
