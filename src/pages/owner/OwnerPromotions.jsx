import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  Edit,
  Gift,
  Plus,
  Save,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import { KpiTile, SectionHeader } from '../../components/common/DashboardPrimitives';
import useAppStore from '../../store/useAppStore';
import useToastStore from '../../store/useToastStore';
import { formatRupiah } from '../../utils/formatters';
import { getBusinessDate } from '../../utils/businessDate';
import {
  getPromotionPerformance,
  getPromotionPrice,
  getPromotionStatus,
  promotionStatusLabels,
} from '../../utils/promotions';

const today = getBusinessDate();

const emptyForm = {
  name: '',
  status: 'draft',
  startDate: today,
  endDate: today,
  targetProductIds: [],
  bundleQty: '2',
  bundlePrice: '',
  targetSales: '',
  budget: '',
  objective: '',
  notes: '',
};

function statusBadgeClass(status) {
  if (status === 'active') return 'badge-success';
  if (status === 'scheduled') return 'badge-info';
  if (status === 'completed') return 'badge-warning';
  if (status === 'canceled') return 'badge-danger';
  return 'bg-gray-100 text-gray-600';
}

function productPrice(product) {
  return Number(product?.sellingPrice ?? product?.price ?? 0);
}

function promoValueLabel(promotion) {
  if (promotion.type === 'bundle') {
    return `${Number(promotion.bundleQty || 0)} cup = ${formatRupiah(promotion.bundlePrice || 0)}`;
  }
  if (promotion.type === 'percentage') return `${Number(promotion.discountValue || 0)}%`;
  return formatRupiah(promotion.discountValue || 0);
}

