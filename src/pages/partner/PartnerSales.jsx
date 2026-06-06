import { useState, useEffect } from 'react';
import { Minus, Plus, Banknote, QrCode, ArrowRightLeft, ShoppingCart, Trash2, Check } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useSalesStore from '../../store/useSalesStore';
import { formatRupiah } from '../../utils/formatters';
import { getBusinessDate } from '../../utils/businessDate';

export default function PartnerSales() {
  const products = useAppStore((state) => state.products);
  const cart = useSalesStore((state) => state.cart);
  const paymentMethod = useSalesStore((state) => state.paymentMethod);
  const addToCart = useSalesStore((state) => state.addToCart);
  const removeFromCart = useSalesStore((state) => state.removeFromCart);
  const clearCart = useSalesStore((state) => state.clearCart);
  const setPaymentMethod = useSalesStore((state) => state.setPaymentMethod);
  const getCartTotal = useSalesStore((state) => state.getCartTotal);
  const getCartCount = useSalesStore((state) => state.getCartCount);
  const confirmTransaction = useSalesStore((state) => state.confirmTransaction);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionDate, setTransactionDate] = useState(getBusinessDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  // Auto-close bottom sheet if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      const timer = setTimeout(() => setIsBottomSheetOpen(false), 0);
      return () => clearTimeout(timer);
    }
  }, [cart.length]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const success = await confirmTransaction(transactionDate);
    setIsSubmitting(false);
    if (success) {
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

      {/* Date Selector */}
      <div className="glass-card mb-4 flex items-center justify-between py-2 px-3">
        <span className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase">Tanggal Transaksi</span>
        <input 
          type="date" 
          value={transactionDate} 
          onChange={(e) => setTransactionDate(e.target.value)} 
          className="form-input text-xs p-1.5 w-36 font-mono bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]"
        />
      </div>

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

      {/* Desktop Cart Summary & Payment (Hidden on Mobile) */}
      {cart.length > 0 && (
        <div className="hidden lg:block space-y-4 mt-6">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-sm slide-in overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-secondary)]">
                <ShoppingCart size={16} />
                <span>{getCartCount()} item</span>
              </div>
              <button onClick={clearCart} className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] transition-colors p-1.5 rounded-lg hover:bg-[var(--color-bg-primary)]">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between p-4 text-sm hover:bg-[var(--color-bg-primary)] transition-colors">
                  <span className="font-semibold text-[var(--color-text-primary)] flex-1">{item.name}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)] overflow-hidden">
                      <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.productId); }} className="px-2 py-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors"><Minus size={12} /></button>
                      <span className="w-6 text-center font-bold font-mono text-xs">{item.qty}</span>
                      <button onClick={(e) => { e.stopPropagation(); addToCart(item.productId); }} className="px-2 py-1 text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors"><Plus size={12} /></button>
                    </div>
                    <span className="w-20 text-right font-bold font-mono text-xs">{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[var(--color-bg-secondary)] flex justify-between items-center border-t border-[var(--color-border)]">
              <span className="text-sm font-bold text-[var(--color-text-primary)]">Total</span>
              <span className="text-base font-extrabold font-mono text-[var(--color-band-1)]">{formatRupiah(getCartTotal())}</span>
            </div>
          </div>

          <div className="space-y-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 rounded-xl shadow-sm">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">Metode Pembayaran</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'qris', label: 'QRIS', icon: QrCode },
                  { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
                ].map((method) => {
                  const SelectedIcon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`py-3.5 px-2 rounded-xl flex flex-col items-center gap-1.5 border-2 transition-all font-semibold ${
                        isSelected
                          ? 'border-[var(--color-band-1)] bg-[var(--color-band-1)] text-white shadow-md'
                          : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                      }`}
                    >
                      <SelectedIcon size={18} />
                      <span className="text-[10px] uppercase tracking-wider">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={handleConfirm} disabled={isSubmitting} className="w-full btn btn-primary py-3.5 text-sm font-bold rounded-xl disabled:opacity-50">
              {isSubmitting ? 'Menyimpan...' : `Simpan Transaksi — ${formatRupiah(getCartTotal())}`}
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom Bar (Mobile/Standard) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-[68px] left-0 right-0 p-4 bg-transparent z-40 pointer-events-none">
          <div className="max-w-md mx-auto bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-xl rounded-full p-2 flex items-center justify-between pointer-events-auto">
            <button 
              onClick={() => setIsBottomSheetOpen(true)}
              className="flex items-center gap-3 pl-4 text-left focus:outline-none"
            >
              <div className="relative">
                <ShoppingCart size={20} className="text-[var(--color-band-1)]" />
                <span className="absolute -top-2 -right-2 bg-[var(--color-accent-red)] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {getCartCount()}
                </span>
              </div>
              <div>
                <div className="text-[10px] text-[var(--color-text-muted)] font-medium">Keranjang</div>
                <div className="text-sm font-extrabold font-mono text-[var(--color-text-primary)]">{formatRupiah(getCartTotal())}</div>
              </div>
            </button>
            <button
              onClick={() => setIsBottomSheetOpen(true)}
              className="btn btn-primary rounded-full px-6 py-2.5 text-xs font-bold flex items-center gap-1.5"
            >
              <span>Bayar</span>
              <span className="opacity-80">({formatRupiah(getCartTotal())})</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sheet Drawer for Mobile */}
      {isBottomSheetOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-50 transition-opacity flex items-end justify-center cursor-pointer"
          onClick={() => setIsBottomSheetOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-[var(--color-bg-card)] rounded-t-[24px] border-t border-[var(--color-border)] shadow-2xl pb-6 slide-in cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-[var(--color-border)] rounded-full mx-auto my-3" />
            
            {/* Header */}
            <div className="px-5 pb-3 flex items-center justify-between border-b border-[var(--color-border)]">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">Konfirmasi Pesanan</h3>
                <p className="text-xs text-[var(--color-text-muted)]">{getCartCount()} Item Terpilih</p>
              </div>
              <button 
                onClick={() => {
                  clearCart();
                  setIsBottomSheetOpen(false);
                }}
                className="text-xs font-semibold text-[var(--color-accent-red)] hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 size={14} />
                Hapus Semua
              </button>
            </div>

            {/* Cart Items List */}
            <div className="max-h-[35vh] overflow-y-auto divide-y divide-[var(--color-border)] px-5">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-bold text-[var(--color-text-primary)] truncate">{item.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-primary)]">
                      <button 
                        onClick={() => removeFromCart(item.productId)} 
                        className="px-2.5 py-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors rounded-l-lg"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold font-mono text-xs text-[var(--color-text-primary)]">{item.qty}</span>
                      <button 
                        onClick={() => addToCart(item.productId)} 
                        className="px-2.5 py-1.5 text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors rounded-r-lg"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="w-20 text-right font-bold font-mono text-xs text-[var(--color-text-primary)]">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout Area */}
            <div className="p-5 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] space-y-4">
              {/* Payment Methods */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block">Metode Pembayaran</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'qris', label: 'QRIS', icon: QrCode },
                    { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
                  ].map((method) => {
                    const SelectedIcon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`py-3 px-2 rounded-xl flex flex-col items-center gap-1.5 border-2 transition-all font-semibold ${
                          isSelected
                            ? 'border-[var(--color-band-1)] bg-[var(--color-band-1)] text-white shadow-md'
                            : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
                        }`}
                      >
                        <SelectedIcon size={18} />
                        <span className="text-[10px] uppercase tracking-wider">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total & Confirm Button */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">Total Tagihan</span>
                  <span className="text-lg font-extrabold font-mono text-[var(--color-band-1)]">{formatRupiah(getCartTotal())}</span>
                </div>

                <button 
                  onClick={async () => {
                    await handleConfirm();
                    setIsBottomSheetOpen(false);
                  }} 
                  disabled={isSubmitting} 
                  className="w-full btn btn-primary py-3.5 text-sm font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:opacity-95"
                >
                  {isSubmitting ? (
                    'Menyimpan...'
                  ) : (
                    <>
                      <span>Bayar & Simpan</span>
                      <span className="opacity-80">|</span>
                      <span className="font-mono">{formatRupiah(getCartTotal())}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
