import { useState } from 'react';
import { createPortal } from 'react-dom';
import useAppStore from '../../store/useAppStore';
import useToastStore from '../../store/useToastStore';
import { getBusinessDate } from '../../utils/businessDate';
import { formatRupiah } from '../../utils/formatters';

export default function ExpenseModal({ isOpen, onClose, onSave, expense }) {
  const wallets = useAppStore((state) => state.wallets || []);
  const categories = useAppStore((state) => state.categories || { income: [], expense: [] });
  const ingredients = useAppStore((state) => state.ingredients || []);

  const defaultCategories = ["Pembelian Bahan Baku", "Sewa Tempat", "Operasional", "Gaji Staff", "Listrik & Air", "Lain-lain"];
  const expenseCategories = categories?.expense?.length ? categories.expense : defaultCategories;
  const defaultWallet = wallets.find(w => w.isDefault) || wallets[0];

  const [notes, setNotes] = useState(expense?.description || expense?.notes || '');
  const [amount, setAmount] = useState(expense?.amount || expense?.total || '');
  const [category, setCategory] = useState(expense?.category || expenseCategories[0] || 'Pembelian Bahan Baku');
  const [date, setDate] = useState(expense?.date ? expense.date.substring(0, 10) : getBusinessDate());
  const [walletId, setWalletId] = useState(expense?.walletId || defaultWallet?.id || '');

  // Hubungkan ke Master Bahan
  const initialPurchasedIng = expense?.purchasedIngredients?.[0];
  const [linkToIngredient, setLinkToIngredient] = useState(!!initialPurchasedIng);
  const [ingredientId, setIngredientId] = useState(initialPurchasedIng?.ingredientId || '');
  const [qty, setQty] = useState(initialPurchasedIng?.qty || '');

  if (!isOpen) return null;

  const isBahanBaku = category?.toLowerCase().includes('bahan baku');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      useToastStore.getState().addToast('Nominal harus lebih dari 0', 'error');
      return;
    }
    if (!walletId) {
      useToastStore.getState().addToast('Wallet wajib dipilih', 'error');
      return;
    }

    const payload = {
      description: notes.trim(),
      amount: Number(amount),
      total: Number(amount),
      category,
      walletId,
      date: date ? `${date}T12:00:00.000Z` : undefined,
    };

    if (isBahanBaku && linkToIngredient && ingredientId && qty) {
      payload.purchasedIngredients = [{
        ingredientId,
        qty: Number(qty),
        price: Number(amount / qty)
      }];
    } else {
      payload.purchasedIngredients = [];
    }

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error(err);
      // We don't close the modal on error
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs slide-in">
      <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-md shadow-[var(--shadow-lg)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-primary)] shrink-0">
          <h3 className="font-bold text-[var(--color-text-primary)]">
            {expense ? 'Ubah Pengeluaran' : 'Tambah Pengeluaran'}
          </h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Catatan</label>
            <input 
              type="text" 
              className="form-input text-sm p-3 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              placeholder="Contoh: Pembelian susu kental manis, kopi blend..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nominal (Rp)</label>
            <input 
              type="number" 
              className="form-input text-sm p-3 font-mono w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              placeholder="0" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Tanggal</label>
            <input 
              type="date" 
              className="form-input text-sm p-3 w-full font-mono bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Kategori</label>
            <select 
              className="form-select text-sm p-3 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
            >
              {expenseCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Dompet / Sumber Dana</label>
            <select 
              className="form-select text-sm p-3 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              value={walletId} 
              onChange={(e) => setWalletId(e.target.value)} 
              required
            >
              <option value="">Pilih Wallet</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name} (Saldo: {formatRupiah(w.balance)})</option>
              ))}
            </select>
          </div>

          {/* Hubungkan ke Master Bahan Section (Opsional) */}
          {isBahanBaku && (
            <div className="pt-2 border-t border-dashed border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <input 
                  type="checkbox" 
                  id="linkToIngredient"
                  className="w-5 h-5 rounded border-[var(--color-border)] text-[var(--color-accent-primary)] focus:ring-[var(--color-accent-primary)]" 
                  checked={linkToIngredient}
                  onChange={(e) => setLinkToIngredient(e.target.checked)}
                />
                <label htmlFor="linkToIngredient" className="text-xs font-semibold text-[var(--color-text-secondary)] select-none">
                  Hubungkan ke Master Bahan
                </label>
              </div>

              {linkToIngredient && (
                <div className="space-y-3 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
                      Bahan Baku
                    </label>
                    <select 
                      className="form-select text-sm p-3 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
                      value={ingredientId}
                      onChange={(e) => setIngredientId(e.target.value)}
                      required={linkToIngredient}
                    >
                      <option value="">Pilih Bahan Baku</option>
                      {ingredients.map(ing => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
                      Kuantitas (Qty)
                    </label>
                    <input 
                      type="number"
                      step="any"
                      className="form-input text-sm p-3 w-full font-mono font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
                      placeholder="0"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      required={linkToIngredient}
                      min="0.01"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)] shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50 cursor-pointer h-[44px]"
            >
              Batal
            </button>
            <button 
              type="submit" 
              className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-primary)]/90 cursor-pointer h-[44px]"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
