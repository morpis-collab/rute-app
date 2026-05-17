import { useState } from 'react';
import { Plus } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah } from '../../utils/formatters';
import { APPROVAL_STATUS } from '../../utils/constants';
import { getBusinessDate } from '../../utils/businessDate';
import ExpenseModal from '../../components/shared/ExpenseModal';

export default function PartnerExpenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const expenses = useAppStore((state) => state.expenses);
  const ingredients = useAppStore((state) => state.ingredients);
  const addExpense = useAppStore((state) => state.addExpense);
  const { user } = useAuthStore();
  
  const businessDate = getBusinessDate();
  const todayExpenses = expenses.filter(e => e.date?.startsWith(businessDate));

  const handleSaveExpense = (data) => {
    addExpense({
      expense: {
        date: businessDate,
        description: data.description,
        total: data.total,
        category: data.category,
        items: data.items,
        user: user?.name || 'Partner',
      }
    });
  };

  return (
    <PageWrapper title="Pengeluaran" subtitle="Catat pengeluaran hari ini">
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full p-4 rounded-xl border-2 border-dashed border-[var(--color-accent-warm)] bg-[var(--color-accent-light)]/20 flex items-center justify-center gap-2 mb-4 hover:bg-[var(--color-accent-light)]/40 transition-colors"
      >
        <Plus size={18} className="text-[var(--color-accent-primary)]" />
        <span className="text-sm font-medium text-[var(--color-accent-primary)]">Tambah Pengeluaran</span>
      </button>

      <h3 className="text-sm font-semibold mb-2 text-[var(--color-text-secondary)]">Pengeluaran Hari Ini</h3>
      <div className="space-y-2">
        {todayExpenses.map(exp => {
          const st = APPROVAL_STATUS[exp.status] || {};
          return (
            <div key={exp.id} className="p-3 rounded-xl bg-white border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{exp.description}</span>
                <span className={`badge badge-${st.variant}`}>{st.label}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>{exp.category.replace('_', ' ')}</span>
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
