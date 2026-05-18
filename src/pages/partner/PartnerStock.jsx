import { useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatUnit } from '../../utils/formatters';
import StockAdjustmentModal from '../../components/shared/StockAdjustmentModal';
import useToastStore from '../../store/useToastStore';

export default function PartnerStock() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const ingredients = useAppStore((state) => state.ingredients);
  const adjustStock = useAppStore((state) => state.adjustStock);
  const { user } = useAuthStore();

  const handleSaveStock = async (data) => {
    try {
      await adjustStock({
        ...data,
        user: user?.name || 'Partner',
      });
      useToastStore.getState().addToast('Koreksi stok berhasil disimpan', 'success');
    } catch {
      // Error handled globally
    }
  };

  return (
    <PageWrapper title="Stok" subtitle="Update sisa bahan baku">
      <div className="bg-white border border-[var(--color-border)] rounded overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAFAFA] border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
            <tr>
              <th className="p-3 font-medium">Bahan</th>
              <th className="p-3 font-medium text-right">Stok</th>
              <th className="p-3 font-medium text-center w-12">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {ingredients.map(item => (
              <tr key={item.id}>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--color-text-primary)]">{item.name}</span>
                    {item.status === 'kritis' && <AlertTriangle size={12} className="text-[var(--color-warning)]" />}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <span className={`font-mono text-xs ${item.status === 'kritis' ? 'text-[var(--color-warning)] font-bold' : 'text-[var(--color-text-secondary)]'}`}>
                    {formatUnit(item.stockCurrent ?? item.stock, item.unit)}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => setIsModalOpen(true)} className="p-1 text-[var(--color-info)] hover:bg-[#F5F5F5] rounded">
                    <Plus size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
