import { useState } from 'react';
import { Minus, Plus, Banknote, QrCode, ArrowRightLeft, ShoppingCart, Trash2, Check } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useSalesStore from '../../store/useSalesStore';
import { formatRupiah } from '../../utils/formatters';

export default function PartnerSales() {
  const products = useAppStore((state) => state.products);
  const { cart, paymentMethod, addToCart, removeFromCart, clearCart, setPaymentMethod, getCartTotal, getCartCount, confirmTransaction } = useSalesStore();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleConfirm = () => {
    const trx = confirmTransaction();
    if (trx) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500); // Faster feedback
    }
  };

  const getQtyInCart = (productId) => {
    const item = cart.find(c => c.productId === productId);
    return item ? item.qty : 0;
  };

  return (
    <PageWrapper title="Jual" subtitle="Pilih menu untuk keranjang">
      {showSuccess && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-success)] text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 text-sm font-medium slide-in">
          <Check size={16} /> Berhasil disimpan
        </div>
      )}

      {/* Menu Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {products.map((product) => {
          const qty = getQtyInCart(product.id);
          return (
            <button
              key={product.id}
              onClick={() => addToCart(product.id)}
              className={`menu-btn ${qty > 0 ? 'selected' : ''}`}
            >
              <div className="h-12 w-full flex items-center justify-center text-3xl mb-1 opacity-90">{product.emoji}</div>
              <span className="text-[11px] font-bold leading-tight text-center px-1">{product.name}</span>
              <span className="text-[10px] font-mono text-[var(--color-text-secondary)] mt-1">{formatRupiah(product.sellingPrice)}</span>
              {qty > 0 && (
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--color-accent-red)] text-white text-[11px] font-bold flex items-center justify-center shadow-md animate-pulse-custom">
                  {qty}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cart Summary (Tabular/Minimal) */}
      {cart.length > 0 && (
        <div className="bg-white border border-[var(--color-border)] rounded-md mb-4 slide-in">
          <div className="px-3 py-2 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-primary)]">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
              <ShoppingCart size={14} />
              <span>{getCartCount()} item</span>
            </div>
            <button onClick={clearCart} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <Trash2 size={14} />
            </button>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {cart.map((item) => (
              <div key={item.productId} className="flex items-center justify-between p-3 text-sm">
                <span className="font-medium text-[var(--color-text-primary)] flex-1">{item.name}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-[var(--color-border)] rounded">
                    <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.productId); }} className="px-2 py-1 text-[var(--color-text-muted)] hover:bg-[#F5F5F5]"><Minus size={12} /></button>
                    <span className="w-6 text-center font-mono text-xs">{item.qty}</span>
                    <button onClick={(e) => { e.stopPropagation(); addToCart(item.productId); }} className="px-2 py-1 text-[var(--color-text-primary)] hover:bg-[#F5F5F5]"><Plus size={12} /></button>
                  </div>
                  <span className="w-16 text-right font-mono text-xs">{formatRupiah(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#FAFAFA] flex justify-between items-center border-t border-[var(--color-border)]">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">Total</span>
            <span className="text-base font-bold font-mono text-[var(--color-text-primary)]">{formatRupiah(getCartTotal())}</span>
          </div>
        </div>
      )}

      {/* Payment & Confirm (Minimal) */}
      {cart.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'qris', label: 'QRIS', icon: QrCode },
              { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`py-2 px-1 rounded flex flex-col items-center gap-1 border transition-colors ${
                  paymentMethod === method.id
                    ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] text-white'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-[#F5F5F5]'
                }`}
              >
                <method.icon size={16} />
                <span className="text-[10px] font-medium uppercase tracking-wider">{method.label}</span>
              </button>
            ))}
          </div>

          <button onClick={handleConfirm} className="w-full btn btn-primary py-3 text-base">
            Simpan — {formatRupiah(getCartTotal())}
          </button>
        </div>
      )}
    </PageWrapper>
  );
}
