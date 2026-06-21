import { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah, formatTanggalSingkat, getPhotoUrl } from '../../utils/formatters';
import { APPROVAL_STATUS } from '../../utils/constants';
import ExpenseModal from '../../components/shared/ExpenseModal';
import useToastStore from '../../store/useToastStore';
import { getBusinessDate } from '../../utils/businessDate';
import { expandCollapse, fadeScale, softSpring, tapPress } from '../../utils/motion';

export default function OwnerExpenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState(null);
  const shouldReduceMotion = useReducedMotion();
  const expenses = useAppStore((state) => state.expenses);
  const cashAccounts = useAppStore((state) => state.cashAccounts);
  const cashSessions = useAppStore((state) => state.cashSessions);
  const addExpense = useAppStore((state) => state.addExpense);
  const updateExpense = useAppStore((state) => state.updateExpense);
  const updateExpenseStatus = useAppStore((state) => state.updateExpenseStatus);
  const { user } = useAuthStore();

  const todayBusinessDate = getBusinessDate();
  const isDrawerAccount = (cashAccountId) => {
    if (!cashAccountId) return true;
    const account = cashAccounts.find(a => String(a.id) === String(cashAccountId));
    return ['kas-utama', 'acc-01'].includes(String(account?.id || ''));
  };
  const isDateClosed = (dateStr) => {
    if (!dateStr) return false;
    const targetDate = String(dateStr).substring(0, 10);
    return cashSessions.some(session => session.date === targetDate && session.status === 'closed');
  };
  const isTodayClosed = isDateClosed(todayBusinessDate);

  const getCashAccountLabel = (cashAccountId) => {
    const account = cashAccounts.find(a => String(a.id) === String(cashAccountId));
    if (!account) return 'Tunai';
    if (account.type === 'qris') return 'QRIS';
    return account.name;
  };

  const handleSaveExpense = async (data) => {
    const targetDate = data.date || new Date().toISOString();
    if (isDateClosed(targetDate) && isDrawerAccount(data.cashAccountId)) {
      useToastStore.getState().addToast('Gagal menyimpan: pengeluaran dari laci tidak bisa dicatat setelah kas ditutup. Pilih Brankas atau rekening yang sesuai.', 'error');
      return;
    }
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          description: data.description,
          total: data.total,
          category: data.category,
          date: data.date,
          cashAccountId: data.cashAccountId,
          user: user?.name || 'Owner',
        });
        useToastStore.getState().addToast('Pengeluaran berhasil diperbarui', 'success');
      } else {
        await addExpense({
          expense: {
            date: data.date || new Date().toISOString(),
            description: data.description,
            total: data.total,
            category: data.category,
            items: data.items,
            cashAccountId: data.cashAccountId,
            user: user?.name || 'Owner',
          },
          cashAccountId: data.cashAccountId,
        });
        useToastStore.getState().addToast('Pengeluaran berhasil disimpan', 'success');
      }
    } catch {
      // Error handled globally
    }
  };

  const handleCancelExpense = (id) => {
    const expense = expenses.find(e => e.id === id);
    if (expense && isDateClosed(expense.date)) {
      useToastStore.getState().addToast('Gagal membatalkan: Kas pada tanggal pengeluaran sudah ditutup.', 'error');
      return;
    }
    if (window.confirm('Apakah Anda yakin ingin membatalkan pengeluaran ini? Saldo kas dan penyesuaian stok yang terkait akan dikembalikan.')) {
      try {
        updateExpenseStatus(id, 'rejected');
        useToastStore.getState().addToast('Pengeluaran berhasil dibatalkan', 'success');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  return (
      <PageWrapper title="Pengeluaran" subtitle="Semua pengeluaran usaha">
      {isTodayClosed && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-[#f0c7ba] bg-[#fff4ef] px-4 py-3.5 text-sm text-[#a34f39] flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="shrink-0 text-[#a34f39] mt-0.5" size={16} />
          <div className="space-y-1">
            <p className="font-semibold">Sesi Kasir Hari Ini Sudah Ditutup</p>
            <p className="text-xs opacity-90 font-medium">Pengeluaran dari laci terkunci. Pengeluaran dari Brankas Bahan Baku, Operasional, Keuntungan, atau rekening tetap bisa dicatat.</p>
          </div>
        </div>
      )}

      <motion.button
        onClick={() => {
          setEditingExpense(null);
          setIsModalOpen(true);
        }}
        whileTap={shouldReduceMotion ? undefined : tapPress}
        transition={softSpring}
        className="w-full lg:w-auto px-4 py-2.5 rounded-xl border-2 border-[var(--color-accent-warm)] bg-[var(--color-accent-light)]/20 flex items-center justify-center gap-2 mb-6 hover:bg-[var(--color-accent-light)]/40 transition-colors cursor-pointer"
      >
        <Plus size={18} className="text-[var(--color-accent-primary)]" />
        <span className="text-sm font-medium text-[var(--color-accent-primary)]">Tambah Pengeluaran Manual</span>
      </motion.button>

      <div className="space-y-2">
        {expenses.map(exp => {
          const st = APPROVAL_STATUS[exp.status] || {};
          const isExpanded = expandedExpenseId === exp.id;
          const isExpenseClosed = isDateClosed(exp.date);
          return (
            <motion.div
              key={exp.id}
              layout={!shouldReduceMotion}
              transition={softSpring}
              className={`rounded-xl bg-white border ${
                isExpanded ? 'border-[var(--color-accent-warm)] shadow-sm' : 'border-[var(--color-border)]'
              } transition-all duration-200 overflow-hidden`}
            >
              {/* Header/Summary Area - Clickable to expand */}
              <div 
                onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                className="p-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/55 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate flex items-center gap-1.5">
                      {exp.description}
                      {((exp.items || []).length > 0) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-normal">
                          {(exp.items || []).length} item
                        </span>
                      )}
                    </span>
                    <span className={`badge badge-${st.variant}`}>{st.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                    <span>{formatTanggalSingkat(exp.date)} / {(exp.category || '').replace('_', ' ')} / {getCashAccountLabel(exp.cashAccountId)}</span>
                    <span className="font-mono font-bold text-sm text-[var(--color-accent-primary)]">{formatRupiah(exp.total)}</span>
                  </div>
                </div>
                
                {/* Chevron Toggle */}
                <div className="text-gray-400 p-1 shrink-0">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expanded Area */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    {...(shouldReduceMotion ? {} : expandCollapse)}
                    className="overflow-hidden"
                  >
                <div className="px-3.5 pb-4 border-t border-[var(--color-border)] space-y-3.5 bg-gray-50/30 pt-3.5">
                  {/* Item Details */}
                  <div>
                    <h4 className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)] tracking-wider mb-2">Rincian Item</h4>
                    {((exp.items || []).length > 0) ? (
                      <div className="space-y-1.5">
                        {(exp.items || []).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-2 rounded bg-white border border-[var(--color-border)]/50">
                            <div>
                              <span className="font-medium text-[var(--color-text-primary)]">{item.name}</span>
                              <span className="text-[10px] text-[var(--color-text-muted)] ml-1">
                                ({item.qty} {item.unit} x {formatRupiah(item.price)})
                              </span>
                              {item.addsStock && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-success/10 text-success font-semibold ml-2 border border-success/20">
                                  + {item.stockQty} {item.stockUnit || item.unit} ke stok
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[var(--color-text-primary)] font-semibold">{formatRupiah(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-text-muted)] italic">Tidak ada rincian item (input manual)</p>
                    )}
                  </div>

                  {/* Photo/Proof of Receipt */}
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
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Confidence OCR atau sumber AI terlampir</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-text-muted)] bg-gray-100/50 p-2.5 rounded-lg border border-gray-100">
                    <span>Dicatat oleh: <strong className="text-[var(--color-text-secondary)]">{exp.user || 'Sistem'}</strong></span>
                    <span>-</span>
                    <span>Metode: <strong className="text-[var(--color-text-secondary)]">{exp.sourceType === 'receipt_ai' ? 'Scan Resi AI' : 'Input Manual'}</strong></span>
                    {exp.receiptUploadId && (
                      <>
                        <span>-</span>
                        <span>ID Resi: <strong className="text-[var(--color-text-secondary)] font-mono">{exp.receiptUploadId.substring(0, 8)}...</strong></span>
                      </>
                    )}
                  </div>

                  {/* Action Buttons inside Card */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isExpenseClosed) return;
                        setEditingExpense(exp);
                        setIsModalOpen(true);
                      }}
                      disabled={isExpenseClosed}
                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-white text-xs text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isExpenseClosed ? "Tidak dapat mengedit saat kas tutup" : "Edit Pengeluaran"}
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                    {exp.status !== 'rejected' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isExpenseClosed) return;
                          handleCancelExpense(exp.id);
                        }}
                        disabled={isExpenseClosed}
                        className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-xs text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-1 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isExpenseClosed ? "Tidak dapat membatalkan saat kas tutup" : "Batalkan Pengeluaran"}
                      >
                        <Trash2 size={12} />
                        <span>Batalkan</span>
                      </button>
                    )}
                  </div>
                </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {isModalOpen && (
        <ExpenseModal 
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
                X
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
