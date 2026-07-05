import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah, formatTanggalSingkat, getPhotoUrl } from '../../utils/formatters';
import ExpenseModal from '../../components/shared/ExpenseModal';
import useToastStore from '../../store/useToastStore';
import { expandCollapse, fadeScale, softSpring, tapPress } from '../../utils/motion';

export default function OwnerExpenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const expenses = useAppStore((state) => state.expenses || []);
  const wallets = useAppStore((state) => state.wallets || []);
  const ingredients = useAppStore((state) => state.ingredients || []);
  const addExpense = useAppStore((state) => state.addExpense);
  const updateExpense = useAppStore((state) => state.updateExpense);
  const deleteExpense = useAppStore((state) => state.deleteExpense);
  const loadRemoteData = useAppStore((state) => state.loadRemoteData);
  const { user } = useAuthStore();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('all');

  useEffect(() => {
    loadRemoteData().catch((err) => {
      console.error('Failed to load remote data:', err);
    });
  }, [loadRemoteData]);

  const getWalletLabel = (id) => {
    const w = wallets.find(item => String(item.id) === String(id));
    return w ? w.name : 'Unknown Wallet';
  };

  const filteredExpenses = expenses.filter(exp => {
    // Search query filter: matches notes/description, category, or wallet name
    const searchLower = searchQuery.toLowerCase();
    const walletLabel = getWalletLabel(exp.walletId).toLowerCase();
    const matchesSearch = !searchQuery ||
      (exp.description && exp.description.toLowerCase().includes(searchLower)) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchLower)) ||
      (exp.category && exp.category.toLowerCase().includes(searchLower)) ||
      walletLabel.includes(searchLower);

    // Date range filter
    if (startDate) {
      const expDateStr = exp.date ? exp.date.substring(0, 10) : '';
      if (expDateStr < startDate) return false;
    }
    if (endDate) {
      const expDateStr = exp.date ? exp.date.substring(0, 10) : '';
      if (expDateStr > endDate) return false;
    }

    // Wallet filter
    const matchesWallet = selectedWallet === 'all' || String(exp.walletId) === String(selectedWallet);

    return matchesSearch && matchesWallet;
  });

  const handleSaveExpense = async (data) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          ...data,
          user: user?.name || 'Owner',
        });
        useToastStore.getState().addToast('Pengeluaran berhasil diperbarui', 'success');
      } else {
        await addExpense({
          ...data,
          user: user?.name || 'Owner',
        });
        useToastStore.getState().addToast('Pengeluaran berhasil disimpan', 'success');
      }
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast('Gagal menyimpan pengeluaran', 'error');
      throw err;
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pengeluaran ini? Saldo wallet akan dikembalikan.')) {
      try {
        await deleteExpense(id);
        useToastStore.getState().addToast('Pengeluaran berhasil dihapus', 'success');
      } catch (err) {
        console.error(err);
        useToastStore.getState().addToast('Gagal menghapus pengeluaran', 'error');
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  return (
    <PageWrapper title="Pengeluaran" subtitle="Semua pengeluaran usaha RUTE">
      <motion.button
        onClick={() => {
          setEditingExpense(null);
          setIsModalOpen(true);
        }}
        whileTap={shouldReduceMotion ? undefined : tapPress}
        transition={softSpring}
        className="w-full lg:w-auto px-4 py-2.5 rounded-xl border-2 border-[var(--color-accent-warm)] bg-[var(--color-accent-light)]/20 flex items-center justify-center gap-2 mb-6 hover:bg-[var(--color-accent-light)]/40 transition-colors cursor-pointer h-11"
      >
        <Plus size={18} className="text-[var(--color-accent-primary)]" />
        <span className="text-sm font-medium text-[var(--color-accent-primary)]">Tambah Pengeluaran</span>
      </motion.button>

      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-white p-4 rounded-xl border border-[var(--color-border)]">
        <div>
          <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
            Cari Catatan / Kategori / Dompet
          </label>
          <input
            type="text"
            className="form-input w-full text-sm p-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg focus:border-[var(--color-band-1)] outline-none font-sans text-gray-800"
            placeholder="Cari pengeluaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
            Mulai Tanggal
          </label>
          <input
            type="date"
            className="form-input w-full text-sm p-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg focus:border-[var(--color-band-1)] outline-none font-mono text-gray-800"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
            Sampai Tanggal
          </label>
          <input
            type="date"
            className="form-input w-full text-sm p-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg focus:border-[var(--color-band-1)] outline-none font-mono text-gray-800"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
            Dompet / Sumber Dana
          </label>
          <select
            className="form-select w-full text-sm p-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg focus:border-[var(--color-band-1)] outline-none font-sans text-gray-800"
            value={selectedWallet}
            onChange={(e) => setSelectedWallet(e.target.value)}
          >
            <option value="all">Semua Dompet</option>
            {wallets.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-2">
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-muted)] text-sm">
            {expenses.length === 0 ? 'Belum ada data pengeluaran. Silakan tambahkan pengeluaran baru.' : 'Tidak ada data pengeluaran yang cocok dengan filter.'}
          </div>
        ) : (
          filteredExpenses.map(exp => {
            const isExpanded = expandedExpenseId === exp.id;
            
            // Format status badge if exists
            const statusLabel = exp.status ? (exp.status === 'approved' || exp.status === 'auto_approved' ? 'Disetujui' : exp.status === 'pending' ? 'Menunggu' : 'Ditolak') : null;
            const statusColor = exp.status ? (exp.status === 'approved' || exp.status === 'auto_approved' ? 'bg-success/10 text-success border-success/20' : exp.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' : 'bg-danger/10 text-danger border-danger/20') : null;

            const expenseValue = exp.amount !== undefined ? exp.amount : (exp.total !== undefined ? exp.total : 0);

            return (
              <motion.div
                key={exp.id}
                layout={!shouldReduceMotion}
                transition={softSpring}
                className={`rounded-xl bg-white border ${
                  isExpanded ? 'border-[var(--color-accent-warm)] shadow-sm' : 'border-[var(--color-border)]'
                } transition-all duration-200 overflow-hidden`}
              >
                {/* Header Row */}
                <div 
                  onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                  className="p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/55 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                        {exp.description || exp.notes || 'Pengeluaran Tanpa Catatan'}
                      </span>
                      <div className="flex items-center gap-2">
                        {statusLabel && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-light)]/30 text-[var(--color-accent-primary)] font-semibold">
                          {exp.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                      <span>{formatTanggalSingkat(exp.date)} / {getWalletLabel(exp.walletId)}</span>
                      <span className="font-mono font-bold text-sm text-[var(--color-accent-red)]">-{formatRupiah(expenseValue)}</span>
                    </div>
                  </div>
                  
                  <div className="text-gray-400 p-1 shrink-0">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      {...(shouldReduceMotion ? {} : expandCollapse)}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 pb-4 border-t border-[var(--color-border)] space-y-3.5 bg-gray-50/30 pt-3.5">
                        {/* Purchased Ingredients details if linked */}
                        {exp.purchasedIngredients && exp.purchasedIngredients.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)] tracking-wider mb-2">Bahan Baku Terhubung</h4>
                            <div className="space-y-1.5">
                              {exp.purchasedIngredients.map((item, idx) => {
                                const ing = ingredients.find(i => String(i.id) === String(item.ingredientId));
                                return (
                                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded bg-white border border-[var(--color-border)]/50">
                                    <div>
                                      <span className="font-medium text-[var(--color-text-primary)]">
                                        {ing ? ing.name : `Bahan Baku #${item.ingredientId}`}
                                      </span>
                                      <span className="text-[10px] text-[var(--color-text-muted)] ml-1.5">
                                        ({item.qty} {ing ? ing.unit : 'unit'} x {formatRupiah(item.price)})
                                      </span>
                                    </div>
                                    <span className="font-mono text-[var(--color-text-primary)] font-semibold">
                                      {formatRupiah(item.qty * item.price)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Photo/Proof of Receipt if exists */}
                        {(exp.photoUrl || exp.proofUrl) && (
                          <div className="pt-1">
                            <h4 className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)] tracking-wider mb-2">Resi / Bukti Pembelian</h4>
                            <div className="flex items-center gap-3">
                              <div 
                                onClick={() => setActivePhotoUrl(exp.photoUrl || exp.proofUrl)}
                                className="w-16 h-16 rounded-lg border border-[var(--color-border)] overflow-hidden cursor-zoom-in bg-white flex-shrink-0 group relative shadow-xs"
                              >
                                <img 
                                  src={getPhotoUrl(exp.photoUrl || exp.proofUrl)} 
                                  alt="Bukti Resi" 
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                              </div>
                              <div className="text-xs">
                                <button 
                                  type="button"
                                  onClick={() => setActivePhotoUrl(exp.photoUrl || exp.proofUrl)}
                                  className="text-[var(--color-accent-primary)] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  Lihat Foto Resi
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-text-muted)] bg-gray-100/50 p-2.5 rounded-lg border border-gray-100">
                          <span>Dicatat oleh: <strong className="text-[var(--color-text-secondary)]">{exp.user || 'Sistem'}</strong></span>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingExpense(exp);
                              setIsModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-white text-xs text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteExpense(exp.id);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-xs text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <ExpenseModal 
          key={editingExpense ? editingExpense.id : 'new'}
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          onSave={handleSaveExpense}
          expense={editingExpense}
        />
      )}

      {/* Lightbox / Foto Portal */}
      <AnimatePresence>
        {activePhotoUrl && (
          <motion.div
            {...(shouldReduceMotion ? {} : fadeScale)}
            onClick={() => setActivePhotoUrl(null)}
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          >
            <motion.div
              {...(shouldReduceMotion ? {} : fadeScale)}
              className="relative max-h-[90vh] max-w-4xl rounded-[var(--radius-card)] bg-white p-2 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <img
                src={getPhotoUrl(activePhotoUrl)}
                alt="Bukti Resi Besar"
                className="max-h-[80vh] max-w-full rounded-[var(--radius-card)] object-contain"
              />
              <button
                onClick={() => setActivePhotoUrl(null)}
                className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border bg-white text-sm font-bold text-gray-800 shadow-md hover:bg-gray-100"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
