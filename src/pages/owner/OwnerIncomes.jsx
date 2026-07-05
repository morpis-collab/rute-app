import { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah, formatTanggalSingkat } from '../../utils/formatters';
import useToastStore from '../../store/useToastStore';
import { getBusinessDate } from '../../utils/businessDate';
import { expandCollapse, softSpring, tapPress } from '../../utils/motion';

function IncomeModal({ isOpen, onClose, onSave, income, wallets, incomeCategories }) {
  const [description, setDescription] = useState(income?.description || '');
  const [amount, setAmount] = useState(income?.amount || '');
  const [category, setCategory] = useState(income?.category || incomeCategories[0] || 'Penjualan Harian');
  const [date, setDate] = useState(income?.date ? income.date.substring(0, 10) : getBusinessDate());
  const [walletId, setWalletId] = useState(income?.walletId || wallets[0]?.id || '');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      useToastStore.getState().addToast('Nominal harus lebih dari 0', 'error');
      return;
    }
    if (!walletId) {
      useToastStore.getState().addToast('Wallet wajib dipilih', 'error');
      return;
    }

    onSave({
      description,
      amount: Number(amount),
      category,
      walletId,
      date: date ? `${date}T12:00:00.000Z` : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-md shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-primary)] shrink-0">
          <h3 className="font-bold text-[var(--color-text-primary)]">{income ? 'Ubah Pemasukan' : 'Tambah Pemasukan'}</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Deskripsi</label>
            <input 
              type="text" 
              className="form-input text-sm p-2 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              placeholder="Contoh: Pendapatan Bunga Bank, Penjualan Katering..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nominal (Rp)</label>
            <input 
              type="number" 
              className="form-input text-sm p-2 font-mono w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              placeholder="0" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Tanggal</label>
            <input 
              type="date" 
              className="form-input text-sm p-2 w-full font-mono bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Kategori</label>
            <select 
              className="form-select text-sm p-2 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
            >
              {incomeCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Wallet Penerima</label>
            <select 
              className="form-select text-sm p-2 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              value={walletId} 
              onChange={(e) => setWalletId(e.target.value)} 
              required
            >
              <option value="">Pilih Wallet</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name} (Saldo: {formatRupiah(w.balance)})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)] shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50 cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-primary)]/90 cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OwnerIncomes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [expandedIncomeId, setExpandedIncomeId] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const incomes = useAppStore((state) => state.incomes || []);
  const wallets = useAppStore((state) => state.wallets || []);
  const categories = useAppStore((state) => state.categories || { income: [], expense: [] });
  const addIncome = useAppStore((state) => state.addIncome);
  const updateIncome = useAppStore((state) => state.updateIncome);
  const deleteIncome = useAppStore((state) => state.deleteIncome);
  const { user } = useAuthStore();

  const incomeCategories = categories.income || ["Penjualan Harian", "Pendapatan Bunga", "Lain-lain"];

  const getWalletLabel = (id) => {
    const w = wallets.find(item => String(item.id) === String(id));
    return w ? w.name : 'Unknown Wallet';
  };

  const handleSaveIncome = async (data) => {
    try {
      if (editingIncome) {
        await updateIncome(editingIncome.id, {
          ...data,
          user: user?.name || 'Owner',
        });
        useToastStore.getState().addToast('Pemasukan berhasil diperbarui', 'success');
      } else {
        await addIncome({
          ...data,
          user: user?.name || 'Owner',
        });
        useToastStore.getState().addToast('Pemasukan berhasil disimpan', 'success');
      }
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast('Gagal menyimpan pemasukan', 'error');
    }
  };

  const handleDeleteIncome = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pemasukan ini? Saldo wallet akan didebet kembali.')) {
      try {
        await deleteIncome(id);
        useToastStore.getState().addToast('Pemasukan berhasil dihapus', 'success');
      } catch (err) {
        console.error(err);
        useToastStore.getState().addToast('Gagal menghapus pemasukan', 'error');
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingIncome(null);
  };

  return (
    <PageWrapper title="Pemasukan" subtitle="Semua pemasukan usaha RUTE">
      <motion.button
        onClick={() => {
          setEditingIncome(null);
          setIsModalOpen(true);
        }}
        whileTap={shouldReduceMotion ? undefined : tapPress}
        transition={softSpring}
        className="w-full lg:w-auto px-4 py-2.5 rounded-xl border-2 border-[var(--color-accent-warm)] bg-[var(--color-accent-light)]/20 flex items-center justify-center gap-2 mb-6 hover:bg-[var(--color-accent-light)]/40 transition-colors cursor-pointer"
      >
        <Plus size={18} className="text-[var(--color-accent-primary)]" />
        <span className="text-sm font-medium text-[var(--color-accent-primary)]">Tambah Pemasukan</span>
      </motion.button>

      <div className="space-y-2">
        {incomes.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-muted)] text-sm">
            Belum ada data pemasukan. Silakan tambahkan pemasukan baru.
          </div>
        ) : (
          incomes.map(inc => {
            const isExpanded = expandedIncomeId === inc.id;
            return (
              <motion.div
                key={inc.id}
                layout={!shouldReduceMotion}
                transition={softSpring}
                className={`rounded-xl bg-white border ${
                  isExpanded ? 'border-[var(--color-accent-warm)] shadow-sm' : 'border-[var(--color-border)]'
                } transition-all duration-200 overflow-hidden`}
              >
                <div 
                  onClick={() => setExpandedIncomeId(isExpanded ? null : inc.id)}
                  className="p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/55 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                        {inc.description || 'Pemasukan Tanpa Nama'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-light)]/30 text-[var(--color-accent-primary)] font-semibold">
                        {inc.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                      <span>{formatTanggalSingkat(inc.date)} / {getWalletLabel(inc.walletId)}</span>
                      <span className="font-mono font-bold text-sm text-[var(--color-accent-primary)]">+{formatRupiah(inc.amount)}</span>
                    </div>
                  </div>
                  
                  <div className="text-gray-400 p-1 shrink-0">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      {...(shouldReduceMotion ? {} : expandCollapse)}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 pb-4 border-t border-[var(--color-border)] space-y-3.5 bg-gray-50/30 pt-3.5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-text-muted)] bg-gray-100/50 p-2.5 rounded-lg border border-gray-100">
                          <span>Dicatat oleh: <strong className="text-[var(--color-text-secondary)]">{inc.user || 'Sistem'}</strong></span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingIncome(inc);
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
                              handleDeleteIncome(inc.id);
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
        <IncomeModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          onSave={handleSaveIncome}
          income={editingIncome}
          wallets={wallets}
          incomeCategories={incomeCategories}
        />
      )}
    </PageWrapper>
  );
}
