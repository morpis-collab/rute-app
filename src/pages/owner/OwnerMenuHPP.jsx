import { useState, useMemo } from 'react';
import { Plus, Trash2, Save, Check, Edit, X } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
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
    description: '',
    active: true,
  });

  const [recipe, setRecipe] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [qty, setQty] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Calculate HPP
  const totalHPP = useMemo(() => {
    return recipe.reduce((total, item) => {
      const ing = ingredients.find(i => i.id === parseInt(item.ingredientId));
      if (!ing) return total;
      return total + (ing.costPerUnit * item.qty);
    }, 0);
  }, [recipe, ingredients]);

  const grossProfit = form.price - totalHPP;
  const margin = form.price > 0 ? ((grossProfit / form.price) * 100).toFixed(1) : 0;
  
  const getMarginStatus = (m) => {
    if (m >= 60) return { label: 'Sehat', color: 'text-[var(--color-accent-green)] bg-[#e8f5e4]' };
    if (m >= 40) return { label: 'Tipis', color: 'text-[var(--color-accent-orange)] bg-[#f5efe0]' };
    return { label: 'Rugi/Kecil', color: 'text-[var(--color-accent-red)] bg-[#fae8e0]' };
  };
  const status = getMarginStatus(margin);

  const addRecipeItem = () => {
    if (!selectedIngredient || !qty) return;
    const ing = ingredients.find(i => i.id === parseInt(selectedIngredient));
    if (!ing) return;
    
    // Check if exists
    if (recipe.find(r => r.ingredientId === parseInt(selectedIngredient))) return;

    setRecipe([...recipe, { ingredientId: parseInt(selectedIngredient), qty: parseFloat(qty), unit: ing.unit, cost: ing.costPerUnit }]);
    setSelectedIngredient('');
    setQty('');
  };

  const removeRecipeItem = (id) => {
    setRecipe(recipe.filter(r => r.ingredientId !== id));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!form.name || form.price <= 0) return;
    
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateProduct(editingId, {
          name: form.name,
          category: form.category.toLowerCase().replace(' ', '_'),
          sellingPrice: form.price,
          active: form.active,
          hpp: totalHPP,
          recipe: recipe,
          emoji: '☕'
        });
        useToastStore.getState().addToast('Menu berhasil diperbarui', 'success');
      } else {
        await addProduct({
          name: form.name,
          category: form.category.toLowerCase().replace(' ', '_'),
          sellingPrice: form.price,
          active: form.active,
          hpp: totalHPP,
          recipe: recipe,
          emoji: '☕'
        });
        useToastStore.getState().addToast('Menu baru berhasil ditambahkan', 'success');
      }
      
      // Reset form
      setForm({ name: '', category: 'Espresso Based', price: 0, description: '', active: true });
      setRecipe([]);
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
      description: product.description || '',
      active: product.active ?? true,
    });
    setRecipe(product.recipe ? [...product.recipe] : []);
    setEditingId(product.id);
    
    // Smooth scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setForm({ name: '', category: 'Espresso Based', price: 0, description: '', active: true });
    setRecipe([]);
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Status Menu</label>
                  <select value={form.active ? 'true' : 'false'} onChange={e => setForm({...form, active: e.target.value === 'true'})} className="form-select">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-bold text-[var(--color-text-primary)] mb-4">Recipe Builder (Bahan Baku)</h3>
            
            {/* Add ingredient form */}
            <div className="flex gap-2 mb-4 items-end">
              <div className="flex-1">
                <label className="block text-[10px] uppercase text-[var(--color-text-secondary)] font-bold mb-1">Pilih Bahan</label>
                <select value={selectedIngredient} onChange={e => setSelectedIngredient(e.target.value)} className="form-select p-2 text-sm">
                  <option value="">- Pilih Bahan -</option>
                  {ingredients.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({formatRupiah(i.costPerUnit)}/{i.unit})</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-[10px] uppercase text-[var(--color-text-secondary)] font-bold mb-1">Jumlah</label>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="form-input p-2 text-sm" placeholder="0" />
              </div>
              <button onClick={addRecipeItem} className="btn btn-secondary px-3 py-2 shrink-0">
                <Plus size={16} />
              </button>
            </div>

            {/* Recipe List */}
            {recipe.length === 0 ? (
              <div className="text-center p-6 bg-[var(--color-bg-primary)] border border-dashed border-[var(--color-coffee-latte)] rounded-lg text-[var(--color-text-muted)] text-sm">
                Belum ada bahan dalam resep ini.
              </div>
            ) : (
              <div className="border border-[var(--color-coffee-latte)] rounded-lg overflow-hidden">
                <table className="data-table">
                  <thead className="bg-[#faf6ef]">
                    <tr>
                      <th>Bahan</th>
                      <th>Takaran</th>
                      <th className="text-right">Biaya (Rp)</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipe.map((item, idx) => {
                      const ing = ingredients.find(i => i.id === item.ingredientId);
                      const cost = item.qty * item.cost;
                      return (
                        <tr key={idx}>
                          <td className="font-medium text-[var(--color-text-primary)]">{ing?.name}</td>
                          <td className="text-[var(--color-text-secondary)]">{item.qty} {item.unit}</td>
                          <td className="text-right font-mono font-medium">{formatRupiah(cost)}</td>
                          <td className="text-center">
                            <button onClick={() => removeRecipeItem(item.ingredientId)} className="text-[var(--color-accent-red)] hover:scale-110 transition-transform">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
        <h3 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <span>Daftar Menu & Resep</span>
          <span className="text-xs bg-[var(--color-coffee-latte)] px-2 py-0.5 rounded-full text-[var(--color-text-secondary)] font-mono font-medium">
            {products.length} Menu
          </span>
        </h3>
        
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
                  const marginPct = prod.sellingPrice > 0 ? ((gross / prod.sellingPrice) * 100).toFixed(0) : 0;
                  const marginStatus = getMarginStatus(marginPct);
                  
                  return (
                    <tr key={prod.id} className={`hover:bg-[#fbf9f4] transition-colors border-b border-[var(--color-coffee-latte)]/40 ${!prod.active ? 'opacity-60 bg-gray-50/50' : ''}`}>
                      <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                        <span className="mr-2 text-base">{prod.emoji || '☕'}</span>
                        {prod.name}
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
                            title="Edit Menu & Resep"
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
