import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Package, TrendingUp, Star } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PageWrapper from '../../components/layout/PageWrapper';
import IngredientModal from '../../components/shared/IngredientModal';
import useAppStore from '../../store/useAppStore';
import { formatRupiah } from '../../utils/formatters';
import useToastStore from '../../store/useToastStore';
import { softSpring, tapPress } from '../../utils/motion';

const CATEGORY_LABELS = {
  bahan_baku: 'Bahan Baku',
  packaging: 'Packaging',
  operasional: 'Operasional',
  lainnya: 'Lainnya',
};

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-xl bg-white border border-[var(--color-border)] p-4 flex items-start gap-3">
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: accent + '20', color: accent }}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase text-[var(--color-text-muted)] mb-0.5">{label}</p>
        <p className="text-lg font-black font-mono text-[var(--color-text-primary)] leading-tight truncate">{value}</p>
        {sub && <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function OwnerStock() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('semua');
  const shouldReduceMotion = useReducedMotion();

  const ingredients = useAppStore((state) => state.ingredients || []);
  const addIngredient = useAppStore((state) => state.addIngredient);
  const updateIngredient = useAppStore((state) => state.updateIngredient);
  const deleteIngredient = useAppStore((state) => state.deleteIngredient);

  // KPI calculations
  const totalCount = ingredients.length;
  const avgCost = useMemo(() => {
    if (!ingredients.length) return 0;
    return ingredients.reduce((s, i) => s + Number(i.costPerUnit || 0), 0) / ingredients.length;
  }, [ingredients]);
  const mostExpensive = useMemo(() => {
    if (!ingredients.length) return null;
    return ingredients.reduce((best, i) => (Number(i.costPerUnit || 0) > Number(best.costPerUnit || 0) ? i : best), ingredients[0]);
  }, [ingredients]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ingredients.filter((ing) => {
      const matchSearch =
        !q ||
        (ing.name || '').toLowerCase().includes(q) ||
        (ing.notes || '').toLowerCase().includes(q) ||
        (CATEGORY_LABELS[ing.category] || '').toLowerCase().includes(q);
      const matchCat = filterCategory === 'semua' || ing.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [ingredients, search, filterCategory]);

  const handleSave = async (data) => {
    try {
      if (editingIngredient) {
        await updateIngredient(editingIngredient.id, data);
        useToastStore.getState().addToast('Bahan baku berhasil diperbarui', 'success');
      } else {
        await addIngredient(data);
        useToastStore.getState().addToast('Bahan baku berhasil ditambahkan', 'success');
      }
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast('Gagal menyimpan bahan baku', 'error');
      throw err;
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Hapus bahan baku "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      try {
        await deleteIngredient(id);
        useToastStore.getState().addToast(`"${name}" berhasil dihapus`, 'success');
      } catch (err) {
        console.error(err);
        useToastStore.getState().addToast('Gagal menghapus bahan baku', 'error');
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingIngredient(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (ing) => {
    setEditingIngredient(ing);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingIngredient(null);
  };

  return (
    <PageWrapper title="Master Bahan" subtitle="Kelola daftar bahan baku dan harga modal">
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <KpiCard
          icon={Package}
          label="Total Bahan"
          value={totalCount}
          sub="bahan baku terdaftar"
          accent="var(--color-band-1)"
        />
        <KpiCard
          icon={TrendingUp}
          label="Rata-rata Harga Modal"
          value={formatRupiah(avgCost)}
          sub="per satuan unit"
          accent="#059669"
        />
        <KpiCard
          icon={Star}
          label="Bahan Termahal"
          value={mostExpensive ? formatRupiah(mostExpensive.costPerUnit || 0) : 'Rp 0'}
          sub={mostExpensive ? mostExpensive.name : 'Belum ada data'}
          accent="#d97706"
        />
      </div>

      {/* Add Button */}
      <motion.button
        onClick={handleOpenAdd}
        whileTap={shouldReduceMotion ? undefined : tapPress}
        transition={softSpring}
        className="w-full lg:w-auto px-4 py-2.5 rounded-xl border-2 border-[var(--color-accent-warm)] bg-[var(--color-accent-light)]/20 flex items-center justify-center gap-2 mb-5 hover:bg-[var(--color-accent-light)]/40 transition-colors cursor-pointer"
      >
        <Plus size={18} className="text-[var(--color-accent-primary)]" />
        <span className="text-sm font-medium text-[var(--color-accent-primary)]">Tambah Bahan Baku</span>
      </motion.button>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          className="form-input text-sm p-3 flex-1 bg-white border border-[var(--color-border)] rounded-xl focus:border-[var(--color-band-1)]"
          placeholder="Cari nama bahan, catatan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-select text-sm p-3 bg-white border border-[var(--color-border)] rounded-xl focus:border-[var(--color-band-1)] sm:w-44"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="semua">Semua Kategori</option>
          {Object.entries(CATEGORY_LABELS).map(([val, lbl]) => (
            <option key={val} value={val}>{lbl}</option>
          ))}
        </select>
      </div>

      {/* Ingredients List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-muted)] text-sm">
            {ingredients.length === 0
              ? 'Belum ada bahan baku. Tambahkan bahan pertama.'
              : 'Tidak ada bahan yang cocok dengan pencarian.'}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((ing) => (
              <motion.div
                key={ing.id}
                layout={!shouldReduceMotion}
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
                transition={softSpring}
                className="rounded-xl bg-white border border-[var(--color-border)] p-4 flex items-center gap-4"
              >
                {/* Icon */}
                <div className="shrink-0 w-11 h-11 rounded-xl bg-[var(--color-accent-light)]/30 flex items-center justify-center">
                  <Package size={20} className="text-[var(--color-accent-primary)]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-[var(--color-text-primary)] truncate">
                      {ing.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">
                      {CATEGORY_LABELS[ing.category] || ing.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--color-text-muted)]">
                    <span>Satuan: <strong className="text-[var(--color-text-secondary)]">{ing.unit}</strong></span>
                    <span>
                      Harga Modal:{' '}
                      <strong className="font-mono text-[var(--color-accent-primary)]">
                        {formatRupiah(ing.costPerUnit || 0)} / {ing.unit}
                      </strong>
                    </span>
                    {ing.notes && (
                      <span className="text-[var(--color-text-muted)] italic truncate max-w-[200px]">
                        {ing.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(ing)}
                    className="p-2.5 rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-gray-50 hover:text-[var(--color-text-primary)] transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="Edit"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(ing.id, ing.name)}
                    className="p-2.5 rounded-lg border border-red-200 bg-white text-red-400 hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="Hapus"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <IngredientModal
          key={editingIngredient ? editingIngredient.id : 'new'}
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          ingredient={editingIngredient}
        />
      )}
    </PageWrapper>
  );
}
