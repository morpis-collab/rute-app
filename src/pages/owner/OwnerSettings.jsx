import { useState } from 'react';
import { Plus, Trash2, Tag, ShoppingCart } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useToastStore from '../../store/useToastStore';

const DEFAULT_INCOME_CATEGORIES = [
  'Penjualan Harian',
  'Katering / Pesanan',
  'Pendapatan Bunga',
  'Lain-lain',
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Pembelian Bahan Baku',
  'Gaji Staff',
  'Sewa Tempat',
  'Listrik & Air',
  'Operasional',
  'Lain-lain',
];

function CategorySection({ title, type, icon: Icon, iconColor, categories, onAdd, onDelete }) {
  const [newCat, setNewCat] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      useToastStore.getState().addToast('Kategori sudah ada', 'error');
      return;
    }
    onAdd(type, trimmed);
    setNewCat('');
  };

  return (
    <div className="rounded-xl bg-white border border-[var(--color-border)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2.5 bg-[var(--color-bg-primary)]">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: iconColor + '20', color: iconColor }}
        >
          <Icon size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-[var(--color-text-primary)]">{title}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">{categories.length} kategori</p>
        </div>
      </div>

      {/* Category list */}
      <div className="divide-y divide-[var(--color-border)]">
        {categories.length === 0 ? (
          <div className="px-4 py-4 text-sm text-[var(--color-text-muted)] text-center">
            Belum ada kategori. Tambahkan kategori baru di bawah.
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 group">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: iconColor }}
                />
                <span className="text-sm text-[var(--color-text-primary)]">{cat}</span>
              </div>
              <button
                onClick={() => onDelete(type, cat)}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                title={`Hapus "${cat}"`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="px-4 py-3 border-t border-dashed border-[var(--color-border)] flex gap-2 bg-gray-50/30">
        <input
          type="text"
          className="form-input text-sm p-3 flex-1 bg-white border border-[var(--color-border)] rounded-xl focus:border-[var(--color-band-1)]"
          placeholder={`Tambah kategori ${type === 'income' ? 'pemasukan' : 'pengeluaran'} baru...`}
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          maxLength={50}
        />
        <button
          type="submit"
          className="px-3 py-3 rounded-xl border-2 text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
          style={{
            borderColor: iconColor,
            color: iconColor,
            background: iconColor + '10',
          }}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Tambah</span>
        </button>
      </form>
    </div>
  );
}

export default function OwnerSettings() {
  const categories = useAppStore((state) => state.categories || { income: [], expense: [] });
  const addCategory = useAppStore((state) => state.addCategory);
  const deleteCategory = useAppStore((state) => state.deleteCategory);

  const incomeCategories =
    (categories.income || []).length > 0
      ? categories.income
      : DEFAULT_INCOME_CATEGORIES;

  const expenseCategories =
    (categories.expense || []).length > 0
      ? categories.expense
      : DEFAULT_EXPENSE_CATEGORIES;

  const handleAdd = async (type, name) => {
    try {
      await addCategory(type, name);
      useToastStore.getState().addToast(`Kategori "${name}" berhasil ditambahkan`, 'success');
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast('Gagal menambahkan kategori', 'error');
    }
  };

  const handleDelete = async (type, name) => {
    if (!window.confirm(`Hapus kategori "${name}"? Transaksi yang sudah menggunakan kategori ini tidak akan terpengaruh.`)) return;
    try {
      await deleteCategory(type, name);
      useToastStore.getState().addToast(`Kategori "${name}" berhasil dihapus`, 'success');
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast('Gagal menghapus kategori', 'error');
    }
  };

  return (
    <PageWrapper title="Pengaturan" subtitle="Kelola kategori pemasukan dan pengeluaran">
      {/* Info Banner */}
      <div className="mb-5 rounded-xl border border-[var(--color-accent-warm)]/40 bg-[var(--color-accent-light)]/15 px-4 py-3 text-sm text-[var(--color-text-secondary)]">
        <p className="font-semibold text-[var(--color-accent-primary)] mb-0.5">Kategori Kustom</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Kategori yang Anda tambahkan akan muncul sebagai pilihan saat mencatat pemasukan dan pengeluaran.
          Menghapus kategori tidak mempengaruhi transaksi yang sudah tercatat.
        </p>
      </div>

      <div className="space-y-4">
        <CategorySection
          title="Kategori Pemasukan"
          type="income"
          icon={Tag}
          iconColor="var(--color-band-1)"
          categories={incomeCategories}
          onAdd={handleAdd}
          onDelete={handleDelete}
        />
        <CategorySection
          title="Kategori Pengeluaran"
          type="expense"
          icon={ShoppingCart}
          iconColor="#dc2626"
          categories={expenseCategories}
          onAdd={handleAdd}
          onDelete={handleDelete}
        />
      </div>
    </PageWrapper>
  );
}
