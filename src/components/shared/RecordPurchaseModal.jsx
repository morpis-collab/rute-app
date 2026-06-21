import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { formatRupiah, formatTanggalSingkat } from '../../utils/formatters';

function getLinkedStockTotal(expense) {
  return (expense.items || [])
    .filter((item) => item.addsStock)
    .reduce((sum, item) => sum + Number(item.total ?? item.amount ?? 0), 0);
}

function getRemainingExpenseTotal(expense) {
  return Math.max(0, Number(expense.total || 0) - getLinkedStockTotal(expense));
}

export default function RecordPurchaseModal({
  isOpen,
  onClose,
  onSave,
  preselectedIngredientId,
  initialQty = '',
  initialUnit = '',
  initialTotal = '',
  initialNote = '',
}) {
  const { user } = useAuthStore();
  const ingredients = useAppStore((state) => state.ingredients);
  const expenses = useAppStore((state) => state.expenses);
  const cashAccounts = useAppStore((state) => state.cashAccounts);

  const defaultCashAccount = cashAccounts.find((a) => ['cash', 'tunai'].includes(String(a?.type || '').toLowerCase())) || cashAccounts[0];
  const initialIng = ingredients.find((i) => String(i.id) === String(preselectedIngredientId));

  const [ingredientId, setIngredientId] = useState(preselectedIngredientId || '');
  const [qty, setQty] = useState(initialQty === '' ? '' : String(initialQty));
  const [unit, setUnit] = useState(initialUnit || initialIng?.unit || 'gram');
  const [total, setTotal] = useState(initialTotal === '' ? '' : String(initialTotal));
  const [note, setNote] = useState(initialNote || '');
  const [cashAccountId, setCashAccountId] = useState(defaultCashAccount?.id || '');
  const [existingExpenseId, setExistingExpenseId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reconcileCandidates = useMemo(() => (
    (expenses || [])
      .filter((expense) => expense.status !== 'rejected')
      .filter((expense) => ['manual', 'manual_reconciled', undefined, null].includes(expense.sourceType))
      .filter((expense) => getRemainingExpenseTotal(expense) > 0)
      .filter((expense) => !ingredientId || !(expense.items || []).some((item) => (
        item.addsStock && String(item.ingredientId) === String(ingredientId)
      )))
  ), [expenses, ingredientId]);

  const selectedExistingExpense = reconcileCandidates.find((expense) => String(expense.id) === String(existingExpenseId));

  if (!isOpen) return null;

  const handleIngredientChange = (e) => {
    const id = e.target.value;
    setIngredientId(id);
    setExistingExpenseId('');
    const ing = ingredients.find((i) => String(i.id) === String(id));
    if (ing?.unit) setUnit(ing.unit);
  };

  const handleExistingExpenseChange = (e) => {
    const id = e.target.value;
    setExistingExpenseId(id);
    const selectedExpense = reconcileCandidates.find((expense) => String(expense.id) === String(id));
    if (selectedExpense) {
      setTotal(String(getRemainingExpenseTotal(selectedExpense)));
      if (!note.trim()) setNote(`Rekonsiliasi stok dari pengeluaran ${selectedExpense.description}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ingredientId || !qty || !total || (!existingExpenseId && !cashAccountId) || isSubmitting) return;

    setIsSubmitting(true);
    const selectedIng = ingredients.find((i) => String(i.id) === String(ingredientId));
    const ingredientName = selectedIng?.name || 'Bahan Baku';
    const trimmedNote = note.trim();
    const stockItem = {
      name: ingredientName,
      qty: Number(qty),
      unit,
      price: Number(total) / Number(qty),
      total: Number(total),
      addsStock: true,
      ingredientId: Number(ingredientId),
      stockQty: Number(qty),
      stockUnit: unit,
      note: trimmedNote,
    };

    if (existingExpenseId) {
      try {
        await onSave({
          existingExpenseId,
          item: stockItem,
          user: user?.name || 'Owner',
        });
        onClose();
      } catch (err) {
        console.error('Gagal menghubungkan pengeluaran ke stok', err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const expensePayload = {
      description: `Belanja Bahan: ${ingredientName} (${qty} ${unit})${trimmedNote ? ` - ${trimmedNote}` : ''}`,
      total: Number(total),
      category: 'bahan_baku',
      date: new Date().toISOString(),
      cashAccountId,
      user: user?.name || 'Owner',
      items: [stockItem],
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

  const selectedIng = ingredients.find((i) => String(i.id) === String(ingredientId));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm slide-in">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-xl)] bg-white shadow-[var(--shadow-lg)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
          <h3 className="font-bold text-[var(--color-text-primary)]">Catat Belanja Bahan</h3>
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
            <select
              className="form-select w-full p-2 text-sm"
              value={ingredientId}
              onChange={handleIngredientChange}
              required
              disabled={!!preselectedIngredientId}
            >
              <option value="">-- Pilih Bahan --</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>{ing.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Rekonsiliasi Pengeluaran</label>
            <select
              className="form-select w-full p-2 text-sm"
              value={existingExpenseId}
              onChange={handleExistingExpenseChange}
            >
              <option value="">Buat pengeluaran baru</option>
              {reconcileCandidates.map((expense) => (
                <option key={expense.id} value={expense.id}>
                  {formatTanggalSingkat(expense.date)} - {expense.description} - sisa {formatRupiah(getRemainingExpenseTotal(expense))}
                </option>
              ))}
            </select>
            {existingExpenseId ? (
              <p className="mt-1 text-[11px] font-semibold text-[var(--color-accent-primary)]">
                Stok akan masuk ke pengeluaran lama tanpa mengurangi kas lagi.
              </p>
            ) : (
              <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                Pilih pengeluaran manual lama kalau belanjanya sudah pernah dicatat.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Jumlah</label>
              <input
                type="number"
                className="form-input w-full rounded-md border border-[var(--color-border)] bg-white p-2 font-mono text-sm"
                placeholder="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
                min="0"
                step="any"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Satuan Beli</label>
              <select
                className="form-select w-full p-2 text-sm"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {availableUnits.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Total Biaya (Rp)</label>
            <input
              type="number"
              className="form-input w-full rounded-md border border-[var(--color-border)] bg-white p-2 font-mono text-sm"
              placeholder="0"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required
              min="0"
            />
            {selectedExistingExpense && (
              <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                Sisa nominal pengeluaran: {formatRupiah(getRemainingExpenseTotal(selectedExistingExpense))}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Catatan</label>
            <textarea
              className="form-input min-h-[82px] w-full rounded-md border border-[var(--color-border)] bg-white p-2 text-sm"
              placeholder="Contoh: rekomendasi Restock Planner"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {!existingExpenseId && (
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Sumber Dana / Pembayaran</label>
              <select
                className="form-select w-full p-2 text-sm"
                value={cashAccountId}
                onChange={(e) => setCashAccountId(e.target.value)}
                required
              >
                {cashAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} (Saldo: Rp {(account.balance || 0).toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pb-2 pt-4">
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
