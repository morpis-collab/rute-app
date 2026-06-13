import { useState, useMemo } from 'react';
import { Plus, Trash2, Save, Check, Edit, X } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import { ProductThumb, SectionHeader } from '../../components/common/DashboardPrimitives';
import useAppStore from '../../store/useAppStore';
import useToastStore from '../../store/useToastStore';
import { formatRupiah } from '../../utils/formatters';

export default function OwnerMenuHPP() {
  const ingredients = useAppStore((state) => state.ingredients);
  const products = useAppStore((state) => state.products);
  const addProduct = useAppStore((state) => state.addProduct);
  const updateProduct = useAppStore((state) => state.updateProduct);
  const deleteProduct = useAppStore((state) => state.deleteProduct);

  const [form, setForm] = useState({
    name: '',
    category: 'Espresso Based',
    price: 0,
    hpp: 0,
    description: '',
    active: true,
    recipe: [],
  });

  const [editingId, setEditingId] = useState(null);

  // Calculate HPP based on recipe if it exists, otherwise use form.hpp
  const totalHPP = useMemo(() => {
    if (!form.recipe || form.recipe.length === 0) {
      return Number(form.hpp || 0);
    }
    return Math.round(
      form.recipe.reduce((sum, item) => {
        const ing = ingredients.find((i) => String(i.id) === String(item.ingredientId));
        if (!ing) return sum;

        let baseQty = Number(item.qty || 0);
        const fromUnit = String(item.unit || ing.unit).trim().toLowerCase();
        const baseUnit = String(ing.unit).trim().toLowerCase();
        if (fromUnit !== baseUnit) {
          const conversion = ing.unitConversions?.[fromUnit];
          if (conversion != null) {
            baseQty = baseQty * Number(conversion);
          } else if (baseUnit === 'gram' && fromUnit === 'kg') {
            baseQty = baseQty * 1000;
          } else if (baseUnit === 'ml' && ['l', 'liter'].includes(fromUnit)) {
            baseQty = baseQty * 1000;
          }
        }
        const itemCost = baseQty * Number(ing.costPerUnit || 0);
        return sum + itemCost;
      }, 0)
    );
  }, [form.recipe, form.hpp, ingredients]);

  const handleAddRecipeRow = () => {
    setForm((prev) => ({
      ...prev,
      recipe: [...(prev.recipe || []), { ingredientId: '', qty: '', unit: 'gram' }],
    }));
  };

  const handleRecipeRowChange = (index, field, value) => {
    setForm((prev) => {
      const updatedRecipe = [...(prev.recipe || [])];
      const row = { ...updatedRecipe[index] };

      if (field === 'ingredientId') {
        row.ingredientId = value;
        const ing = ingredients.find((i) => String(i.id) === String(value));
        if (ing?.unit) {
          row.unit = ing.unit;
        }
      } else if (field === 'qty') {
        row.qty = value === '' ? '' : parseFloat(value) || 0;
      } else {
        row[field] = value;
      }

      updatedRecipe[index] = row;
      return { ...prev, recipe: updatedRecipe };
    });
  };

  const handleRemoveRecipeRow = (index) => {
    setForm((prev) => ({
      ...prev,
      recipe: (prev.recipe || []).filter((_, i) => i !== index),
    }));
  };

  const grossProfit = form.price - totalHPP;
  const margin = form.price > 0 ? Number(((grossProfit / form.price) * 100).toFixed(1)) : 0;
  
  const getMarginStatus = (m) => {
    const marginVal = Number(m || 0);
    if (marginVal >= 60) return { label: 'Sehat', color: 'text-[var(--color-accent-green)] bg-[#e8f5e4]' };
    if (marginVal >= 40) return { label: 'Tipis', color: 'text-[var(--color-accent-orange)] bg-[#f5efe0]' };
    return { label: 'Rugi/Kecil', color: 'text-[var(--color-accent-red)] bg-[#fae8e0]' };
  };
  const status = getMarginStatus(margin);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!form.name || form.price <= 0) return;
    
    setIsSubmitting(true);
    try {
      const validRecipe = (form.recipe || [])
        .filter(r => r.ingredientId && Number(r.qty) > 0)
        .map(r => ({
          ingredientId: Number(r.ingredientId),
          qty: Number(r.qty),
          unit: r.unit
        }));

      const payload = {
        name: form.name,
        category: form.category.toLowerCase().replaceAll(' ', '_'),
        sellingPrice: form.price,
        active: form.active,
        hpp: totalHPP,
        recipe: validRecipe,
        emoji: editingId ? (products.find(p => String(p.id) === String(editingId))?.emoji || '☕') : '☕'
      };

      if (editingId) {
        await updateProduct(editingId, payload);
        useToastStore.getState().addToast('Menu berhasil diperbarui', 'success');
      } else {
        await addProduct(payload);
        useToastStore.getState().addToast('Menu baru berhasil ditambahkan', 'success');
      }
      
      // Reset form
      setForm({ name: '', category: 'Espresso Based', price: 0, hpp: 0, description: '', active: true, recipe: [] });
      setEditingId(null);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Gagal menyimpan menu';
      useToastStore.getState().addToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (product) => {
    // Map category slug to display name
    const categoryMap = {
      'espresso_based': 'Espresso Based',
      'manual_brew': 'Manual Brew',
      'non-coffee': 'Non-Coffee',
      'non_coffee': 'Non-Coffee',
      'pastry': 'Pastry'
    };
    const mappedCategory = categoryMap[product.category] || 'Espresso Based';

    setForm({
      name: product.name,
      category: mappedCategory,
      price: product.sellingPrice,
      hpp: product.recipe && product.recipe.length > 0 ? 0 : (product.hpp || 0),
      description: product.description || '',
      active: product.active ?? true,
      recipe: product.recipe || [],
    });
    setEditingId(product.id);
    
    // Smooth scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setForm({ name: '', category: 'Espresso Based', price: 0, hpp: 0, description: '', active: true, recipe: [] });
    setEditingId(null);
  };

  const handleDeleteClick = async (id, name) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus menu "${name}"?`)) {
      try {
        await deleteProduct(id);
        useToastStore.getState().addToast(`Menu "${name}" berhasil dihapus`, 'success');
      } catch (error) {
        const errorMsg = error.response?.data?.error || `Gagal menghapus menu "${name}"`;
        useToastStore.getState().addToast(errorMsg, 'error');
      }
    }
  };

  return (
    <PageWrapper title="Menu & Resep" subtitle="Recipe Builder & HPP Kalkulator">
      
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Left: Menu Details & Recipe Editor */}
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="font-bold text-[var(--color-text-primary)] mb-4">Informasi Dasar Menu</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nama Menu</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input" placeholder="Contoh: Kopi Susu Gula Aren" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Kategori</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="form-select">
                    <option>Espresso Based</option>
                    <option>Manual Brew</option>
                    <option>Non-Coffee</option>
                    <option>Pastry</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Harga Jual (Rp)</label>
                  <input type="number" value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})} className="form-input font-mono" placeholder="0" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">HPP / Modal (Rp)</label>
                  <input
                    type="number"
                    value={totalHPP}
                    disabled={form.recipe && form.recipe.length > 0}
                    onChange={(e) => setForm({ ...form, hpp: parseFloat(e.target.value) || 0 })}
                    className={`form-input font-mono ${form.recipe && form.recipe.length > 0 ? 'bg-[#f4efe8] cursor-not-allowed text-[var(--color-text-secondary)] font-semibold' : ''}`}
                    placeholder="0"
                  />
                  {form.recipe && form.recipe.length > 0 && (
                    <span className="text-[10px] text-[var(--color-text-muted)] mt-1 block italic">Dihitung otomatis dari resep</span>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Status Menu</label>
                  <select value={form.active ? 'true' : 'false'} onChange={e => setForm({...form, active: e.target.value === 'true'})} className="form-select">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Recipe Builder Card */}
          <div className="glass-card p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-[var(--color-text-primary)]">Resep Bahan Baku</h3>
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Tentukan bahan baku untuk mengetahui rincian biaya HPP</p>
              </div>
              <button
                type="button"
                onClick={handleAddRecipeRow}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-accent-light)]/40 text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-light)]/60 transition-colors text-xs font-semibold flex items-center gap-1"
              >
                <Plus size={14} /> Tambah Bahan
              </button>
            </div>

            {!form.recipe || form.recipe.length === 0 ? (
              <div className="text-center p-6 bg-[var(--color-bg-primary)] border border-dashed border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)] text-xs">
                Belum ada bahan baku dalam resep. Menu ini menggunakan HPP manual. Tekan tombol di atas untuk menyusun resep.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {form.recipe.map((row, index) => {
                  const selectedIng = ingredients.find((i) => String(i.id) === String(row.ingredientId));
                  const costPerUnit = selectedIng ? Number(selectedIng.costPerUnit || 0) : 0;
                  
                  // Calculate subtotal for display
                  let baseQty = Number(row.qty || 0);
                  const fromUnit = String(row.unit || selectedIng?.unit || 'gram').toLowerCase();
                  const baseUnit = String(selectedIng?.unit || 'gram').toLowerCase();
                  if (selectedIng && fromUnit !== baseUnit) {
                    const conversion = selectedIng.unitConversions?.[fromUnit];
                    if (conversion != null) {
                      baseQty = baseQty * Number(conversion);
                    } else if (baseUnit === 'gram' && fromUnit === 'kg') {
                      baseQty = baseQty * 1000;
                    } else if (baseUnit === 'ml' && ['l', 'liter'].includes(fromUnit)) {
                      baseQty = baseQty * 1000;
                    }
                  }
                  const calculatedCost = baseQty * costPerUnit;

                  // Available units list based on ingredient
                  const availableUnits = ['pcs', 'gram', 'kg', 'ml', 'l', 'liter', 'porsi'];
                  if (selectedIng && selectedIng.unitConversions) {
                    Object.keys(selectedIng.unitConversions).forEach((u) => {
                      if (!availableUnits.includes(u)) availableUnits.push(u);
                    });
                  }
                  if (selectedIng?.unit && !availableUnits.includes(selectedIng.unit)) {
                    availableUnits.push(selectedIng.unit);
                  }

                  return (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[#FAF8F5] relative group">
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Bahan Baku</label>
                        <select
                          value={row.ingredientId}
                          onChange={(e) => handleRecipeRowChange(index, 'ingredientId', e.target.value)}
                          className="form-select text-xs p-1.5 w-full bg-white"
                          required
                        >
                          <option value="">-- Pilih Bahan --</option>
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>{ing.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="w-full sm:w-24">
                        <label className="block text-[9px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Jumlah</label>
                        <input
                          type="number"
                          value={row.qty}
                          onChange={(e) => handleRecipeRowChange(index, 'qty', e.target.value)}
                          placeholder="0"
                          className="form-input text-xs p-1.5 w-full bg-white font-mono"
                          required
                          min="0"
                          step="any"
                        />
                      </div>

                      <div className="w-full sm:w-20">
                        <label className="block text-[9px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Satuan</label>
                        <select
                          value={row.unit}
                          onChange={(e) => handleRecipeRowChange(index, 'unit', e.target.value)}
                          className="form-select text-xs p-1.5 w-full bg-white"
                        >
                          {availableUnits.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      {/* Display price details */}
                      <div className="w-full sm:w-32 flex flex-col justify-end">
                        <span className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Biaya</span>
                        <div className="h-8 flex flex-col justify-center text-right sm:text-left">
                          <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">
                            {selectedIng ? `Rp ${costPerUnit}/${selectedIng.unit}` : 'Rp 0'}
                          </span>
                          <span className="text-xs font-bold font-mono text-[var(--color-text-primary)]">
                            = Rp {calculatedCost.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      {/* Remove row button */}
                      <div className="flex items-center justify-end sm:justify-center pt-2 sm:pt-4">
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipeRow(index)}
                          className="p-1.5 text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red)]/10 rounded-lg transition-colors"
                          title="Hapus baris"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: HPP Summary */}
        <div className="space-y-6">
          <div className="kpi-card bg-[linear-gradient(135deg,var(--color-band-1),var(--color-band-2))] text-white border-none relative overflow-hidden">
             {/* Background glow decoration */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
            
            <h3 className="font-bold text-lg mb-6 relative z-10">Analisis Keuangan Menu</h3>
            
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center border-b border-white/20 pb-3">
                <span className="text-sm opacity-90">Harga Jual (A)</span>
                <span className="font-mono font-bold text-lg">{formatRupiah(form.price)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/20 pb-3">
                <span className="text-sm opacity-90">Total HPP / Modal (B)</span>
                <span className="font-mono font-bold text-lg">{formatRupiah(totalHPP)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/20 pb-3">
                <span className="text-sm font-bold">Laba Kotor (A - B)</span>
                <span className="font-mono font-bold text-xl text-[var(--color-band-4)]">{formatRupiah(grossProfit)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-bold">Margin Keuntungan</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-md shadow-sm ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="font-mono font-bold text-2xl">{margin}%</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 relative z-10 flex gap-2">
              {editingId && (
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1 transition-transform"
                >
                  <X size={18} /> Batal
                </button>
              )}
              <button 
                onClick={handleSave}
                disabled={!form.name || form.price <= 0 || isSubmitting}
                className={`${editingId ? 'flex-[2]' : 'w-full'} bg-white text-[var(--color-band-1)] font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:hover:translate-y-0`}
              >
                {isSubmitting ? (
                  <><Save size={18} className="animate-spin" /> Menyimpan...</>
                ) : editingId ? (
                  <><Check size={18} /> Simpan Perubahan</>
                ) : (
                  <><Save size={18} /> Simpan Menu Baru</>
                )}
              </button>
            </div>
          </div>
          
          {/* Info/Warning Card */}
          <div className="glass-card p-4 border-l-4 border-l-[var(--color-accent-orange)] bg-[#f5efe0]">
            <h4 className="font-bold text-[var(--color-text-primary)] text-sm mb-1">Rekomendasi Pricing AI</h4>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Untuk kategori <strong>{form.category}</strong>, margin yang disarankan adalah minimal <strong>60%</strong>. 
              {margin < 60 && form.price > 0 && ` Pertimbangkan untuk menaikkan harga jual ke minimal ${formatRupiah(totalHPP / (1 - 0.60))} agar margin sehat.`}
            </p>
          </div>
        </div>

      </div>

      {/* Daftar Menu Section */}
      <div className="mt-8 glass-card p-5">
        <SectionHeader title="Daftar Menu & HPP" subtitle="Harga jual, modal, margin, dan resep bahan">
          <span className="rounded-[var(--radius-button)] bg-[var(--color-band-4)] px-2.5 py-1.5 font-mono text-xs font-black text-[var(--color-band-1)]">
            {products.length} Menu
          </span>
        </SectionHeader>
        
        {!products || products.length === 0 ? (
          <div className="text-center p-6 bg-[var(--color-bg-primary)] border border-dashed border-[var(--color-coffee-latte)] rounded-lg text-[var(--color-text-muted)] text-sm">
            Belum ada menu yang terdaftar. Gunakan form di atas untuk membuat menu pertama Anda.
          </div>
        ) : (
          <div className="border border-[var(--color-coffee-latte)] rounded-lg overflow-x-auto">
            <table className="data-table min-w-full">
              <thead className="bg-[#faf6ef]">
                <tr>
                  <th className="text-left py-3 px-4">Menu</th>
                  <th className="text-left py-3 px-4">Kategori</th>
                  <th className="text-right py-3 px-4">Harga Jual</th>
                  <th className="text-right py-3 px-4">HPP / Modal</th>
                  <th className="text-right py-3 px-4">Laba Kotor</th>
                  <th className="text-center py-3 px-4">Margin</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-center py-3 px-4 w-28">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => {
                  const gross = prod.sellingPrice - (prod.hpp || 0);
                  const marginPct = prod.sellingPrice > 0 ? Number(((gross / prod.sellingPrice) * 100).toFixed(0)) : 0;
                  const marginStatus = getMarginStatus(marginPct);
                  
                  return (
                    <tr key={prod.id} className={`hover:bg-[#fbf9f4] transition-colors border-b border-[var(--color-coffee-latte)]/40 ${!prod.active ? 'opacity-60 bg-gray-50/50' : ''}`}>
                      <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                        <div className="flex items-center gap-3">
                          <ProductThumb product={prod} size="sm" className="shrink-0" />
                          <div className="min-w-0">
                          <span className="mr-2 text-base">{prod.emoji || '☕'}</span>
                          {prod.name}
                        </div>
                        {prod.recipe && prod.recipe.length > 0 && (
                          <div className="text-[10px] text-[var(--color-text-secondary)] font-normal mt-1.5 flex flex-wrap gap-1 items-center">
                            <span className="bg-[#f5ece2] px-1.5 py-0.5 rounded text-[8px] font-bold text-[var(--color-text-secondary)] uppercase">Resep:</span>
                            {prod.recipe.map((r, rIdx) => {
                              const ingName = r.name || ingredients.find(i => String(i.id) === String(r.ingredientId))?.name || 'Bahan';
                              return (
                                <span key={rIdx} className="bg-white border border-[var(--color-border)] px-1.5 py-0.5 rounded text-[10px] text-[var(--color-text-secondary)] font-mono">
                                  {ingName} ({r.qty} {r.unit})
                                </span>
                              );
                            })}
                          </div>
                        )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">
                        {prod.category === 'espresso_based' && 'Espresso Based'}
                        {prod.category === 'manual_brew' && 'Manual Brew'}
                        {prod.category === 'non-coffee' && 'Non-Coffee'}
                        {prod.category === 'non_coffee' && 'Non-Coffee'}
                        {prod.category === 'pastry' && 'Pastry'}
                        {!['espresso_based', 'manual_brew', 'non-coffee', 'non_coffee', 'pastry'].includes(prod.category) && prod.category}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">{formatRupiah(prod.sellingPrice)}</td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--color-text-secondary)]">{formatRupiah(prod.hpp || 0)}</td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--color-accent-green)] font-semibold">{formatRupiah(gross)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${marginStatus.color}`}>
                          {marginPct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`badge text-[10px] ${prod.active ? 'badge-success' : 'badge-danger bg-gray-200 text-gray-600'}`}>
                          {prod.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(prod)}
                            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:scale-110 transition-all"
                            title="Edit Menu"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(prod.id, prod.name)}
                            className="p-1 text-[var(--color-accent-red)] hover:scale-110 transition-all"
                            title="Hapus Menu"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </PageWrapper>
  );
}
