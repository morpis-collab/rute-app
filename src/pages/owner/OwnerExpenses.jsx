import { useState } from 'react';
import { Plus } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah, formatTanggalSingkat } from '../../utils/formatters';
import { APPROVAL_STATUS } from '../../utils/constants';
import ExpenseModal from '../../components/shared/ExpenseModal';

export default function OwnerExpenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const expenses = useAppStore((state) => state.expenses);
  const ingredients = useAppStore((state) => state.ingredients);
  const addExpense = useAppStore((state) => state.addExpense);
  const { user } = useAuthStore();

  const handleSaveExpense = (data) => {
    addExpense({
      expense: {
        date: new Date().toISOString(), // Owner records actual time
        description: data.description,
        total: data.total,
        category: data.category,
        items: data.items,
        user: user?.name || 'Owner',
      }
    });
  };

  return (
    <PageWrapper title="Pengeluaran" subtitle="Semua pengeluaran usaha">
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full lg:w-auto px-4 py-2.5 rounded-xl border-2 border-[var(--color-accent-warm)] bg-[var(--color-accent-light)]/20 flex items-center justify-center gap-2 mb-6 hover:bg-[var(--color-accent-light)]/40 transition-colors"
      >
        <Plus size={18} className="text-[var(--color-accent-primary)]" />
        <span className="text-sm font-medium text-[var(--color-accent-primary)]">Tambah Pengeluaran Manual</span>
      </button>

      <div className="space-y-2">
        {expenses.map(exp => {
          const st = APPROVAL_STATUS[exp.status] || {};
          return (
            <div key={exp.id} className="p-3 rounded-xl bg-white border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{exp.description}</span>
                <span className={`badge badge-${st.variant}`}>{st.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <span>{formatTanggalSingkat(exp.date)} · {exp.category.replace('_', ' ')}</span>
                <span className="font-mono font-semibold text-[var(--color-text-primary)]">{formatRupiah(exp.total)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <ExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveExpense}
        ingredients={ingredients}
      />
    </PageWrapper>
  );
}
