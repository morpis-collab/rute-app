import { useEffect, useState, useCallback } from 'react';
import { ArrowRightLeft, AlertTriangle, ArrowDown, ArrowUp, Loader2, Wallet } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import { formatRupiah, formatWaktu } from '../../utils/formatters';
import CashModal from '../../components/owner/CashModal';
import { getOwnerCash, postCashTransaction } from '../../services/apiClient';
import useAuthStore from '../../store/useAuthStore';
import useToastStore from '../../store/useToastStore';

export default function OwnerCash() {
  const [activeModal, setActiveModal] = useState(null); // 'in', 'out', 'transfer', 'koreksi'
  const [defaultAccountId, setDefaultAccountId] = useState('');
  const [cashAccounts, setCashAccounts] = useState([]);
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const totalCash = cashAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  const handleOpenModal = (type, accountId = '') => {
    setDefaultAccountId(accountId);
    setActiveModal(type);
  };

  const loadCash = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getOwnerCash();
      setCashAccounts(data.cashAccounts || []);
      setTxs(data.cashTransactions || []);
      setIsClosed(data.cashSession?.status === 'closed');
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal memuat data kas.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCash();
  }, [loadCash]);

  const handleSimpan = async (payload) => {
    try {
      setSaving(true);
      setError('');
      await postCashTransaction({
        ...payload,
        user: user?.name || 'Owner',
      });
      addToast('Mutasi kas berhasil disimpan!', 'success');
      setActiveModal(null);
      await loadCash(); // Reload to get updated accounts and transactions
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal menyimpan mutasi kas.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper title="Kas Usaha" subtitle="Manajemen Saldo & Rekening">
      
      {isClosed && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-danger-border bg-danger-bg px-4 py-3.5 text-sm text-danger-text flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="shrink-0 text-danger-text mt-0.5" size={16} />
          <div className="space-y-1">
            <p className="font-semibold">Sesi Kasir Hari Ini Sudah Ditutup</p>
            <p className="text-xs opacity-90 font-medium">Uang laci harian telah dialokasikan. Harap berhati-hati saat memasukkan, mengeluarkan, atau memindahkan dana untuk keperluan penyesuaian laci dan brankas.</p>
          </div>
        </div>
      )}

      {/* Top Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          onClick={() => handleOpenModal('in')} 
          className="btn btn-primary bg-white text-[var(--color-accent-green)] border border-[var(--color-coffee-latte)] shadow-sm hover:shadow-md"
        >
          <ArrowDown size={16} /> Kas Masuk
        </button>
        <button 
          onClick={() => handleOpenModal('out')} 
          className="btn btn-primary bg-white text-[var(--color-accent-red)] border border-[var(--color-coffee-latte)] shadow-sm hover:shadow-md"
        >
          <ArrowUp size={16} /> Kas Keluar
        </button>
        <button 
          onClick={() => handleOpenModal('transfer')} 
          className="btn btn-primary bg-white text-[var(--color-accent-blue)] border border-[var(--color-coffee-latte)] shadow-sm hover:shadow-md"
        >
          <ArrowRightLeft size={16} /> Transfer Kas
        </button>
        <button 
          onClick={() => handleOpenModal('koreksi')} 
          className="btn btn-primary bg-white text-[var(--color-accent-orange)] border border-[var(--color-coffee-latte)] shadow-sm hover:shadow-md"
        >
          <AlertTriangle size={16} /> Koreksi
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Loader2 size={16} className="animate-spin" /> Memuat data kas...
        </div>
      )}

      {/* Saldo Accounts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="kpi-card bg-[linear-gradient(135deg,var(--color-band-1),var(--color-band-2))] text-white border-none flex flex-col justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold mb-1 opacity-80">Total Saldo Semua Kas</p>
            <p className="text-2xl font-mono font-bold">{formatRupiah(totalCash)}</p>
          </div>
        </div>
        {cashAccounts.map(acc => {
          const isBrankas = acc.id.toLowerCase().includes('brankas');
          return (
            <div 
              key={acc.id} 
              className={`kpi-card flex flex-col justify-between min-h-[125px] transition-all hover:shadow-md ${
                isBrankas 
                  ? 'border-2 border-[var(--color-accent-warm)] bg-cream-card' 
                  : 'border border-[var(--color-border)] bg-white'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1 min-w-0">
                    {isBrankas && <Wallet size={12} className="text-[var(--color-accent-primary)] shrink-0" />}
                    <p className={`text-[11px] uppercase tracking-wider font-semibold truncate ${
                      isBrankas ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-secondary)]'
                    }`}>
                      {acc.name}
                    </p>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    isBrankas
                      ? 'bg-warning-bg text-warning-text'
                      : acc.type === 'tunai' || acc.type === 'cash'
                        ? 'bg-success-bg text-success-text'
                        : acc.type === 'bank'
                          ? 'bg-info-bg text-info-text'
                          : 'bg-warning-bg text-warning-text'
                  }`}>
                    {acc.type}
                  </span>
                </div>
                <p className="text-xl font-mono text-[var(--color-text-primary)] font-bold">{formatRupiah(acc.balance)}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-[var(--color-border)] flex justify-end gap-2 text-xs">
                <button 
                  onClick={() => handleOpenModal('koreksi', acc.id)}
                  className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-secondary)] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <AlertTriangle size={12} /> Koreksi
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* History Mutasi Kas */}
      <div className="glass-card p-0">
        <div className="p-4 border-b border-[var(--color-coffee-latte)] flex justify-between items-center bg-cream-light">
          <h3 className="font-bold text-[var(--color-text-primary)]">Riwayat Mutasi Kas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-32">Waktu</th>
                <th>Jenis</th>
                <th>Keterangan</th>
                <th>Akun</th>
                <th className="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {txs.map(tx => (
                <tr key={tx.id}>
                  <td className="font-mono text-xs text-[var(--color-text-secondary)]">{formatWaktu(tx.date)}</td>
                  <td>
                    <span className={`badge ${tx.type === 'in' ? 'badge-success' : tx.type === 'out' ? 'badge-danger' : 'badge-info'}`}>
                      {tx.type === 'in' ? 'Kas Masuk' : tx.type === 'out' ? 'Kas Keluar' : 'Transfer'}
                    </span>
                  </td>
                  <td>
                    <p className="font-medium text-[var(--color-text-primary)]">{tx.description}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Oleh: {tx.user}</p>
                  </td>
                  <td className="text-sm">
                    {tx.type === 'transfer' ? (
                      <span className="text-[var(--color-text-secondary)]">
                        {cashAccounts.find(a => a.id === tx.fromAccountId)?.name} <ArrowRightLeft size={10} className="inline mx-1" /> {cashAccounts.find(a => a.id === tx.toAccountId)?.name}
                      </span>
                    ) : (
                      cashAccounts.find(a => a.id === tx.accountId)?.name || '-'
                    )}
                  </td>
                  <td className={`text-right font-mono font-bold ${tx.type === 'in' ? 'text-[var(--color-accent-green)]' : tx.type === 'out' ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-primary)]'}`}>
                    {tx.type === 'in' ? '+' : tx.type === 'out' ? '-' : ''}{formatRupiah(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {activeModal && (
        <CashModal
          key={`${activeModal}-${defaultAccountId}`}
          activeModal={activeModal}
          setActiveModal={setActiveModal}
          handleSimpan={handleSimpan}
          cashAccounts={cashAccounts}
          saving={saving}
          error={error}
          defaultAccountId={defaultAccountId}
        />
      )}
    </PageWrapper>
  );
}
