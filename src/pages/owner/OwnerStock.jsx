import { useState } from 'react';
import { Package, AlertTriangle, Plus } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatUnit } from '../../utils/formatters';
import StockAdjustmentModal from '../../components/shared/StockAdjustmentModal';

export default function OwnerStock() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const ingredients = useAppStore((state) => state.ingredients);
  const adjustStock = useAppStore((state) => state.adjustStock);
  const { user } = useAuthStore();
  const getPercent = (stock, min) => Math.min((stock / (min * 2)) * 100, 100);

  const handleSaveStock = (data) => {
    adjustStock({
      ...data,
      user: user?.name || 'Owner',
    });
  };

  return (
    <PageWrapper title="Stok Bahan Baku" subtitle="Status stok real-time">
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full lg:w-auto px-4 py-2.5 rounded-xl border-2 border-[var(--color-accent-warm)] bg-[var(--color-accent-light)]/20 flex items-center justify-center gap-2 mb-6 hover:bg-[var(--color-accent-light)]/40 transition-colors"
      >
        <Plus size={18} className="text-[var(--color-accent-primary)]" />
        <span className="text-sm font-medium text-[var(--color-accent-primary)]">Koreksi / Tambah Stok</span>
      </button>

      <div className="space-y-2">
        {ingredients.map(item => (
          <div key={item.id} className="p-3 rounded-xl bg-white border border-[var(--color-border)] flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.status === 'kritis' ? 'bg-[var(--color-danger)]/10' : 'bg-[var(--color-success)]/10'}`}>
              {item.status === 'kritis' ? <AlertTriangle size={18} className="text-[var(--color-danger)]" /> : <Package size={18} className="text-[var(--color-success)]" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{item.name}</span>
                <span className={`badge badge-${item.status === 'kritis' ? 'danger' : 'success'}`}>{item.status === 'kritis' ? 'Kritis' : 'Aman'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <span className="font-mono font-semibold text-[var(--color-text-primary)]">{formatUnit(item.stock, item.unit)}</span>
                <span>/ min {formatUnit(item.minStock, item.unit)}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-[var(--color-bg-secondary)] overflow-hidden">
                <div className={`h-full rounded-full ${item.status === 'kritis' ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-success)]'}`} style={{width: `${getPercent(item.stock, item.minStock)}%`}} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <StockAdjustmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveStock}
        ingredients={ingredients}
      />
    </PageWrapper>
  );
}
