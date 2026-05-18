import { useState } from 'react';

export default function StockAdjustmentModal({ isOpen, onClose, onSave, ingredients }) {
  const [ingredientId, setIngredientId] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('gram');
  const [type, setType] = useState('masuk');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ingredientId || !qty || !reason) return;

    onSave({
      ingredientId: Number(ingredientId),
      qty: Number(qty),
      unit,
      type, // 'masuk' or 'keluar'
      reason,
    });
    onClose();
  };

  const handleIngredientChange = (event) => {
    const nextIngredientId = event.target.value;
    setIngredientId(nextIngredientId);
    const selectedIngredient = ingredients?.find((ingredient) => String(ingredient.id) === String(nextIngredientId));
    if (selectedIngredient?.unit) setUnit(selectedIngredient.unit);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm slide-in">
      <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-md shadow-[var(--shadow-lg)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-primary)]">
          <h3 className="font-bold text-[var(--color-text-primary)]">Koreksi / Tambah Stok</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Pilih Bahan Baku</label>
            <select className="form-select text-sm p-2 w-full" value={ingredientId} onChange={handleIngredientChange} required>
              <option value="">-- Pilih Bahan --</option>
              {ingredients?.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
            {!ingredients?.length && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">Belum ada bahan baku. Tambahkan bahan baru dulu dari halaman stok owner.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Jenis Koreksi</label>
              <select className="form-select text-sm p-2 w-full" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="masuk">Stok Masuk (+)</option>
                <option value="keluar">Stok Keluar (-)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Jumlah</label>
              <div className="flex gap-2">
                <input type="number" className="form-input text-sm p-2 w-full font-mono" placeholder="0" value={qty} onChange={(e) => setQty(e.target.value)} required />
                <select className="form-select text-sm p-2 w-20" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="gram">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">L</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Alasan / Catatan</label>
            <input type="text" className="form-input text-sm p-2 w-full" placeholder="Contoh: Barang datang, tumpah, expired..." value={reason} onChange={(e) => setReason(e.target.value)} required />
          </div>

          <div className="pt-2">
            <button type="submit" className="btn btn-primary w-full shadow-md">Simpan Perubahan Stok</button>
          </div>
        </form>
      </div>
    </div>
  );
}
