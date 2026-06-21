import { useState } from 'react';
import { createPortal } from 'react-dom';
import { buildStockAdjustmentPayload } from '../../utils/stockAdjustment';
import { formatUnit } from '../../utils/formatters';

export default function StockAdjustmentModal({ isOpen, onClose, onSave, ingredients, user = 'Owner' }) {
  const [mode, setMode] = useState('set_actual');
  const [ingredientId, setIngredientId] = useState('');
  const [qty, setQty] = useState('');
  const [actualStock, setActualStock] = useState('');
  const [unit, setUnit] = useState('gram');
  const [type, setType] = useState('masuk');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedIngredient = ingredients?.find((ingredient) => String(ingredient.id) === String(ingredientId));
  const currentStock = Number(selectedIngredient?.stock || 0);
  const targetStock = Number(actualStock);
  const previewDelta = mode === 'set_actual' && selectedIngredient && actualStock !== '' && Number.isFinite(targetStock)
    ? Number((targetStock - currentStock).toFixed(3))
    : 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const payload = buildStockAdjustmentPayload({
        mode,
        ingredient: selectedIngredient,
        actualStock,
        qty,
        unit,
        type,
        reason,
        user,
      });
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Data koreksi stok belum lengkap');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIngredientChange = (event) => {
    const nextIngredientId = event.target.value;
    setIngredientId(nextIngredientId);
    const nextIngredient = ingredients?.find((ingredient) => String(ingredient.id) === String(nextIngredientId));
    if (nextIngredient?.unit) setUnit(nextIngredient.unit);
    setActualStock(nextIngredient?.stock == null ? '' : String(nextIngredient.stock));
    setQty('');
    setError('');
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm slide-in">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-xl)] bg-white shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
          <div>
            <h3 className="font-bold text-[var(--color-text-primary)]">Koreksi Stok</h3>
            <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-muted)]">Samakan stok sistem dengan stok fisik di kedai.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-[var(--radius-button)] text-[var(--color-text-muted)] hover:bg-[var(--color-coffee-milk)] hover:text-[var(--color-text-primary)]"
            aria-label="Tutup"
          >
            X
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-5">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Pilih Bahan Baku</label>
            <select className="form-select w-full p-2 text-sm" value={ingredientId} onChange={handleIngredientChange} required>
              <option value="">-- Pilih Bahan --</option>
              {ingredients?.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>
              ))}
            </select>
            {!ingredients?.length && (
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">Belum ada bahan baku. Tambahkan bahan baru dulu dari halaman stok owner.</p>
            )}
          </div>

          {selectedIngredient && (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
              <p className="text-[10px] font-extrabold uppercase text-[var(--color-text-muted)]">Stok sistem saat ini</p>
              <p className="mt-1 font-mono text-lg font-black text-[var(--color-text-primary)]">
                {formatUnit(selectedIngredient.stock, selectedIngredient.unit)}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-[var(--radius-button)] bg-[var(--color-coffee-milk)] p-1">
            <button
              type="button"
              onClick={() => setMode('set_actual')}
              className={`rounded-[var(--radius-button)] px-3 py-2 text-xs font-black transition ${mode === 'set_actual' ? 'bg-white text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
            >
              Set Stok Aktual
            </button>
            <button
              type="button"
              onClick={() => setMode('manual_delta')}
              className={`rounded-[var(--radius-button)] px-3 py-2 text-xs font-black transition ${mode === 'manual_delta' ? 'bg-white text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
            >
              Tambah/Kurangi
            </button>
          </div>

          {mode === 'set_actual' ? (
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Stok Fisik di Kedai</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-input w-full p-2 font-mono text-sm"
                  placeholder="0"
                  value={actualStock}
                  onChange={(event) => setActualStock(event.target.value)}
                  required
                />
                <span className="grid min-w-16 place-items-center rounded-md border border-[var(--color-border)] bg-white px-3 text-sm font-bold text-[var(--color-text-secondary)]">
                  {selectedIngredient?.unit || unit}
                </span>
              </div>
              {selectedIngredient && actualStock !== '' && Number.isFinite(targetStock) && (
                <p className={`mt-2 text-xs font-bold ${previewDelta === 0 ? 'text-[var(--color-text-muted)]' : previewDelta > 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
                  {previewDelta === 0
                    ? 'Tidak ada selisih dari stok sistem.'
                    : `${previewDelta > 0 ? 'Akan menambah' : 'Akan mengurangi'} ${Math.abs(previewDelta).toLocaleString('id-ID')} ${selectedIngredient.unit}`}
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Jenis Koreksi</label>
                <select className="form-select w-full p-2 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
                  <option value="masuk">Stok Masuk (+)</option>
                  <option value="keluar">Stok Keluar (-)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Jumlah</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-input w-full p-2 font-mono text-sm"
                    placeholder="0"
                    value={qty}
                    onChange={(event) => setQty(event.target.value)}
                    required
                  />
                  <select className="form-select w-20 p-2 text-sm" value={unit} onChange={(event) => setUnit(event.target.value)}>
                    <option value="gram">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">L</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Alasan / Catatan</label>
            <input
              type="text"
              className="form-input w-full p-2 text-sm"
              placeholder="Contoh: stock opname, rusak, tercecer, salah input..."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-[var(--radius-card)] border border-[#EAC1B8] bg-[#FFF0EC] p-3 text-xs font-bold text-[#A04434]">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full shadow-md disabled:opacity-50">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Stok'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
