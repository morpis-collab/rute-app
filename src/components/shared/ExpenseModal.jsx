import { useState } from 'react';
import useAuthStore from '../../store/useAuthStore';
import { EXPENSE_CATEGORIES } from '../../utils/constants';

export default function ExpenseModal({ isOpen, onClose, onSave, ingredients }) {
  const { user } = useAuthStore();
  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('');
  const [category, setCategory] = useState('lainnya');
  const [addToStock, setAddToStock] = useState(false);
  const [ingredientId, setIngredientId] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [stockUnit, setStockUnit] = useState('gram');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !total) return;

    const items = [];
    if (addToStock && ingredientId && stockQty) {
      items.push({
        name: description,
        ingredientId: Number(ingredientId),
        addsStock: true,
        stockQty: Number(stockQty),
        stockUnit,
        total: Number(total),
      });
    }

    onSave({
      description,
      total: Number(total),
      category,
      items,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm slide-in">
      <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-md shadow-[var(--shadow-lg)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-primary)] shrink-0">
          <h3 className="font-bold text-[var(--color-text-primary)]">Tambah Pengeluaran</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Deskripsi</label>
            <input 
              type="text" 
              className="form-input text-sm p-2 w-full" 
              placeholder="Contoh: Beli susu sapi, token listrik..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nominal (Rp)</label>
            <input 
              type="number" 
              className="form-input text-sm p-2 font-mono w-full" 
              placeholder="0" 
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Kategori</label>
            <select className="form-select text-sm p-2 w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.filter(cat => !cat.ownerOnly || user?.role === 'owner').map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {category === 'bahan_baku' || category === 'packaging' ? (
             <div className="border border-[var(--color-border)] p-3 rounded-lg bg-[var(--color-bg-secondary)] mt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)] mb-3">
                <input 
                  type="checkbox" 
                  checked={addToStock} 
                  onChange={(e) => setAddToStock(e.target.checked)} 
                  className="rounded border-[var(--color-border)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]"
                />
                Otomatis tambahkan ke Stok Bahan
              </label>

              {addToStock && (
                <div className="space-y-3 pl-6 border-l-2 border-[var(--color-border)] ml-2">
                   <div>
                    <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Pilih Bahan Baku</label>
                    <select className="form-select text-sm p-2 w-full" value={ingredientId} onChange={(e) => setIngredientId(e.target.value)} required>
                      <option value="">-- Pilih Bahan --</option>
                      {ingredients?.map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Jumlah</label>
                      <input type="number" className="form-input text-sm p-2 w-full" placeholder="Qty" value={stockQty} onChange={(e) => setStockQty(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Satuan</label>
                      <select className="form-select text-sm p-2 w-full" value={stockUnit} onChange={(e) => setStockUnit(e.target.value)}>
                        <option value="gram">Gram (g)</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="ml">Mililiter (ml)</option>
                        <option value="l">Liter (L)</option>
                        <option value="pcs">Pcs</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
             </div>
          ) : null}

          <div className="pt-4 pb-2">
            <button type="submit" className="btn btn-primary w-full shadow-md">Simpan Pengeluaran</button>
          </div>
        </form>
      </div>
    </div>
  );
}