export default function OwnerPromotions() {
  const products = useAppStore((state) => state.products);
  const promotions = useAppStore((state) => state.promotions);
  const sales = useAppStore((state) => state.sales);
  const addPromotion = useAppStore((state) => state.addPromotion);
  const updatePromotion = useAppStore((state) => state.updatePromotion);
  const removePromotion = useAppStore((state) => state.removePromotion);
  const toast = useToastStore((state) => state.addToast);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const promoMetrics = useMemo(() => (
    (promotions || []).reduce((summary, promotion) => {
      const status = getPromotionStatus(promotion);
      const performance = getPromotionPerformance(promotion, sales);
      summary.total += 1;
      if (status === 'active') summary.active += 1;
      if (status === 'scheduled') summary.scheduled += 1;
      summary.omzet += performance.totalOmzet;
      summary.discount += performance.totalDiscount;
      return summary;
    }, { total: 0, active: 0, scheduled: 0, omzet: 0, discount: 0 })
  ), [promotions, sales]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products || [];
    return (products || []).filter((product) => (
      String(product.name || '').toLowerCase().includes(query)
      || String(product.category || '').toLowerCase().includes(query)
    ));
  }, [products, productSearch]);

  const selectedProducts = useMemo(() => (
    (products || []).filter((product) => (
      (form.targetProductIds || []).some((id) => String(id) === String(product.id))
    ))
  ), [form.targetProductIds, products]);

  const previewRows = useMemo(() => (
    selectedProducts.slice(0, 4).map((product) => {
      const pricing = getPromotionPrice(product, {
        type: 'bundle',
        bundleQty: Number(form.bundleQty || 0),
        bundlePrice: Number(form.bundlePrice || 0),
      });
      const normalTotal = productPrice(product) * Number(form.bundleQty || 0);
      return {
        product,
        pricing,
        normalTotal,
        discountTotal: Math.max(0, normalTotal - Number(form.bundlePrice || 0)),
      };
    })
  ), [form.bundlePrice, form.bundleQty, selectedProducts]);

  const toggleProduct = (productId) => {
    setForm((current) => {
      const exists = current.targetProductIds.some((id) => String(id) === String(productId));
      return {
        ...current,
        targetProductIds: exists
          ? current.targetProductIds.filter((id) => String(id) !== String(productId))
          : [...current.targetProductIds, String(productId)],
      };
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setProductSearch('');
  };

  const buildPayload = () => ({
    ...form,
    type: 'bundle',
    discountValue: 0,
    bundleQty: Number(form.bundleQty || 0),
    bundlePrice: Number(form.bundlePrice || 0),
    targetSales: Number(form.targetSales || 0),
    budget: Number(form.budget || 0),
    targetProductIds: form.targetProductIds.map((id) => String(id)),
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast('Nama promo wajib diisi', 'error');
      return;
    }
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      toast('Periode promo belum valid', 'error');
      return;
    }
    if (Number(form.bundleQty || 0) < 2 || Number(form.bundlePrice || 0) <= 0) {
      toast('Promo paket wajib minimal 2 cup dan harga paket lebih dari Rp 0', 'error');
      return;
    }
    if (!form.targetProductIds.length) {
      toast('Pilih minimal satu menu untuk promo paket satu menu', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updatePromotion(editingId, buildPayload());
        toast('Promo berhasil diperbarui', 'success');
      } else {
        await addPromotion(buildPayload());
        toast('Promo baru berhasil disimpan', 'success');
      }
      resetForm();
    } catch (error) {
      toast(error.response?.data?.error || 'Gagal menyimpan promo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (promotion) => {
    setEditingId(promotion.id);
    setForm({
      name: promotion.name || '',
      status: promotion.status || 'draft',
      startDate: promotion.startDate || today,
      endDate: promotion.endDate || today,
      targetProductIds: (promotion.targetProductIds || []).map((id) => String(id)),
      bundleQty: String(promotion.bundleQty || 2),
      bundlePrice: String(promotion.bundlePrice || promotion.discountValue || ''),
      targetSales: String(promotion.targetSales || ''),
      budget: String(promotion.budget || ''),
      objective: promotion.objective || '',
      notes: promotion.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelPromotion = async (promotion) => {
    try {
      await updatePromotion(promotion.id, { ...promotion, status: 'canceled' });
      toast('Promo dibatalkan', 'success');
    } catch (error) {
      toast(error.response?.data?.error || 'Gagal membatalkan promo', 'error');
    }
  };

  const handleDelete = async (promotion) => {
    if (!window.confirm(`Hapus promo "${promotion.name}"?`)) return;
    try {
      await removePromotion(promotion.id);
      toast('Promo berhasil dihapus', 'success');
    } catch (error) {
      toast(error.response?.data?.error || 'Gagal menghapus promo', 'error');
    }
  };

  return (
    <PageWrapper title="Promo Penjualan" subtitle="Kelola promo paket satu menu dan pantau performanya dari rekap closing">
      <div className="space-y-6">
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
          <KpiTile icon={Gift} label="Total Promo" value={promoMetrics.total} helper="Semua rencana promo" tone="green" />
          <KpiTile icon={CalendarDays} label="Promo Aktif" value={promoMetrics.active} helper={`${promoMetrics.scheduled} terjadwal`} tone="blue" />
          <KpiTile icon={Target} label="Omzet Promo" value={formatRupiah(promoMetrics.omzet)} helper="Dari rekap ber-promo" tone="orange" />
          <KpiTile icon={Check} label="Diskon Diberi" value={formatRupiah(promoMetrics.discount)} helper="Estimasi subsidi harga" tone="purple" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-card p-5">
            <SectionHeader
              title={editingId ? 'Edit Promo Paket' : 'Buat Promo Paket'}
              subtitle="Versi pertama fokus ke paket satu menu, contoh 2 cup = Rp 18.000"
            >
              {editingId && (
                <button type="button" onClick={resetForm} className="btn btn-secondary h-10 min-h-10 px-3 text-xs">
                  <X size={15} /> Batal
                </button>
              )}
            </SectionHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Nama Promo</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="form-input"
                  placeholder="Contoh: Beli 2 Kopi Susu 18K"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Status</span>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="form-select">
                  {Object.entries(promotionStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Jumlah Cup Paket</span>
                <input
                  type="number"
                  min="2"
                  value={form.bundleQty}
                  onChange={(event) => setForm({ ...form, bundleQty: event.target.value })}
                  className="form-input font-mono"
                  placeholder="2"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Tanggal Mulai</span>
                <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="form-input font-mono" />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Tanggal Selesai</span>
                <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className="form-input font-mono" />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Harga Paket</span>
                <input
                  type="number"
                  min="0"
                  value={form.bundlePrice}
                  onChange={(event) => setForm({ ...form, bundlePrice: event.target.value })}
                  className="form-input font-mono"
                  placeholder="18000"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Target Cup</span>
                <input
                  type="number"
                  min="0"
                  value={form.targetSales}
                  onChange={(event) => setForm({ ...form, targetSales: event.target.value })}
                  className="form-input font-mono"
                  placeholder="100"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Budget Promo</span>
                <input
                  type="number"
                  min="0"
                  value={form.budget}
                  onChange={(event) => setForm({ ...form, budget: event.target.value })}
                  className="form-input font-mono"
                  placeholder="200000"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Tujuan Strategi</span>
                <textarea
                  value={form.objective}
                  onChange={(event) => setForm({ ...form, objective: event.target.value })}
                  className="form-input min-h-24 resize-y"
                  placeholder="Contoh: menaikkan transaksi sore lewat paket dua cup."
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Catatan Evaluasi</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  className="form-input min-h-20 resize-y"
                  placeholder="Syarat promo atau evaluasi setelah berjalan."
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={resetForm} className="btn btn-secondary text-xs">
                Reset
              </button>
              <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="btn btn-primary text-xs">
                {isSubmitting ? <Save size={16} className="animate-spin" /> : <Plus size={16} />}
                {editingId ? 'Simpan Perubahan' : 'Simpan Promo'}
              </button>
            </div>
          </section>

          <section className="glass-card p-5">
            <SectionHeader title="Target Menu" subtitle="Promo paket satu menu wajib memilih minimal satu menu" />
            <input
              type="search"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              className="form-input mb-3 text-xs"
              placeholder="Cari menu..."
            />
            <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
              {(filteredProducts || []).map((product) => {
                const checked = form.targetProductIds.some((id) => String(id) === String(product.id));
                return (
                  <label key={product.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-3">
                    <input type="checkbox" checked={checked} onChange={() => toggleProduct(product.id)} className="h-4 w-4 accent-[var(--color-band-1)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-black text-[var(--color-text-primary)]">{product.name}</span>
                      <span className="font-mono text-[10px] font-bold text-[var(--color-text-muted)]">{formatRupiah(productPrice(product))}</span>
                    </span>
                  </label>
                );
              })}
              {(!filteredProducts || filteredProducts.length === 0) && (
                <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-5 text-center text-xs font-bold text-[var(--color-text-muted)]">
                  Belum ada menu yang cocok.
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-band-4)] p-4">
              <p className="text-[10px] font-extrabold uppercase text-[var(--color-text-muted)]">Simulasi Paket</p>
              <div className="mt-3 space-y-2">
                {previewRows.map(({ product, pricing, normalTotal, discountTotal }) => (
                  <div key={product.id} className="rounded-[var(--radius-card)] bg-white p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 flex-1 truncate font-black">{product.name}</span>
                      <span className="font-mono font-black text-[var(--color-band-1)]">{formatRupiah(form.bundlePrice || 0)}</span>
                    </div>
                    <p className="mt-1 font-semibold text-[var(--color-text-muted)]">
                      Normal {formatRupiah(normalTotal)} - harga/cup promo {formatRupiah(pricing.promoPrice)} - hemat {formatRupiah(discountTotal)}
                    </p>
                  </div>
                ))}
                {previewRows.length === 0 && (
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">Pilih menu target untuk melihat simulasi paket.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="glass-card p-5">
          <SectionHeader title="Daftar Promo" subtitle="Pantau status, target, dan performa promo">
            <span className="rounded-[var(--radius-button)] bg-[var(--color-band-4)] px-2.5 py-1.5 font-mono text-xs font-black text-[var(--color-band-1)]">
              {(promotions || []).length} Promo
            </span>
          </SectionHeader>
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)]">
            <table className="data-table min-w-[920px]">
              <thead>
                <tr>
                  <th>Promo</th>
                  <th>Periode</th>
                  <th>Target Menu</th>
                  <th>Status</th>
                  <th className="text-right">Omzet Promo</th>
                  <th className="text-right">Cup</th>
                  <th className="text-center">Progress</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(promotions || []).map((promotion) => {
                  const status = getPromotionStatus(promotion);
                  const performance = getPromotionPerformance(promotion, sales);
                  const targetNames = !promotion.targetProductIds?.length
                    ? 'Semua menu'
                    : promotion.targetProductIds
                      .map((id) => products.find((product) => String(product.id) === String(id))?.name)
                      .filter(Boolean)
                      .join(', ');
                  return (
                    <tr key={promotion.id}>
                      <td>
                        <p className="font-black text-[var(--color-text-primary)]">{promotion.name}</p>
                        <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                          {promotion.type === 'bundle' ? 'Paket satu menu' : 'Promo lama'} - {promoValueLabel(promotion)}
                        </p>
                      </td>
                      <td className="font-mono text-xs">{promotion.startDate} s/d {promotion.endDate}</td>
                      <td className="max-w-56 truncate text-[var(--color-text-secondary)]">{targetNames || 'Menu belum ditemukan'}</td>
                      <td><span className={`badge ${statusBadgeClass(status)}`}>{promotionStatusLabels[status] || status}</span></td>
                      <td className="text-right font-mono font-black">{formatRupiah(performance.totalOmzet)}</td>
                      <td className="text-right font-mono font-black">{performance.totalCup}</td>
                      <td className="text-center">
                        <div className="mx-auto h-2 w-24 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
                          <div className="h-full rounded-full bg-[var(--color-band-1)]" style={{ width: `${performance.targetProgress}%` }} />
                        </div>
                        <span className="mt-1 block font-mono text-[10px] font-bold text-[var(--color-text-muted)]">{performance.targetProgress}%</span>
                      </td>
                      <td>
                        <div className="flex justify-center gap-1">
                          <button type="button" onClick={() => handleEdit(promotion)} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-band-4)]" title="Edit promo">
                            <Edit size={15} />
                          </button>
                          {status !== 'canceled' && (
                            <button type="button" onClick={() => handleCancelPromotion(promotion)} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--color-accent-orange)] hover:bg-warning-bg" title="Batalkan promo">
                              <X size={15} />
                            </button>
                          )}
                          <button type="button" onClick={() => handleDelete(promotion)} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--color-accent-red)] hover:bg-danger-bg" title="Hapus promo">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!promotions || promotions.length === 0) && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm font-bold text-[var(--color-text-muted)]">
                      Belum ada promo. Buat promo paket pertama dari form di atas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
