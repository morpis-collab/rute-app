import { useMemo, useState } from 'react';
import { History, Package, Plus } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import { KpiTile, SectionHeader } from '../../components/common/DashboardPrimitives';
import useAppStore from '../../store/useAppStore';
import { formatRupiah } from '../../utils/formatters';
import { getIngredientTone } from '../../utils/productVisuals';
import RecordPurchaseModal from '../../components/shared/RecordPurchaseModal';
import PurchaseHistoryModal from '../../components/shared/PurchaseHistoryModal';
import useToastStore from '../../store/useToastStore';

export default function PartnerStock() {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);

  const ingredients = useAppStore((state) => state.ingredients);
  const addExpense = useAppStore((state) => state.addExpense);
  const criticalCount = useMemo(() => (ingredients || []).filter((item) => item.status === 'kritis' || Number(item.stock || 0) <= Number(item.minStock || 0)).length, [ingredients]);

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
    <PageWrapper title="Gudang Bahan" subtitle="Pantau harga modal dan catat belanja">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <KpiTile icon={Package} label="Total Bahan" value={(ingredients || []).length} helper="Aktif" tone="blue" compact />
        <KpiTile icon={Package} label="Stok Kritis" value={criticalCount} helper="Perlu restock" tone={criticalCount ? 'red' : 'green'} compact />
      </div>

      <button onClick={() => handleOpenPurchase(null)} className="btn btn-primary mb-5 w-full">
        <Plus size={18} /> Catat Belanja Bahan
      </button>

      <SectionHeader title="Daftar Bahan" subtitle="Tekan bahan untuk lihat riwayat atau catat belanja" />
      <div className="space-y-2">
        {(ingredients || []).map((item) => {
          const tone = getIngredientTone(item);
          return (
            <div key={item.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: tone.tone, color: tone.accent }}>
                  <Package size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-black text-[var(--color-text-primary)]">{item.name}</p>
                    <span className={`badge ${tone.label === 'Kritis' ? 'badge-danger' : 'badge-success'}`}>{tone.label}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs font-bold text-[var(--color-text-muted)]">
                    {item.costPerUnit ? `${formatRupiah(item.costPerUnit)} / ${item.unit}` : 'Belum ada harga'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleOpenPurchase(item.id)} className="touch-target rounded-[var(--radius-button)] text-[var(--color-band-1)] hover:bg-[var(--color-band-4)]" title="Belanja bahan ini">
                    <Plus size={17} className="mx-auto" />
                  </button>
                  <button onClick={() => handleOpenHistory(item.id)} className="touch-target rounded-[var(--radius-button)] text-[var(--color-text-secondary)] hover:bg-[var(--color-coffee-milk)]" title="Riwayat belanja">
                    <History size={17} className="mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
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
        <PurchaseHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} ingredientId={selectedIngredientId} />
      )}
    </PageWrapper>
  );
}
