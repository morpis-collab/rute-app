import { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowRightLeft, Plus, Edit2, Trash2, Wallet, Calendar, Loader2, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import { formatRupiah, formatTanggal, formatWaktu } from '../../utils/formatters';
import { getBusinessDate } from '../../utils/businessDate';
import useAuthStore from '../../store/useAuthStore';
import useToastStore from '../../store/useToastStore';
import useAppStore from '../../store/useAppStore';

export default function OwnerCash() {
  const wallets = useAppStore((state) => state.wallets || []);
  const incomes = useAppStore((state) => state.incomes || []);
  const expenses = useAppStore((state) => state.expenses || []);
  const transfers = useAppStore((state) => state.transfers || []);
  
  const loadRemoteData = useAppStore((state) => state.loadRemoteData);
  const addWallet = useAppStore((state) => state.addWallet);
  const updateWallet = useAppStore((state) => state.updateWallet);
  const deleteWallet = useAppStore((state) => state.deleteWallet);
  const addTransfer = useAppStore((state) => state.addTransfer);

  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [savingWallet, setSavingWallet] = useState(false);
  const [savingTransfer, setSavingTransfer] = useState(false);
  
  // Wallet Modal State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [walletForm, setWalletForm] = useState({ name: '', balance: '' });

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    date: getBusinessDate(),
    fromWalletId: '',
    toWalletId: '',
    amount: '',
    notes: ''
  });

  // Mutasi / Ledger filters
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all');
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await loadRemoteData();
    } catch {
      addToast('Gagal memuat data keuangan dari server', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadRemoteData, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Handle open wallet modal
  const openWalletModal = (wallet = null) => {
    if (wallet) {
      setEditingWallet(wallet);
      setWalletForm({ name: wallet.name, balance: String(wallet.balance) });
    } else {
      setEditingWallet(null);
      setWalletForm({ name: '', balance: '' });
    }
    setIsWalletModalOpen(true);
  };

  // Handle save wallet
  const handleSaveWallet = async (e) => {
    e.preventDefault();
    if (!walletForm.name.trim()) {
      addToast('Nama dompet wajib diisi', 'error');
      return;
    }
    try {
      setSavingWallet(true);
      if (editingWallet) {
        await updateWallet(editingWallet.id, {
          name: walletForm.name.trim(),
          balance: Number(walletForm.balance || 0)
        });
        addToast('Dompet berhasil diperbarui', 'success');
      } else {
        await addWallet({
          name: walletForm.name.trim(),
          balance: walletForm.balance ? Number(walletForm.balance) : 0
        });
        addToast('Dompet berhasil ditambahkan', 'success');
      }
      setIsWalletModalOpen(false);
      setEditingWallet(null);
      setWalletForm({ name: '', balance: '' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal menyimpan dompet';
      addToast(msg, 'error');
    } finally {
      setSavingWallet(false);
    }
  };

  // Handle delete wallet
  const handleDeleteWallet = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus dompet ini?')) {
      try {
        await deleteWallet(id);
        addToast('Dompet berhasil dihapus', 'success');
      } catch (err) {
        const msg = err.response?.data?.error || 'Gagal menghapus dompet';
        addToast(msg, 'error');
      }
    }
  };

  // Handle transfer submit
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    const { date, fromWalletId, toWalletId, amount, notes } = transferForm;
    if (!fromWalletId || !toWalletId) {
      addToast('Pilih dompet asal dan tujuan', 'error');
      return;
    }
    if (String(fromWalletId) === String(toWalletId)) {
      addToast('Dompet asal dan tujuan tidak boleh sama', 'error');
      return;
    }
    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      addToast('Nominal transfer harus lebih dari 0', 'error');
      return;
    }
    const fromWallet = wallets.find(w => String(w.id) === String(fromWalletId));
    if (!fromWallet) {
      addToast('Dompet asal tidak ditemukan', 'error');
      return;
    }
    if (fromWallet.balance < transferAmount) {
      addToast(`Saldo dompet asal tidak cukup (Tersedia: ${formatRupiah(fromWallet.balance)})`, 'error');
      return;
    }

    try {
      setSavingTransfer(true);
      await addTransfer({
        fromWalletId,
        toWalletId,
        amount: transferAmount,
        description: notes.trim(),
        date: date ? `${date}T12:00:00.000Z` : undefined,
        user: user?.name || 'Owner'
      });
      addToast('Transfer dana berhasil dicatat', 'success');
      setTransferForm({
        date: getBusinessDate(),
        fromWalletId: '',
        toWalletId: '',
        amount: '',
        notes: ''
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Gagal mencatat transfer dana';
      addToast(msg, 'error');
    } finally {
      setSavingTransfer(false);
    }
  };

  // Consolidated Ledger
  const consolidatedLedger = useMemo(() => {
    const list = [];

    // Add Incomes
    incomes.forEach((inc) => {
      list.push({
        id: inc.id,
        type: 'income',
        typeName: 'Pemasukan',
        date: inc.date,
        amount: Number(inc.amount || 0),
        details: wallets.find(w => String(w.id) === String(inc.walletId))?.name || 'Dompet Tidak Dikenal',
        category: inc.category || 'Lain-lain',
        notes: inc.notes || '',
        user: inc.user
      });
    });

    // Add Expenses
    expenses.forEach((exp) => {
      list.push({
        id: exp.id,
        type: 'expense',
        typeName: 'Pengeluaran',
        date: exp.date,
        amount: Number(exp.amount || exp.total || 0),
        details: wallets.find(w => String(w.id) === String(exp.walletId))?.name || 'Dompet Tidak Dikenal',
        category: exp.category || 'Lain-lain',
        notes: exp.description || exp.notes || '',
        user: exp.user
      });
    });

    // Add Transfers
    transfers.forEach((trf) => {
      const fromName = wallets.find(w => String(w.id) === String(trf.fromWalletId))?.name || 'Dompet Tidak Dikenal';
      const toName = wallets.find(w => String(w.id) === String(trf.toWalletId))?.name || 'Dompet Tidak Dikenal';
      list.push({
        id: trf.id,
        type: 'transfer',
        typeName: 'Transfer',
        date: trf.date,
        amount: Number(trf.amount || 0),
        details: `${fromName} ➔ ${toName}`,
        category: 'Transfer Kas',
        notes: trf.description || trf.notes || '',
        user: trf.user
      });
    });

    // Sort chronologically descending
    const sorted = list.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply filters
    return sorted.filter((tx) => {
      const matchesType = ledgerTypeFilter === 'all' || tx.type === ledgerTypeFilter;
      const searchLower = ledgerSearchQuery.toLowerCase();
      const matchesSearch = !ledgerSearchQuery ||
        tx.notes.toLowerCase().includes(searchLower) ||
        tx.category.toLowerCase().includes(searchLower) ||
        tx.details.toLowerCase().includes(searchLower) ||
        (tx.user || '').toLowerCase().includes(searchLower);
      return matchesType && matchesSearch;
    });
  }, [incomes, expenses, transfers, wallets, ledgerTypeFilter, ledgerSearchQuery]);

  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
  }, [wallets]);

  // Selected from wallet for current transfer
  const selectedFromWallet = useMemo(() => {
    return wallets.find(w => String(w.id) === String(transferForm.fromWalletId));
  }, [wallets, transferForm.fromWalletId]);

  return (
    <PageWrapper title="Kas & Dompet" subtitle="Manajemen Saldo, Rekening & Transfer Antar Dompet">
      
      {/* Top Total & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="kpi-card bg-[linear-gradient(135deg,var(--color-band-1),var(--color-band-2))] text-white border-none py-3.5 px-5 shadow-sm rounded-[var(--radius-lg)]">
            <p className="text-[10px] uppercase tracking-wider font-semibold opacity-85 mb-0.5">Total Saldo Semua Dompet</p>
            <p className="text-2xl md:text-3xl font-mono font-bold">{formatRupiah(totalBalance)}</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn btn-secondary border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] h-[44px] px-3.5 rounded-[var(--radius-md)] flex items-center justify-center gap-2 cursor-pointer transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <button
          onClick={() => openWalletModal(null)}
          className="btn btn-primary bg-[var(--color-accent-primary)] hover:bg-[var(--color-band-2)] text-white h-[44px] px-5 rounded-[var(--radius-md)] flex items-center justify-center gap-2 cursor-pointer shadow-sm font-semibold transition-all"
        >
          <Plus size={18} /> Tambah Dompet Baru
        </button>
      </div>

      {loading && wallets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-[var(--color-text-muted)] gap-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-lg)]">
          <Loader2 size={32} className="animate-spin text-[var(--color-accent-primary)]" />
          <p className="text-sm font-medium">Memuat data dompet...</p>
        </div>
      ) : (
        <>
          {/* Wallet Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="glass-card p-5 flex flex-col justify-between border border-[var(--color-border)] bg-white dark:bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] hover:shadow-md transition-all min-h-[140px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-[var(--color-accent-light)] dark:bg-[var(--color-band-2)] text-[var(--color-accent-primary)] dark:text-[var(--color-text-primary)] rounded-[var(--radius-md)]">
                        <Wallet size={18} />
                      </div>
                      <span className="font-bold text-sm text-[var(--color-text-primary)]">{wallet.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openWalletModal(wallet)}
                        className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-bg-secondary)] rounded-md transition-colors h-[44px] w-[44px] flex items-center justify-center cursor-pointer"
                        title="Ubah Dompet"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteWallet(wallet.id)}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors h-[44px] w-[44px] flex items-center justify-center cursor-pointer"
                        title="Hapus Dompet"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xl font-mono font-bold text-[var(--color-text-primary)]">{formatRupiah(wallet.balance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Transfer Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Transfer Form Card */}
            <div className="glass-card p-6 border border-[var(--color-border)] bg-white dark:bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] lg:col-span-2">
              <div className="flex items-center gap-2 mb-4 border-b border-[var(--color-border)] pb-3">
                <ArrowRightLeft className="text-[var(--color-accent-primary)]" size={20} />
                <h3 className="font-bold text-lg text-[var(--color-text-primary)]">Transfer Antar Dompet</h3>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="space-y-1">
                    <label htmlFor="txDate" className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase">Tanggal Transfer</label>
                    <div className="relative flex items-center">
                      <Calendar size={16} className="absolute left-3 text-[var(--color-text-muted)] pointer-events-none" />
                      <input
                        type="date"
                        id="txDate"
                        value={transferForm.date}
                        onChange={(e) => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full min-h-[44px] pl-10 pr-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-band-1)] focus:border-transparent bg-white text-[var(--color-text-primary)]"
                        required
                      />
                    </div>
                  </div>

                  {/* From Wallet */}
                  <div className="space-y-1">
                    <label htmlFor="fromWallet" className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase">Dari Dompet</label>
                    <select
                      id="fromWallet"
                      value={transferForm.fromWalletId}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, fromWalletId: e.target.value }))}
                      className="w-full min-h-[44px] px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-band-1)] focus:border-transparent bg-white text-[var(--color-text-primary)]"
                      required
                    >
                      <option value="">Pilih Dompet Asal</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name} (Saldo: {formatRupiah(w.balance)})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* To Wallet */}
                  <div className="space-y-1">
                    <label htmlFor="toWallet" className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase">Ke Dompet</label>
                    <select
                      id="toWallet"
                      value={transferForm.toWalletId}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, toWalletId: e.target.value }))}
                      className="w-full min-h-[44px] px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-band-1)] focus:border-transparent bg-white text-[var(--color-text-primary)]"
                      required
                    >
                      <option value="">Pilih Dompet Tujuan</option>
                      {wallets
                        .filter(w => String(w.id) !== String(transferForm.fromWalletId))
                        .map(w => (
                          <option key={w.id} value={w.id}>{w.name} (Saldo: {formatRupiah(w.balance)})</option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1">
                    <label htmlFor="amount" className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase">Nominal Transfer (Rp)</label>
                    <input
                      type="number"
                      id="amount"
                      placeholder="0"
                      min="1"
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full min-h-[44px] px-3 py-2 text-sm font-mono rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-band-1)] focus:border-transparent bg-white text-[var(--color-text-primary)]"
                      required
                    />
                    {selectedFromWallet && (
                      <p className={`text-[11px] font-medium ${Number(transferForm.amount) > selectedFromWallet.balance ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-muted)]'}`}>
                        Maksimal transfer: {formatRupiah(selectedFromWallet.balance)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label htmlFor="notes" className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase">Catatan</label>
                  <input
                    type="text"
                    id="notes"
                    placeholder="Contoh: Pemindahan modal bahan baku, settlement QRIS..."
                    value={transferForm.notes}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full min-h-[44px] px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-band-1)] focus:border-transparent bg-white text-[var(--color-text-primary)]"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingTransfer || !transferForm.fromWalletId || !transferForm.toWalletId || !transferForm.amount || (selectedFromWallet && Number(transferForm.amount) > selectedFromWallet.balance)}
                    className="btn btn-primary bg-[var(--color-accent-primary)] hover:bg-[var(--color-band-2)] text-white min-h-[44px] px-6 rounded-[var(--radius-md)] font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    {savingTransfer ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft size={16} />
                        Kirim Dana
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Wallet Info Guide */}
            <div className="glass-card p-6 border border-[var(--color-border)] bg-cream-light dark:bg-[var(--color-bg-secondary)] rounded-[var(--radius-lg)] flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-[var(--color-text-primary)] mb-3 uppercase tracking-wider">Panduan Alokasi Dompet</h4>
                <ul className="space-y-3.5 text-xs text-[var(--color-text-secondary)]">
                  <li>
                    <strong className="text-[var(--color-text-primary)]">🌿 Bahan Baku:</strong> Khusus untuk pembelian biji kopi, susu, sirup, dan kemasan operasional outlet.
                  </li>
                  <li>
                    <strong className="text-[var(--color-text-primary)]">⚙️ Operasional:</strong> Biaya harian outlet, es batu, listrik, air, internet, gaji staff harian, dan servis minor.
                  </li>
                  <li>
                    <strong className="text-[var(--color-text-primary)]">📱 QRIS:</strong> Dompet penampung dari pembayaran digital. Lakukan transfer dari QRIS ke Operasional setelah dana masuk ke rekening bank.
                  </li>
                  <li>
                    <strong className="text-[var(--color-text-primary)]">💰 Keuntungan:</strong> Dompet hasil pembagian omzet atau profit bersih untuk pemilik/owner RUTE.
                  </li>
                </ul>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                Logika bisnis: Pembagian keuntungan dan alokasi kas bahan baku disarankan dilakukan secara rutin saat sesi tutup kas/penjualan selesai.
              </div>
            </div>
          </div>

          {/* Mutasi Keuangan (Consolidated Ledger Log) */}
          <div className="glass-card p-0 border border-[var(--color-border)] bg-white dark:bg-[var(--color-bg-card)] rounded-[var(--radius-lg)] overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] bg-cream-light dark:bg-[var(--color-bg-secondary)] flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-bold text-base text-[var(--color-text-primary)]">Mutasi Keuangan (Buku Besar Konsolidasi)</h3>
              
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Cari catatan..."
                  value={ledgerSearchQuery}
                  onChange={(e) => setLedgerSearchQuery(e.target.value)}
                  className="min-h-[44px] px-3.5 text-xs rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-band-1)] bg-white text-[var(--color-text-primary)] w-48 md:w-60"
                />
                
                <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] p-1 rounded-[var(--radius-md)] border border-[var(--color-border)]">
                  {['all', 'income', 'expense', 'transfer'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLedgerTypeFilter(type)}
                      className={`px-3 py-2.5 min-h-[44px] rounded-[var(--radius-sm)] text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center ${
                        ledgerTypeFilter === type
                          ? 'bg-white text-[var(--color-accent-primary)] shadow-sm'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)]'
                      }`}
                    >
                      {type === 'all' ? 'Semua' : type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : 'Transfer'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    <th className="p-4">Tanggal & Waktu</th>
                    <th className="p-4">Jenis</th>
                    <th className="p-4">Dompet / Detail</th>
                    <th className="p-4">Kategori / Referensi</th>
                    <th className="p-4">Catatan</th>
                    <th className="p-4 text-right">Nominal</th>
                    <th className="p-4 text-center">Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-xs">
                  {consolidatedLedger.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-[var(--color-text-muted)]">
                        Tidak ada riwayat mutasi keuangan yang cocok dengan filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    consolidatedLedger.map((tx) => {
                      const { typeColorClass, typeIcon, amountSign, amountColorClass } = (() => {
                        if (tx.type === 'income') {
                          return {
                            typeColorClass: 'bg-success-bg text-success-text border border-success-border',
                            typeIcon: <ArrowDownLeft size={10} className="inline mr-1" />,
                            amountSign: '+',
                            amountColorClass: 'text-success-text font-bold'
                          };
                        } else if (tx.type === 'expense') {
                          return {
                            typeColorClass: 'bg-danger-bg text-danger-text border border-danger-border',
                            typeIcon: <ArrowUpRight size={10} className="inline mr-1" />,
                            amountSign: '-',
                            amountColorClass: 'text-danger-text font-bold'
                          };
                        } else {
                          return {
                            typeColorClass: 'bg-info-bg text-info-text border border-info-border',
                            typeIcon: <ArrowRightLeft size={10} className="inline mr-1" />,
                            amountSign: '',
                            amountColorClass: 'text-info-text font-bold'
                          };
                        }
                      })();

                      return (
                        <tr key={tx.id} className="hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                          <td className="p-4 font-mono text-[var(--color-text-secondary)] whitespace-nowrap">
                            {formatTanggal(tx.date)} <span className="opacity-70 text-[10px] ml-1">{formatWaktu(tx.date)}</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-[var(--radius-badge)] text-[10px] font-bold uppercase tracking-wider inline-flex items-center ${typeColorClass}`}>
                              {typeIcon} {tx.typeName}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-[var(--color-text-primary)]">
                            {tx.details}
                          </td>
                          <td className="p-4 text-[var(--color-text-secondary)]">
                            {tx.category}
                          </td>
                          <td className="p-4 text-[var(--color-text-secondary)] italic max-w-xs truncate" title={tx.notes}>
                            {tx.notes || '-'}
                          </td>
                          <td className={`p-4 text-right font-mono ${amountColorClass}`}>
                            {amountSign}{formatRupiah(tx.amount)}
                          </td>
                          <td className="p-4 text-center text-[var(--color-text-muted)] font-medium">
                            {tx.user}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Wallet Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-md shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-primary)] shrink-0">
              <h3 className="font-bold text-[var(--color-text-primary)]">
                {editingWallet ? 'Ubah Saldo/Dompet' : 'Tambah Dompet Baru'}
              </h3>
              <button
                onClick={() => {
                  setIsWalletModalOpen(false);
                  setEditingWallet(null);
                }}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer text-lg font-bold p-3 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWallet} className="p-5 space-y-4 overflow-y-auto">
              {/* Wallet Name */}
              <div className="space-y-1">
                <label htmlFor="walletName" className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase">Nama Dompet</label>
                <input
                  type="text"
                  id="walletName"
                  value={walletForm.name}
                  onChange={(e) => setWalletForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Kas Utama, QRIS Bank Mandiri..."
                  className="w-full min-h-[44px] p-3 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-band-1)] focus:border-transparent bg-white text-[var(--color-text-primary)] font-sans"
                  required
                />
              </div>

              {/* Balance / Initial Balance */}
              <div className="space-y-1">
                <label htmlFor="walletBalance" className="block text-xs font-bold text-[var(--color-text-secondary)] uppercase">
                  {editingWallet ? 'Saldo Dompet (Rp)' : 'Saldo Awal (Rp, Opsional)'}
                </label>
                <input
                  type="number"
                  id="walletBalance"
                  value={walletForm.balance}
                  onChange={(e) => setWalletForm(prev => ({ ...prev, balance: e.target.value }))}
                  placeholder="0"
                  min="0"
                  className="w-full min-h-[44px] p-3 text-sm font-mono rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-band-1)] focus:border-transparent bg-white text-[var(--color-text-primary)]"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--color-border)] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsWalletModalOpen(false);
                    setEditingWallet(null);
                  }}
                  className="min-h-[44px] px-5 text-sm font-semibold rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingWallet}
                  className="min-h-[44px] px-5 text-sm font-semibold rounded-[var(--radius-md)] bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-band-2)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
                >
                  {savingWallet && <Loader2 size={14} className="animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </PageWrapper>
  );
}
