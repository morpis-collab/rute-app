import { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Banknote,
  CalendarDays,
  Check,
  Clock,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import { PaymentSegmented, ProductTile } from '../../components/common/DashboardPrimitives';
import useAppStore from '../../store/useAppStore';
import useSalesStore from '../../store/useSalesStore';
import { formatRupiah } from '../../utils/formatters';
import { getBusinessDate } from '../../utils/businessDate';
import { findBestPromotionForProduct } from '../../utils/promotions';
import { motion, AnimatePresence } from 'framer-motion';

const paymentOptions = [
  { id: 'cash', label: 'Cash / Tunai', icon: Banknote },
  { id: 'qris', label: 'QRIS', icon: QrCode },
  { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
];

export default function PartnerSales() {
  const products = useAppStore((state) => state.products);
  const promotions = useAppStore((state) => state.promotions);
  const cashSessions = useAppStore((state) => state.cashSessions);
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
  const [search, setSearch] = useState('');

  const todaySession = cashSessions.find((session) => session.date === transactionDate);
  const isCashClosed = todaySession?.status === 'closed';

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const activeProducts = (products || []).filter((product) => product.active !== false);
    if (!query) return activeProducts;
    return activeProducts.filter((product) => (
      String(product.name || '').toLowerCase().includes(query)
      || String(product.category || '').toLowerCase().includes(query)
    ));
  }, [products, search]);

  const promotionByProductId = useMemo(() => {
    const map = new Map();
    (filteredProducts || []).forEach((product) => {
      const match = findBestPromotionForProduct(product, promotions, transactionDate);
      if (match) map.set(String(product.id), match);
    });
    return map;
  }, [filteredProducts, promotions, transactionDate]);

  const handleConfirm = async () => {
    if (isSubmitting || cart.length === 0) return;
    setIsSubmitting(true);
    const success = await confirmTransaction(transactionDate);
    setIsSubmitting(false);
    if (success) {
      setShowSuccess(true);
      setIsBottomSheetOpen(false);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const getQtyInCart = (productId) => {
    const item = cart.find((cartItem) => String(cartItem.productId) === String(productId));
    return item ? item.qty : 0;
  };

  const handleAddToCart = (productId) => {
    addToCart(productId, transactionDate);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.02 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 8 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }
  };

  return (
    <PageWrapper title="Penjualan Cepat" subtitle="Pilih menu, tentukan pembayaran, simpan transaksi">
      {/* Top Banner Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="fixed left-1/2 top-20 z-50 flex items-center gap-2 rounded-full bg-[var(--color-success)] px-5 py-2.5 text-xs font-black text-white shadow-lg"
          >
            <Check size={16} strokeWidth={3} className="animate-bounce" />
            <span>Transaksi Berhasil Disimpan</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sales Date / Shift Status Header */}
      <div className="mb-5 grid grid-cols-3 gap-2.5 rounded-2xl border border-[var(--color-border)] bg-white p-2.5 shadow-sm">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-band-4)] px-3 py-2 border border-[var(--color-border)]">
          <CalendarDays size={18} className="text-[var(--color-band-1)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold uppercase text-[var(--color-text-muted)] tracking-wider">Tanggal Bisnis</p>
            <input
              type="date"
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              className="w-full bg-transparent font-mono text-[11px] font-bold text-[var(--color-text-primary)] outline-none border-0 p-0 focus:ring-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-info/10 px-3 py-2 border border-info/20">
          <Clock size={18} className="text-info" />
          <div className="min-w-0">
            <p className="text-[9px] font-extrabold uppercase text-[var(--color-text-muted)] tracking-wider">Shift Aktif</p>
            <p className="truncate text-[11px] font-extrabold text-[var(--color-text-primary)]">Shift Utama</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${isCashClosed ? 'bg-success/10 border-success/20' : 'bg-amber-50 border-amber-100'}`}>
          <Banknote size={18} className={isCashClosed ? 'text-success' : 'text-amber-600'} />
          <div className="min-w-0">
            <p className="text-[9px] font-extrabold uppercase text-[var(--color-text-muted)] tracking-wider">Kas Harian</p>
            <p className="truncate text-[11px] font-extrabold text-[var(--color-text-primary)]">{isCashClosed ? 'Sudah Tutup' : 'Shift Jalan'}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: POS Search & Split layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Catalog Side */}
        <div className="flex-1">
          {/* Search bar & Action triggers */}
          <div className="mb-4 flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari menu kopi, non-kopi, makanan..."
                className="form-input h-12 pl-10.5 text-xs font-bold rounded-xl"
              />
            </div>
            {cart.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearCart}
                className="touch-target flex items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 w-12 h-12 shrink-0 transition-colors"
                title="Kosongkan Keranjang"
              >
                <Trash2 size={18} />
              </motion.button>
            )}
          </div>

          {/* Product grid catalog */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 gap-3 pb-28 lg:grid-cols-3 lg:pb-4 xl:grid-cols-4"
          >
            {filteredProducts.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                <ProductTile
                  product={product}
                  qty={getQtyInCart(product.id)}
                  onClick={() => handleAddToCart(product.id)}
                  promotionMatch={promotionByProductId.get(String(product.id))}
                />
              </motion.div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-3 rounded-2xl border border-dashed border-[var(--color-border)] bg-white/50 p-8 text-center text-xs font-bold text-[var(--color-text-muted)] lg:col-span-3 xl:col-span-4">
                Menu tidak ditemukan
              </div>
            )}
          </motion.div>
        </div>

        {/* Desktop Persistent Checkout Panel */}
        {cart.length > 0 && (
          <div className="hidden lg:block lg:w-96 lg:sticky lg:top-[90px] shrink-0">
            <CheckoutPanel
              cart={cart}
              addToCart={handleAddToCart}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              total={getCartTotal()}
              count={getCartCount()}
              isSubmitting={isSubmitting}
              onConfirm={handleConfirm}
            />
          </div>
        )}
      </div>

      {/* Mobile Sticky Floating Cart Bottom Bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-[78px] left-4 right-4 z-40 lg:hidden"
          >
            <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-[20px] border border-[var(--color-border)] bg-white p-2 shadow-[0_8px_32px_rgba(76,105,77,0.15)] backdrop-blur-md">
              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(true)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1 text-left"
              >
                <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-band-4)] text-[var(--color-band-1)] shrink-0">
                  <ShoppingCart size={18} />
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--color-accent-red)] text-[9px] font-black text-white shadow-sm">
                    {getCartCount()}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-extrabold uppercase text-[var(--color-text-muted)] tracking-wider">Keranjang</span>
                  <span className="block truncate font-mono text-sm font-black text-[var(--color-text-primary)] leading-tight">{formatRupiah(getCartTotal())}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(true)}
                className="btn btn-primary px-6 h-11 min-h-[44px] shrink-0"
              >
                Bayar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer Bottom Sheet */}
      <AnimatePresence>
        {isBottomSheetOpen && cart.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setIsBottomSheetOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="relative w-full max-w-md rounded-t-[24px] bg-white p-4 shadow-2xl z-10"
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 cursor-pointer"
                onClick={() => setIsBottomSheetOpen(false)}
              />
              <CheckoutPanel
                cart={cart}
                addToCart={handleAddToCart}
                removeFromCart={removeFromCart}
                clearCart={clearCart}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                total={getCartTotal()}
                count={getCartCount()}
                isSubmitting={isSubmitting}
                onConfirm={handleConfirm}
                onClose={() => setIsBottomSheetOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

function CheckoutPanel({
  cart,
  addToCart,
  removeFromCart,
  clearCart,
  paymentMethod,
  setPaymentMethod,
  total,
  count,
  isSubmitting,
  onConfirm,
  onClose,
}) {
  return (
    <div className="glass-card bg-white p-0 relative overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-md">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3.5 bg-gray-50/50">
        <div>
          <h3 className="text-sm font-black text-[var(--color-text-primary)]">Keranjang Belanja</h3>
          <p className="text-[10px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-wider">{count} menu terpilih</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearCart}
            className="touch-target flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
            title="Kosongkan Keranjang"
          >
            <Trash2 size={17} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="touch-target flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-coffee-milk)]"
              title="Tutup Panel"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="max-h-[36vh] overflow-y-auto px-4 py-1.5 scrollbar-thin">
        {cart.map((item) => (
          <div key={item.productId} className="flex items-center gap-3 border-b border-[var(--color-border)] py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-[var(--color-text-primary)]">{item.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <p className="font-mono text-[11px] font-extrabold text-[var(--color-text-muted)]">{formatRupiah(item.price)}</p>
                {item.promoId && (
                  <span className="rounded-md bg-[#fff1d9] px-1.5 py-0.5 text-[8px] font-black uppercase text-[#9a5d1b]">
                    {item.promoName || 'Promo'}
                  </span>
                )}
              </div>
              {Number(item.discountAmount || 0) > 0 && (
                <p className="mt-0.5 font-mono text-[10px] font-bold text-[var(--color-text-muted)]">
                  Hemat {formatRupiah(Number(item.discountAmount || 0) * Number(item.qty || 0))}
                </p>
              )}
            </div>
            
            {/* Quantity Controller Buttons */}
            <div className="flex items-center overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-band-4)]">
              <button
                type="button"
                onClick={() => removeFromCart(item.productId)}
                className="w-9 h-9 flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-white/50 active:scale-90 select-none"
              >
                <Minus size={12} strokeWidth={2.5} />
              </button>
              <span className="w-8 text-center font-mono text-xs font-black text-[var(--color-text-primary)]">{item.qty}</span>
              <button
                type="button"
                onClick={() => addToCart(item.productId)}
                className="w-9 h-9 flex items-center justify-center text-[var(--color-band-1)] hover:bg-white/50 active:scale-90 select-none"
              >
                <Plus size={12} strokeWidth={2.5} />
              </button>
            </div>
            
            <p className="w-20 text-right font-mono text-xs font-black text-[var(--color-text-primary)]">{formatRupiah(item.subtotal)}</p>
          </div>
        ))}
      </div>

      {/* Segmented Payment & Totals */}
      <div className="space-y-4 bg-[var(--color-band-4)] p-4 border-t border-[var(--color-border)]">
        <div>
          <p className="text-[9px] font-extrabold uppercase text-[var(--color-text-muted)] tracking-wider mb-2">Metode Pembayaran</p>
          <PaymentSegmented value={paymentMethod} options={paymentOptions} onChange={setPaymentMethod} />
        </div>
        
        <div className="flex items-end justify-between pt-1">
          <span className="text-xs font-black text-[var(--color-text-primary)]">Total Transaksi</span>
          <span className="font-mono text-xl font-black text-[var(--color-band-1)] leading-none">{formatRupiah(total)}</span>
        </div>
        
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="btn btn-primary w-full text-xs font-black tracking-wide h-12"
        >
          {isSubmitting ? 'Menyimpan Transaksi...' : 'Bayar & Simpan'}
        </button>
      </div>
    </div>
  );
}
