import { useState } from 'react';
import { createPortal } from 'react-dom';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';

export default function RecordPurchaseModal({ isOpen, onClose, onSave, preselectedIngredientId }) {
  const { user } = useAuthStore();
  const ingredients = useAppStore((state) => state.ingredients);
  const cashAccounts = useAppStore((state) => state.cashAccounts);

  const defaultCashAccount = cashAccounts.find(a => ['cash', 'tunai'].includes(a.type.toLowerCase())) || cashAccounts[0];
  const initialIng = ingredients.find(i => String(i.id) === String(preselectedIngredientId));

  const [ingredientId, setIngredientId] = useState(preselectedIngredientId || '');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(initialIng?.unit || 'gram');
  const [total, setTotal] = useState('');
  const [cashAccountId, setCashAccountId] = useState(defaultCashAccount?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleIngredientChange = (e) => {
    const id = e.target.value;
    setIngredientId(id);
    const ing = ingredients.find(i => String(i.id) === String(id));
    if (ing?.unit) setUnit(ing.unit);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ingredientId || !qty || !total || !cashAccountId || isSubmitting) return;

    setIsSubmitting(true);
    const selectedIng = ingredients.find(i => String(i.id) === String(ingredientId));
    const ingredientName = selectedIng?.name || 'Bahan Baku';

    const expensePayload = {
      description: `Belanja Bahan: ${ingredientName} (${qty} ${unit})`,
      total: Number(total),
      category: 'bahan_baku',
      date: new Date().toISOString(),
      cashAccountId: cashAccountId,
      user: user?.name || 'Partner',
      items: [
        {
          name: ingredientName,
          qty: Number(qty),
          unit: unit,
          price: Number(total) / Number(qty),
          total: Number(total),
          addsStock: true,
          ingredientId: Number(ingredientId),
          stockQty: Number(qty),
          stockUnit: unit
        }
      ]
    };

    try {
      await onSave(expensePayload);
      onClose();
    } catch (err) {
      console.error('Gagal mencatat belanja bahan', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Available units list
  const selectedIng = ingredients.find(i => String(i.id) === String(ingredientId));
  const availableUnits = ['pcs', 'gram', 'kg', 'ml', 'l', 'liter', 'porsi'];
  if (selectedIng && selectedIng.unitConversions) {
    Object.keys(selectedIng.unitConversions).forEach((u) => {
      if (!availableUnits.includes(u)) availableUnits.push(u);
    });
  }
  if (selectedIng?.unit && !availableUnits.includes(selectedIng.unit)) {
    availableUnits.push(selectedIng.unit);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm slide-in">
      <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-md shadow-[var(--shadow-lg)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-primary)] shrink-0">
          <h3 className="font-bold text-[var(--color-text-primary)]">Catat Belanja Bahan</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Pilih Bahan Baku</label>
            <select
              className="form-select text-sm p-2 w-full"
              value={ingredientId}
              onChange={handleIngredientChange}
              required
              disabled={!!preselectedIngredientId}
            >
              <option value="">-- Pilih Bahan --</option>
              {ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Jumlah</label>
              <input
                type="number"
                className="form-input text-sm p-2 w-full font-mono bg-white border border-[var(--color-border)] rounded-md"
                placeholder="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
                min="0"
                step="any"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Satuan Beli</label>
              <select
                className="form-select text-sm p-2 w-full"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {availableUnits.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Total Biaya (Rp)</label>
            <input
              type="number"
              className="form-input text-sm p-2 w-full font-mono bg-white border border-[var(--color-border)] rounded-md"
              placeholder="0"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Sumber Dana / Pembayaran</label>
            <select
              className="form-select text-sm p-2 w-full"
              value={cashAccountId}
              onChange={(e) => setCashAccountId(e.target.value)}
              required
            >
              {cashAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} (Saldo: Rp {(account.balance || 0).toLocaleString('id-ID')})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 pb-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Pembelian'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
