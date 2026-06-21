import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ClipboardList,
  PackageCheck,
  ShoppingCart,
  TrendingDown,
} from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import { KpiTile, SectionHeader } from '../../components/common/DashboardPrimitives';
import EmptyState from '../../components/common/EmptyState';
import RecordPurchaseModal from '../../components/shared/RecordPurchaseModal';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import useToastStore from '../../store/useToastStore';
import { buildRestockRecommendations } from '../../services/businessRules';
import { getBusinessDate } from '../../utils/businessDate';
import { formatRupiah } from '../../utils/formatters';

const priorityMeta = {
  kritis: {
    label: 'Kritis',
    badge: 'badge-danger',
    row: 'border-[#EAC1B8] bg-[#FFF7F4]',
  },
  rendah: {
    label: 'Rendah',
    badge: 'badge-warning',
    row: 'border-[#F0D6A8] bg-[#FFF9EC]',
  },
  aman: {
    label: 'Aman',
    badge: 'badge-success',
    row: 'border-[var(--color-border)] bg-white',
  },
};

function formatQty(value, unit) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString('id-ID', { maximumFractionDigits: 3 })} ${unit || ''}`.trim();
}

function uniqueRecipeWarnings(warnings) {
  const seen = new Map();
  (warnings || []).forEach((warning) => {
    const key = `${warning.productId || warning.productName}-${warning.reason}`;
    if (!seen.has(key)) {
      seen.set(key, {
        ...warning,
        totalQty: Number(warning.qty || 0),
        occurrences: 1,
      });
      return;
    }
    const current = seen.get(key);
    seen.set(key, {
      ...current,
      totalQty: Number(current.totalQty || 0) + Number(warning.qty || 0),
      occurrences: Number(current.occurrences || 0) + 1,
    });
  });
  return Array.from(seen.values());
}

export default function OwnerRestockPlanner() {
  const [draftItem, setDraftItem] = useState(null);
  const products = useAppStore((state) => state.products);
  const sales = useAppStore((state) => state.sales);
  const ingredients = useAppStore((state) => state.ingredients);
  const cashSessions = useAppStore((state) => state.cashSessions);
  const addExpense = useAppStore((state) => state.addExpense);
  const reconcileExpenseStock = useAppStore((state) => state.reconcileExpenseStock);
  const { user } = useAuthStore();

  const businessDate = getBusinessDate();
  const isClosed = (cashSessions || []).some((session) => session.date === businessDate && session.status === 'closed');

  const forecast = useMemo(() => buildRestockRecommendations({
    sales,
    products,
    ingredients,
    days: 7,
    asOfDate: businessDate,
  }), [sales, products, ingredients, businessDate]);

  const recommendations = forecast.recommendations || [];
  const recipeWarnings = uniqueRecipeWarnings(forecast.recipeWarnings);
  const needBuy = recommendations.filter((item) => Number(item.recommendedQty || 0) > 0);
  const criticalItems = recommendations.filter((item) => item.priority === 'kritis');
  const belowMinimum = recommendations.filter((item) => Number(item.currentQty || 0) <= Number(item.minQty || 0));
  const estimatedTotal = needBuy.reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0);

  const handleSavePurchase = async (expenseData) => {
    if (isClosed && !expenseData.existingExpenseId) {
      useToastStore.getState().addToast('Gagal mencatat: Kas hari ini sudah ditutup.', 'error');
      throw new Error('Kas hari ini sudah ditutup');
    }
    try {
      if (expenseData.existingExpenseId) {
        await reconcileExpenseStock(expenseData.existingExpenseId, {
          item: expenseData.item,
          user: user?.name || 'Owner',
        });
        useToastStore.getState().addToast('Pengeluaran manual berhasil dihubungkan ke stok', 'success');
      } else {
        await addExpense(expenseData);
        useToastStore.getState().addToast('Belanja bahan dari Restock Planner berhasil dicatat', 'success');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Belanja bahan dari Restock Planner gagal dicatat';
      useToastStore.getState().addToast(message, 'error');
    }
  };

  const openDraft = (item) => {
    if (Number(item.recommendedQty || 0) <= 0) return;
    setDraftItem(item);
  };

  return (
    <PageWrapper title="Restock Planner" subtitle="Proyeksi kebutuhan bahan dari 7 hari penjualan terakhir">
      {isClosed && (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-card)] border border-[#EAC1B8] bg-[#FFF0EC] p-4 text-sm font-semibold text-[#A04434]">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-black">Kas hari ini sudah ditutup</p>
            <p className="mt-1 text-xs opacity-90">Draft pembelian dinonaktifkan untuk menjaga rekonsiliasi kas.</p>
          </div>
        </div>
      )}

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <KpiTile icon={ShoppingCart} label="Perlu Dibeli" value={needBuy.length} helper="Bahan dengan rekomendasi" tone={needBuy.length ? 'orange' : 'green'} />
        <KpiTile icon={ClipboardList} label="Estimasi Biaya" value={formatRupiah(estimatedTotal)} helper="Bisa diedit saat submit" tone="blue" />
        <KpiTile icon={TrendingDown} label="Risiko Habis" value={criticalItems.length} helper="Kritis atau <= 2 hari" tone={criticalItems.length ? 'red' : 'green'} />
        <KpiTile icon={AlertTriangle} label="Di Bawah Minimum" value={belowMinimum.length} helper="Stok <= batas min" tone={belowMinimum.length ? 'red' : 'green'} />
      </div>

      {recipeWarnings.length > 0 && (
        <section className="mb-5 rounded-[var(--radius-card)] border border-[#F0D6A8] bg-[#FFF9EC] p-4">
          <SectionHeader
            title="Perlu Data Resep"
            subtitle={`${recipeWarnings.length} menu/komponen belum bisa dihitung ke stok bahan`}
            action={<Link to="/owner/menu-hpp" className="text-xs font-bold text-[var(--color-band-1)] hover:underline">Lengkapi HPP</Link>}
          />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {recipeWarnings.slice(0, 4).map((warning) => (
              <div key={`${warning.productId || warning.productName}-${warning.reason}`} className="rounded-[var(--radius-card)] border border-[#F0D6A8] bg-white p-3">
                <p className="text-sm font-black text-[var(--color-text-primary)]">{warning.productName}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                  {warning.reason} - {formatQty(warning.totalQty, 'cup')} tercatat di periode ini
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <SectionHeader title="Rekomendasi Bahan" subtitle="Urutan otomatis dari stok paling berisiko">
        <span className="rounded-[var(--radius-button)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--color-text-secondary)]">
          7 Hari
        </span>
      </SectionHeader>

      <div className="visual-panel mt-3 p-0">
        {recommendations.length === 0 ? (
          <div className="p-6">
            <EmptyState message="Belum ada bahan baku." sub="Tambahkan bahan di Gudang Bahan untuk mulai membuat proyeksi restock." icon={<PackageCheck size={22} />} />
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {recommendations.map((item) => (
              <RestockRow
                key={item.ingredientId}
                item={item}
                disabled={Number(item.recommendedQty || 0) <= 0}
                onDraft={() => openDraft(item)}
              />
            ))}
          </div>
        )}
      </div>

      {draftItem && (
        <RecordPurchaseModal
          isOpen={!!draftItem}
          onClose={() => setDraftItem(null)}
          onSave={handleSavePurchase}
          preselectedIngredientId={draftItem.ingredientId}
          initialQty={draftItem.recommendedQty}
          initialUnit={draftItem.unit}
          initialTotal={Number(draftItem.estimatedCost || 0) > 0 ? draftItem.estimatedCost : ''}
          initialNote={`Draft Restock Planner 7 hari oleh ${user?.name || 'Owner'}`}
        />
      )}
    </PageWrapper>
  );
}

function RestockRow({ item, disabled, onDraft }) {
  const meta = priorityMeta[item.priority] || priorityMeta.aman;
  const coverageLabel = item.daysCoverage == null ? '-' : `${item.daysCoverage.toLocaleString('id-ID', { maximumFractionDigits: 1 })} hari`;

  return (
    <div className={`grid gap-4 p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(220px,1fr)_auto] sm:items-center ${meta.row}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-black text-[var(--color-text-primary)]">{item.ingredientName}</p>
          <span className={`badge ${meta.badge}`}>{meta.label}</span>
        </div>
        <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">{item.reason}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <Metric label="Stok" value={formatQty(item.currentQty, item.unit)} />
        <Metric label="Min" value={formatQty(item.minQty, item.unit)} />
        <Metric label="Pakai/Hari" value={formatQty(item.avgDailyUsage, item.unit)} />
        <Metric label="Coverage" value={coverageLabel} />
        <Metric label="Proyeksi 7 Hari" value={formatQty(item.projectedUsage7d, item.unit)} />
        <Metric label="Saran Beli" value={formatQty(item.recommendedQty, item.unit)} highlight />
        <Metric label="Estimasi" value={formatRupiah(item.estimatedCost)} highlight />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDraft}
          disabled={disabled}
          className="btn btn-primary min-h-[44px] text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingCart size={16} /> Buat Pembelian
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight = false }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-white/75 p-2">
      <p className="text-[9px] font-extrabold uppercase text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-1 font-mono text-[11px] font-black ${highlight ? 'text-[var(--color-band-1)]' : 'text-[var(--color-text-primary)]'}`}>
        {value}
      </p>
    </div>
  );
}
