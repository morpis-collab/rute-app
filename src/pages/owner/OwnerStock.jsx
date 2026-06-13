import { useMemo, useState } from 'react';
import { AlertTriangle, History, Package, Plus, Trash2 } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import { KpiTile, SectionHeader } from '../../components/common/DashboardPrimitives';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah } from '../../utils/formatters';
import { getIngredientTone } from '../../utils/productVisuals';
import RecordPurchaseModal from '../../components/shared/RecordPurchaseModal';
import PurchaseHistoryModal from '../../components/shared/PurchaseHistoryModal';
import IngredientModal from '../../components/shared/IngredientModal';
import useToastStore from '../../store/useToastStore';
import { getBusinessDate } from '../../utils/businessDate';

export default function OwnerStock() {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [selectedIngredientId, setSelectedIngredientId] = useState(null);

  const ingredients = useAppStore((state) => state.ingredients);
  const cashSessions = useAppStore((state) => state.cashSessions);
  const addExpense = useAppStore((state) => state.addExpense);
  const addIngredient = useAppStore((state) => state.addIngredient);
  const removeIngredient = useAppStore((state) => state.removeIngredient);
  const { user } = useAuthStore();

  const todayBusinessDate = getBusinessDate();
  const isClosed = cashSessions.some((session) => session.date === todayBusinessDate && session.status === 'closed');
  const criticalItems = useMemo(() => (ingredients || []).filter((item) => item.status === 'kritis' || Number(item.stock || 0) <= Number(item.minStock || 0)), [ingredients]);
  const packagingCount = useMemo(() => (ingredients || []).filter((item) => String(item.category || '').includes('packaging')).length, [ingredients]);
  const averageCost = useMemo(() => {
    if (!ingredients?.length) return 0;
    return ingredients.reduce((sum, item) => sum + Number(item.costPerUnit || 0), 0) / ingredients.length;
  }, [ingredients]);

  const handleSavePurchase = async (expenseData) => {
    if (isClosed) {
      useToastStore.getState().addToast('Gagal mencatat: Kas hari ini sudah ditutup.', 'error');
      return;
    }
    try {
      await addExpense(expenseData);
      useToastStore.getState().addToast('Belanja bahan berhasil dicatat', 'success');
    } catch {
      // Error handled globally
    }
  };

  const handleSaveIngredient = async (data) => {
    try {
      await addIngredient({ ...data, user: user?.name || 'Owner' });
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

  return (
    <PageWrapper title="Gudang Bahan" subtitle="Pantau stok, harga modal, dan riwayat pembelian">
      {isClosed && (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-[#EAC1B8] bg-[#FFF0EC] p-4 text-sm font-semibold text-[#A04434]">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-black">Sesi kasir hari ini sudah ditutup</p>
            <p className="mt-1 text-xs opacity-90">Belanja bahan baru dinonaktifkan untuk menjaga rekonsiliasi kas.</p>
          </div>
        </div>
      )}

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <KpiTile icon={Package} label="Total Bahan" value={(ingredients || []).length} helper="Bahan aktif" tone="blue" />
        <KpiTile icon={AlertTriangle} label="Stok Kritis" value={criticalItems.length} helper="Butuh perhatian" tone={criticalItems.length ? 'red' : 'green'} />
        <KpiTile icon={Package} label="Harga Modal Rata-rata" value={formatRupiah(averageCost)} helper={`${packagingCount} packaging`} tone="orange" />
      </div>

      <SectionHeader title="Daftar Bahan" subtitle="Harga modal rata-rata mengikuti riwayat belanja">
        <button
          onClick={() => !isClosed && setIsPurchaseModalOpen(true)}
          disabled={isClosed}
          className="btn btn-primary text-xs"
        >
          <Plus size={16} /> Catat Belanja
        </button>
        <button onClick={() => setIsIngredientModalOpen(true)} className="btn btn-secondary text-xs">
          <Package size={16} /> Tambah Bahan
        </button>
      </SectionHeader>

      <div className="visual-panel p-0">
        {!ingredients || ingredients.length === 0 ? (
          <div className="p-6 text-center text-sm font-semibold text-[var(--color-text-muted)]">
            Belum ada bahan baku. Tambahkan bahan pertama untuk mulai menghitung HPP.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {ingredients.map((item) => (
              <IngredientRow
                key={item.id}
                item={item}
                onHistory={() => handleOpenHistory(item.id)}
                onDelete={() => handleDeleteIngredient(item.id, item.name)}
              />
            ))}
          </div>
        )}
      </div>

      {isPurchaseModalOpen && (
        <RecordPurchaseModal isOpen={isPurchaseModalOpen} onClose={() => setIsPurchaseModalOpen(false)} onSave={handleSavePurchase} />
      )}

      {isHistoryModalOpen && (
        <PurchaseHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} ingredientId={selectedIngredientId} />
      )}

      <IngredientModal isOpen={isIngredientModalOpen} onClose={() => setIsIngredientModalOpen(false)} onSave={handleSaveIngredient} />
    </PageWrapper>
  );
}

function IngredientRow({ item, onHistory, onDelete }) {
  const tone = getIngredientTone(item);
  const stock = Number(item.stock || 0);
  const minStock = Number(item.minStock || 0);
  const pct = minStock > 0 ? Math.min(100, Math.round((stock / minStock) * 100)) : 100;

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.8fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: tone.tone, color: tone.accent }}>
          <Package size={20} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-[var(--color-text-primary)]">{item.name}</p>
            <span className="badge badge-info">{formatCategory(item.category)}</span>
            <span className={`badge ${tone.label === 'Kritis' ? 'badge-danger' : 'badge-success'}`}>{tone.label}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
            Modal: <span className="font-mono text-[var(--color-text-primary)]">{item.costPerUnit ? `${formatRupiah(item.costPerUnit)} / ${item.unit}` : 'Belum ada riwayat'}</span>
          </p>
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs font-bold text-[var(--color-text-secondary)]">
          <span>Stok</span>
          <span className="font-mono">{stock} / min {minStock} {item.unit}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-coffee-milk)]">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone.accent }} />
        </div>
      </div>
      <div className="flex justify-end gap-1">
        <button onClick={onHistory} className="touch-target rounded-[var(--radius-button)] text-[var(--color-text-secondary)] hover:bg-[var(--color-coffee-milk)]" title="Riwayat Belanja">
          <History size={17} className="mx-auto" />
        </button>
        <button onClick={onDelete} className="touch-target rounded-[var(--radius-button)] text-[var(--color-accent-red)] hover:bg-[#FFF0EC]" title="Hapus Bahan">
          <Trash2 size={17} className="mx-auto" />
        </button>
      </div>
    </div>
  );
}

function formatCategory(category) {
  if (category === 'bahan_baku') return 'Bahan Baku';
  if (category === 'packaging') return 'Packaging';
  if (category === 'operational') return 'Operasional';
  return category || 'Bahan Baku';
}
