import { useState, useMemo } from 'react';
import { Plus, Trash2, Save, Check } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah } from '../../utils/formatters';

export default function OwnerMenuHPP() {
  const ingredients = useAppStore((state) => state.ingredients);
  const addProduct = useAppStore((state) => state.addProduct);
  const [showSuccess, setShowSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    category: 'Espresso Based',
    price: 0,
    description: '',
  });

  const [recipe, setRecipe] = useState([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [qty, setQty] = useState('');

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
    await addProduct({
      name: form.name,
      category: form.category.toLowerCase().replace(' ', '_'),
      sellingPrice: form.price,
      hpp: totalHPP,
      recipe: recipe,
      emoji: '☕'
    });
    setIsSubmitting(false);

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    
    setForm({ name: '', category: 'Espresso Based', price: 0, description: '' });
    setRecipe([]);
  };

  return (
    <PageWrapper title="Menu & Resep" subtitle="Recipe Builder & HPP Kalkulator">
      {showSuccess && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-success)] text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 text-sm font-medium slide-in">
          <Check size={16} /> Menu berhasil disimpan
        </div>
      )}

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
              <div className="grid grid-cols-2 gap-4">
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
            
            <div className="mt-8 relative z-10">
              <button 
                onClick={handleSave}
                disabled={!form.name || form.price <= 0 || isSubmitting}
                className="w-full bg-white text-[var(--color-band-1)] font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:-translate-y-1 transition-transform disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isSubmitting ? <><Save size={18} className="animate-spin" /> Menyimpan...</> : <><Save size={18} /> Simpan Menu Baru</>}
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

    </PageWrapper>
  );
}
