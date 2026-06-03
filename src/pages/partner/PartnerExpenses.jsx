import { useState } from 'react';
import { Plus, Camera, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah } from '../../utils/formatters';
import { APPROVAL_STATUS } from '../../utils/constants';
import { getBusinessDate } from '../../utils/businessDate';
import ExpenseModal from '../../components/shared/ExpenseModal';
import useToastStore from '../../store/useToastStore';

export default function PartnerExpenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const expenses = useAppStore((state) => state.expenses);
  const ingredients = useAppStore((state) => state.ingredients);
  const addExpense = useAppStore((state) => state.addExpense);
  const updateExpense = useAppStore((state) => state.updateExpense);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const businessDate = getBusinessDate();
  const todayExpenses = expenses.filter(e => e.date?.startsWith(businessDate));

  const handleSaveExpense = async (data) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          description: data.description,
          total: data.total,
          category: data.category,
          date: data.date,
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
            user: user?.name || 'Partner',
          }
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
          return (
            <div key={exp.id} className="p-3 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{exp.description}</span>
                  <span className={`badge badge-${st.variant}`}>{st.label}</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>{exp.category.replace('_', ' ')}</span>
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

      <ExpenseModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSave={handleSaveExpense}
        expense={editingExpense}
      />
    </PageWrapper>
  );
}
