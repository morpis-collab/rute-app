import { createPortal } from 'react-dom';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatUnit } from '../../utils/formatters';

export default function PurchaseHistoryModal({ isOpen, onClose, ingredientId }) {
  const ingredients = useAppStore((state) => state.ingredients);
  const expenses = useAppStore((state) => state.expenses);
  const cashAccounts = useAppStore((state) => state.cashAccounts);

  if (!isOpen || !ingredientId) return null;

  const ingredient = ingredients.find(i => String(i.id) === String(ingredientId));
  if (!ingredient) return null;

  // Filter expenses that contain this ingredient
  const history = expenses
    .filter(exp => 
      exp.status !== 'rejected' &&
      exp.items?.some(item => String(item.ingredientId) === String(ingredientId))
    )
    .map(exp => {
      // Find the specific item inside the expense
      const item = exp.items.find(it => String(it.ingredientId) === String(ingredientId));
      const cashAccount = cashAccounts.find(a => String(a.id) === String(exp.cashAccountId));

      return {
        id: exp.id,
        date: exp.date,
        qty: item?.stockQty || item?.qty || 0,
        unit: item?.stockUnit || item?.unit || ingredient.unit,
        price: item?.price || (item ? item.total / item.qty : 0),
        total: item?.total || item?.subtotal || 0,
        user: exp.user || 'Owner',
        cashAccountName: cashAccount ? cashAccount.name : 'Kas Utama'
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm slide-in">
      <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-2xl shadow-[var(--shadow-lg)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-primary)] shrink-0">
          <div>
            <h3 className="font-bold text-[var(--color-text-primary)]">Riwayat Belanja</h3>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Histori pembelian bahan: <strong className="text-[var(--color-accent-primary)]">{ingredient.name}</strong></p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer">
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {history.length === 0 ? (
            <div className="text-center p-8 bg-[var(--color-bg-primary)] border border-dashed border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)] text-sm">
              Belum ada riwayat pembelian untuk bahan baku ini di sistem.
            </div>
          ) : (
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-cream-card border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="p-3 font-semibold">Tanggal</th>
                    <th className="p-3 font-semibold text-right">Jumlah</th>
                    <th className="p-3 font-semibold text-right">Harga / Satuan</th>
                    <th className="p-3 font-semibold text-right">Total</th>
                    <th className="p-3 font-semibold">Kas</th>
                    <th className="p-3 font-semibold">Pembeli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-primary)] font-mono">
                  {history.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-cream-hover transition-colors">
                      <td className="p-3 font-sans text-xs text-[var(--color-text-secondary)]">
                        {formatDate(row.date)}
                      </td>
                      <td className="p-3 text-right text-[var(--color-text-primary)] font-semibold">
                        {formatUnit(row.qty, row.unit)}
                      </td>
                      <td className="p-3 text-right text-[var(--color-text-secondary)]">
                        {formatRupiah(row.price)}
                      </td>
                      <td className="p-3 text-right text-[var(--color-accent-primary)] font-bold">
                        {formatRupiah(row.total)}
                      </td>
                      <td className="p-3 font-sans text-xs text-[var(--color-text-secondary)]">
                        {row.cashAccountName}
                      </td>
                      <td className="p-3 font-sans text-xs text-[var(--color-text-secondary)]">
                        {row.user}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
