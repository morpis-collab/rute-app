import { useState } from 'react';
import { Plus, Camera, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah, getPhotoUrl } from '../../utils/formatters';
import { APPROVAL_STATUS } from '../../utils/constants';
import { getBusinessDate } from '../../utils/businessDate';
import ExpenseModal from '../../components/shared/ExpenseModal';
import useToastStore from '../../store/useToastStore';

export default function PartnerExpenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [activePhotoUrl, setActivePhotoUrl] = useState(null);
  const expenses = useAppStore((state) => state.expenses);
  const cashAccounts = useAppStore((state) => state.cashAccounts);
  const addExpense = useAppStore((state) => state.addExpense);
  const updateExpense = useAppStore((state) => state.updateExpense);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const businessDate = getBusinessDate();
  const todayExpenses = expenses.filter(e => e.date?.startsWith(businessDate));

  const getCashAccountLabel = (cashAccountId) => {
    const account = cashAccounts.find(a => String(a.id) === String(cashAccountId));
    if (!account) return 'Tunai';
    if (account.type === 'cash') return 'Tunai';
    if (account.type === 'qris') return 'QRIS';
    return account.name;
  };

  const handleSaveExpense = async (data) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          description: data.description,
          total: data.total,
          category: data.category,
          date: data.date,
          cashAccountId: data.cashAccountId,
          user: user?.name || 'Partner',
        });
        useToastStore.getState().addToast('Pengeluaran berhasil diperbarui', 'success');
      } else {
        await addExpense({
          expense: {
            date: data.date || businessDate,
            description: data.description,
            total: data.total,
            category: data.category,
            items: data.items,
            cashAccountId: data.cashAccountId,
            user: user?.name || 'Partner',
          },
          cashAccountId: data.cashAccountId,
        });
        useToastStore.getState().addToast('Pengeluaran berhasil disimpan', 'success');
      }
    } catch {
      // Error handled by global interceptor
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  return (
    <PageWrapper title="Pengeluaran" subtitle="Catat pengeluaran hari ini">
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate('/partner/receipt')}
          className="p-4 rounded-xl border border-[var(--color-border)] bg-white flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md hover:bg-gray-50/50 transition-all text-center cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--color-accent-light)]/30 flex items-center justify-center text-[var(--color-accent-primary)]">
            <Camera size={20} />
          </div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Scan Resi AI</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">Upload foto resi otomatis</span>
        </button>

        <button
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
          className="p-4 rounded-xl border border-[var(--color-border)] bg-white flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md hover:bg-gray-50/50 transition-all text-center cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--color-band-4)]/30 flex items-center justify-center text-[var(--color-band-1)]">
            <Plus size={20} />
          </div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Catat Manual</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">Input tanpa resi fisik</span>
        </button>
      </div>

      <h3 className="text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Pengeluaran Hari Ini</h3>
      <div className="space-y-2">
        {todayExpenses.map(exp => {
          const st = APPROVAL_STATUS[exp.status] || {};
          const isExpanded = expandedExpenseId === exp.id;
          return (
            <div 
              key={exp.id} 
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
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                    <span>{(exp.category || '').replace('_', ' ')} · {getCashAccountLabel(exp.cashAccountId)}</span>
                    <span className="font-mono font-bold text-sm text-[var(--color-accent-primary)]">{formatRupiah(exp.total)}</span>
                  </div>
                </div>
                
                {/* Chevron Toggle */}
                <div className="text-gray-400 p-1 shrink-0">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expanded Area */}
              {isExpanded && (
                <div className="px-3.5 pb-4 border-t border-[var(--color-border)] space-y-3.5 bg-gray-50/30 pt-3.5 fade-in">
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
                    <span>•</span>
                    <span>Metode: <strong className="text-[var(--color-text-secondary)]">{exp.sourceType === 'receipt_ai' ? 'Scan Resi AI' : 'Input Manual'}</strong></span>
                    {exp.receiptUploadId && (
                      <>
                        <span>•</span>
                        <span>ID Resi: <strong className="text-[var(--color-text-secondary)] font-mono">{exp.receiptUploadId.substring(0, 8)}...</strong></span>
                      </>
                    )}
                  </div>

                  {/* Action Buttons inside Card */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-dashed border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingExpense(exp);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-white text-xs text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1 cursor-pointer font-medium"
                      title="Edit Pengeluaran"
                    >
                      <Edit2 size={12} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
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
      {activePhotoUrl && (
        <div 
          onClick={() => setActivePhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs transition-all duration-200 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl p-2 shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
            <img 
              src={getPhotoUrl(activePhotoUrl)} 
              alt="Bukti Resi Besar" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg" 
            />
            <button 
              onClick={() => setActivePhotoUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center font-bold text-sm border hover:bg-gray-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
