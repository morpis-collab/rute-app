import { useState } from 'react';
import { Plus, History } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah } from '../../utils/formatters';
import RecordPurchaseModal from '../../components/shared/RecordPurchaseModal';
import PurchaseHistoryModal from '../../components/shared/PurchaseHistoryModal';
import useToastStore from '../../store/useToastStore';

export default function PartnerStock() {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);

  const ingredients = useAppStore((state) => state.ingredients);
  const addExpense = useAppStore((state) => state.addExpense);

  const handleSavePurchase = async (expenseData) => {
    try {
      await addExpense(expenseData);
      useToastStore.getState().addToast('Belanja bahan berhasil dicatat', 'success');
    } catch {
      // Error handled globally
    }
  };

  const handleOpenPurchase = (id = null) => {
    setSelectedIngredientId(id);
    setIsPurchaseModalOpen(true);
  };

  const handleOpenHistory = (id) => {
    setSelectedIngredientId(id);
    setIsHistoryModalOpen(true);
  };

  return (
    <PageWrapper title="Gudang & Harga Bahan" subtitle="Pantau harga modal & catat belanja">
      <div className="mb-4">
        <button
          onClick={() => handleOpenPurchase(null)}
          className="w-full py-3 px-4 rounded-xl bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-secondary)] text-white font-bold flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
        >
          <Plus size={18} />
          Catat Belanja Bahan Baku
        </button>
      </div>

      <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden shadow-[var(--shadow-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FAF8F5] border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
            <tr>
              <th className="p-3 font-semibold">Bahan</th>
              <th className="p-3 font-semibold text-right">Harga Modal</th>
              <th className="p-3 font-semibold text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {ingredients.map(item => (
              <tr key={item.id} className="hover:bg-[#FDFCFB] transition-colors">
                <td className="p-3">
                  <div className="font-bold text-[var(--color-text-primary)]">{item.name}</div>
                  <div className="text-[10px] text-[var(--color-text-secondary)] mt-0.5 capitalize">
                    {item.category === 'bahan_baku' ? 'Bahan Baku' : item.category === 'packaging' ? 'Packaging' : item.category}
                  </div>
                </td>
                <td className="p-3 text-right">
                  <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">
                    {item.costPerUnit ? `${formatRupiah(item.costPerUnit)} / ${item.unit}` : 'Rp 0'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button 
                      onClick={() => handleOpenPurchase(item.id)} 
                      className="p-1.5 text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-light)]/20 rounded-lg cursor-pointer"
                      title="Belanja Bahan ini"
                    >
                      <Plus size={16} />
                    </button>
                    <button 
                      onClick={() => handleOpenHistory(item.id)} 
                      className="p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] rounded-lg cursor-pointer"
                      title="Riwayat Belanja"
                    >
                      <History size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPurchaseModalOpen && (
        <RecordPurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          onSave={handleSavePurchase}
          preselectedIngredientId={selectedIngredientId}
        />
      )}
      
      {isHistoryModalOpen && (
        <PurchaseHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          ingredientId={selectedIngredientId}
        />
      )}
    </PageWrapper>
  );
}
