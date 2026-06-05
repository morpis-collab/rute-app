import { useState } from 'react';
import { Package, Plus, Trash2, History } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah } from '../../utils/formatters';
import RecordPurchaseModal from '../../components/shared/RecordPurchaseModal';
import PurchaseHistoryModal from '../../components/shared/PurchaseHistoryModal';
import IngredientModal from '../../components/shared/IngredientModal';
import useToastStore from '../../store/useToastStore';

export default function OwnerStock() {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);

  const ingredients = useAppStore((state) => state.ingredients);
  const addExpense = useAppStore((state) => state.addExpense);
  const addIngredient = useAppStore((state) => state.addIngredient);
  const removeIngredient = useAppStore((state) => state.removeIngredient);
  const { user } = useAuthStore();

  const handleSavePurchase = async (expenseData) => {
    try {
      await addExpense(expenseData);
      useToastStore.getState().addToast('Belanja bahan berhasil dicatat', 'success');
    } catch {
      // Error handled globally
    }
  };

  const handleSaveIngredient = async (data) => {
    try {
      await addIngredient({
        ...data,
        user: user?.name || 'Owner',
      });
      useToastStore.getState().addToast('Bahan baku berhasil ditambahkan', 'success');
    } catch (error) {
      const message = error.response?.data?.error || 'Bahan baku gagal ditambahkan';
      useToastStore.getState().addToast(message, 'error');
      throw error;
    }
  };

  const handleDeleteIngredient = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus bahan baku "${name}"?`)) {
      try {
        await removeIngredient(id);
        useToastStore.getState().addToast(`Bahan baku "${name}" berhasil dihapus`, 'success');
      } catch (error) {
        const message = error.response?.data?.error || 'Bahan baku gagal dihapus';
        useToastStore.getState().addToast(message, 'error');
      }
    }
  };

  const handleOpenHistory = (id) => {
    setSelectedIngredientId(id);
    setIsHistoryModalOpen(true);
  };

  const formatCategory = (cat) => {
    if (cat === 'bahan_baku') return 'Bahan Baku';
    if (cat === 'packaging') return 'Packaging';
    if (cat === 'operational') return 'Operasional';
    return cat || 'Bahan Baku';
  };

  return (
    <PageWrapper title="Gudang & Harga Bahan" subtitle="Pantau harga modal rata-rata & riwayat pembelian">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setIsPurchaseModalOpen(true)}
          className="px-4 py-2.5 rounded-xl border-2 border-[var(--color-accent-warm)] bg-[var(--color-accent-light)]/20 flex items-center justify-center gap-2 hover:bg-[var(--color-accent-light)]/40 transition-colors cursor-pointer"
        >
          <Plus size={18} className="text-[var(--color-accent-primary)]" />
          <span className="text-sm font-semibold text-[var(--color-accent-primary)]">Catat Belanja Bahan</span>
        </button>
        <button
          onClick={() => setIsIngredientModalOpen(true)}
          className="px-4 py-2.5 rounded-xl border-2 border-[var(--color-border)] bg-white flex items-center justify-center gap-2 hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
        >
          <Package size={18} className="text-[var(--color-text-secondary)]" />
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">Tambah Bahan Baku Baru</span>
        </button>
      </div>

      <div className="space-y-2">
        {!ingredients || ingredients.length === 0 ? (
          <div className="p-4 rounded-xl bg-white border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] text-center">
            Belum ada bahan baku. Tekan Tambah Bahan Baku Baru untuk mendaftarkan bahan pertama Anda.
          </div>
        ) : (
          ingredients.map(item => (
            <div key={item.id} className="p-4 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-between gap-3 hover:shadow-[var(--shadow)] transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-light)]/30 flex items-center justify-center shrink-0">
                  <Package size={18} className="text-[var(--color-accent-primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">{item.name}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                      {formatCategory(item.category)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                    <span>Harga Modal Rata-rata:</span>
                    <span className="font-mono font-bold text-[var(--color-text-primary)]">
                      {item.costPerUnit ? `${formatRupiah(item.costPerUnit)} / ${item.unit}` : 'Belum ada riwayat belanja'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenHistory(item.id)}
                  className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-accent-primary)] transition-all cursor-pointer"
                  title="Lihat Riwayat Belanja"
                >
                  <History size={16} />
                </button>
                <button
                  onClick={() => handleDeleteIngredient(item.id, item.name)}
                  className="p-2 rounded-lg text-[var(--color-accent-red)] hover:bg-red-50 transition-all cursor-pointer"
                  title="Hapus Bahan"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isPurchaseModalOpen && (
        <RecordPurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          onSave={handleSavePurchase}
        />
      )}
      
      {isHistoryModalOpen && (
        <PurchaseHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          ingredientId={selectedIngredientId}
        />
      )}

      <IngredientModal
        isOpen={isIngredientModalOpen}
        onClose={() => setIsIngredientModalOpen(false)}
        onSave={handleSaveIngredient}
      />
    </PageWrapper>
  );
}
