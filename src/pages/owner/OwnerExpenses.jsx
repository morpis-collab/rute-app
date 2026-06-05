import { useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah, formatTanggalSingkat } from '../../utils/formatters';
import { APPROVAL_STATUS } from '../../utils/constants';
import ExpenseModal from '../../components/shared/ExpenseModal';
import useToastStore from '../../store/useToastStore';

export default function OwnerExpenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const expenses = useAppStore((state) => state.expenses);
  const cashAccounts = useAppStore((state) => state.cashAccounts);
  const addExpense = useAppStore((state) => state.addExpense);
  const updateExpense = useAppStore((state) => state.updateExpense);
  const { user } = useAuthStore();

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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  return (
    <PageWrapper title="Pengeluaran" subtitle="Semua pengeluaran usaha">
      <button 
        onClick={() => {
          setEditingExpense(null);
          setIsModalOpen(true);
        }}
        className="w-full lg:w-auto px-4 py-2.5 rounded-xl border-2 border-[var(--color-accent-warm)] bg-[var(--color-accent-light)]/20 flex items-center justify-center gap-2 mb-6 hover:bg-[var(--color-accent-light)]/40 transition-colors cursor-pointer"
      >
        <Plus size={18} className="text-[var(--color-accent-primary)]" />
        <span className="text-sm font-medium text-[var(--color-accent-primary)]">Tambah Pengeluaran Manual</span>
      </button>

      <div className="space-y-2">
        {expenses.map(exp => {
          const st = APPROVAL_STATUS[exp.status] || {};
          return (
            <div key={exp.id} className="p-3 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{exp.description}</span>
                  <span className={`badge badge-${st.variant}`}>{st.label}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span>{formatTanggalSingkat(exp.date)} · {exp.category.replace('_', ' ')} · {getCashAccountLabel(exp.cashAccountId)}</span>
                  <span className="font-mono font-semibold text-[var(--color-text-primary)]">{formatRupiah(exp.total)}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingExpense(exp);
                  setIsModalOpen(true);
                }}
                className="p-2 rounded-lg hover:bg-gray-50 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shrink-0 cursor-pointer"
                title="Edit Pengeluaran"
              >
                <Edit2 size={16} />
              </button>
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
    </PageWrapper>
  );
}
