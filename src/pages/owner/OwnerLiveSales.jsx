import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Banknote,
  ClipboardList,
  Gift,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  WalletCards,
  Camera,
  FileText,
  Sparkles,
  Plus,
  Minus,
  Grid,
  List,
  CheckCircle2
} from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import useToastStore from '../../store/useToastStore';
import { formatRupiah, formatWaktu } from '../../utils/formatters';
import { getBusinessDate, isSameBusinessDate } from '../../utils/businessDate';
import { getPromotionPrice, getPromotionStatus, isProductInPromotion } from '../../utils/promotions';
import { postSalesNoteScan } from '../../services/apiClient';
import { inputDateToIso, productPrice, fuzzyMatchProduct } from '../../utils/salesParser';
import SalesOcrModal from '../../components/owner/SalesOcrModal';
import SalesCopasModal from '../../components/owner/SalesCopasModal';

const paymentFields = [
  { id: 'cash', label: 'Cash / Tunai', icon: Banknote },
  { id: 'qris', label: 'QRIS', icon: QrCode },
  { id: 'transfer', label: 'Transfer', icon: WalletCards },
  { id: 'debt', label: 'Bon / Piutang', icon: FileText },
];

export default function OwnerLiveSales() {
  const products = useAppStore((state) => state.products);
  const promotions = useAppStore((state) => state.promotions);
  const sales = useAppStore((state) => state.sales);
  const cashSessions = useAppStore((state) => state.cashSessions);
  const recordSale = useAppStore((state) => state.recordSale);
  const loadRemoteData = useAppStore((state) => state.loadRemoteData);
  const { user } = useAuthStore();
  const toast = useToastStore((state) => state.addToast);

  // Core form states
  const [selectedDate, setSelectedDate] = useState(getBusinessDate());
  const [quantities, setQuantities] = useState({});
  const [promoInputs, setPromoInputs] = useState({});
  const [payments, setPayments] = useState({ cash: '', qris: '', transfer: '', debt: '' });
  const [customerName, setCustomerName] = useState('');
  const [remainingMethod, setRemainingMethod] = useState('qris');
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Workflow enhancement states
  const [inputMode, setInputMode] = useState('grid'); // 'table' | 'grid'
  const [gridCategory, setGridCategory] = useState('Semua');

  // AI OCR States
  const fileInputRef = useRef(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrImage, setOcrImage] = useState('');
  const [ocrItems, setOcrItems] = useState([]);
  const [ocrError, setOcrError] = useState('');

  // WhatsApp Copas States
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [rawTextToParse, setRawTextToParse] = useState('');

  // Cleanup object URL on unmount or ocrImage change
  useEffect(() => {
    return () => {
      if (ocrImage) {
        URL.revokeObjectURL(ocrImage);
      }
    };
  }, [ocrImage]);

  const activeProducts = useMemo(() => (
    (products || []).filter((product) => product.active !== false)
  ), [products]);

  const categories = useMemo(() => {
    const list = new Set(activeProducts.map(p => p.category || 'Menu'));
    return ['Semua', ...Array.from(list)];
  }, [activeProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = activeProducts;

    if (inputMode === 'grid' && gridCategory !== 'Semua') {
      result = result.filter(p => (p.category || 'Menu') === gridCategory);
    }

    if (query) {
      result = result.filter((product) => (
        String(product.name || '').toLowerCase().includes(query)
        || String(product.category || '').toLowerCase().includes(query)
      ));
    }
    return result;
  }, [activeProducts, search, inputMode, gridCategory]);

  const activeBundlePromotions = useMemo(() => (
    (promotions || []).filter((promotion) => (
      promotion.type === 'bundle'
      && getPromotionStatus(promotion, selectedDate) === 'active'
      && Number(promotion.bundleQty || 0) >= 2
      && Number(promotion.bundlePrice || 0) > 0
    ))
  ), [promotions, selectedDate]);

  const getProductPromotions = (productId) => (
    activeBundlePromotions.filter((promotion) => isProductInPromotion(productId, promotion))
  );

  const selectedItems = useMemo(() => (
    activeProducts.flatMap((product) => {
      const normalQty = Number(quantities[product.id] || 0);
      const normalPrice = productPrice(product);
      const rows = [];
      if (normalQty > 0) {
        rows.push({
          productId: product.id,
          name: product.name,
          qty: normalQty,
          price: normalPrice,
          subtotal: normalQty * normalPrice,
          normalPrice,
          discountAmount: 0,
        });
      }

      const promoInput = promoInputs[product.id] || {};
      const promotion = activeBundlePromotions.find((candidate) => String(candidate.id) === String(promoInput.promoId));
      const bundleCount = Number(promoInput.bundleCount || 0);
      if (promotion && bundleCount > 0) {
        const pricing = getPromotionPrice(product, promotion);
        const bundleQty = Number(promotion.bundleQty || 0);
        const bundlePrice = Number(promotion.bundlePrice || 0);
        rows.push({
          productId: product.id,
          name: `${product.name} - ${promotion.name}`,
          qty: bundleCount * bundleQty,
          price: pricing.promoPrice,
          subtotal: bundleCount * bundlePrice,
          normalPrice: pricing.normalPrice,
          discountAmount: pricing.discountAmount,
          promoId: promotion.id,
          promoName: promotion.name,
          bundleQty,
          bundlePrice,
          bundleCount,
        });
      }
      return rows;
    })
  ), [activeBundlePromotions, activeProducts, promoInputs, quantities]);

  const totalSales = selectedItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const totalCup = selectedItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  
  const calculatedRemaining = useMemo(() => {
    const sumOtherMethods = paymentFields
      .filter(f => f.id !== remainingMethod)
      .reduce((sum, f) => sum + Number(payments[f.id] || 0), 0);
    return Math.max(0, totalSales - sumOtherMethods);
  }, [payments, remainingMethod, totalSales]);

  const totalPaid = useMemo(() => {
    return paymentFields.reduce((sum, f) => {
      const val = f.id === remainingMethod ? calculatedRemaining : Number(payments[f.id] || 0);
      return sum + val;
    }, 0);
  }, [payments, remainingMethod, calculatedRemaining]);

  const difference = totalPaid - totalSales;
  const daySales = useMemo(() => (
    (sales || []).filter((sale) => isSameBusinessDate(sale.date, selectedDate))
  ), [sales, selectedDate]);
  const cashSession = (cashSessions || []).find((session) => session.date === selectedDate);
  const isClosed = cashSession?.status === 'closed';

  const updateQty = (productId, value) => {
    const numericValue = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
    setQuantities((current) => ({
      ...current,
      [productId]: numericValue,
    }));
  };

  const adjustQty = (productId, delta) => {
    setQuantities((current) => {
      const currentVal = Number(current[productId] || 0);
      const newVal = Math.max(0, currentVal + delta);
      return {
        ...current,
        [productId]: newVal === 0 ? '' : newVal,
      };
    });
  };

  const updatePromoInput = (productId, patch) => {
    setPromoInputs((current) => ({
      ...current,
      [productId]: {
        ...(current[productId] || {}),
        ...patch,
      },
    }));
  };

  const clearForm = () => {
    setQuantities({});
    setPromoInputs({});
    setPayments({ cash: '', qris: '', transfer: '', debt: '' });
    setCustomerName('');
    setSearch('');
  };

  const handleSubmit = async () => {
    if (isClosed) {
      toast('Kas tanggal ini sudah ditutup. Rekap penjualan tidak bisa ditambah.', 'error');
      return;
    }
    if (!selectedItems.length) {
      toast('Isi minimal satu menu yang terjual.', 'error');
      return;
    }
    if (totalSales <= 0) {
      toast('Total penjualan harus lebih dari Rp 0.', 'error');
      return;
    }
    if (Math.round(totalPaid) !== Math.round(totalSales)) {
      toast('Total pembayaran (Cash, QRIS, Transfer, Bon) harus sama dengan total penjualan.', 'error');
      return;
    }

    const finalPayments = {
      cash: Number(remainingMethod === 'cash' ? calculatedRemaining : (payments.cash || 0)),
      qris: Number(remainingMethod === 'qris' ? calculatedRemaining : (payments.qris || 0)),
      transfer: Number(remainingMethod === 'transfer' ? calculatedRemaining : (payments.transfer || 0)),
      debt: Number(remainingMethod === 'debt' ? calculatedRemaining : (payments.debt || 0)),
    };

    if (finalPayments.debt > 0 && !customerName.trim()) {
      toast('Nama pelanggan wajib diisi jika ada pembayaran Bon / Piutang.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await recordSale({
        entrySource: 'owner_closing',
        date: inputDateToIso(selectedDate),
        user: user?.name || 'Owner',
        items: selectedItems,
        total: totalSales,
        paymentBreakdown: finalPayments,
        customerName: finalPayments.debt > 0 ? customerName.trim() : undefined,
      });
      toast('Rekap penjualan closing berhasil disimpan', 'success');
      clearForm();
    } catch (error) {
      toast(error.response?.data?.error || 'Rekap penjualan belum tersimpan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Workflow 1: AI OCR Photo Scanner Simulation
  const handleOcrUploadClick = () => {
    if (isClosed) {
      toast('Kas tanggal ini sudah ditutup. Tidak bisa menambah data.', 'error');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be uploaded again
    event.target.value = '';

    // Create preview URL
    if (ocrImage) URL.revokeObjectURL(ocrImage);
    const previewUrl = URL.createObjectURL(file);
    setOcrImage(previewUrl);
    setOcrItems([]);
    setOcrError('');
    setIsOcrLoading(true);
    setIsOcrModalOpen(true);

    try {
      const result = await postSalesNoteScan(file);
      const processed = (result.items || []).map(item => {
        if (!item.matchedProductId) {
          const autoMatch = fuzzyMatchProduct(item.rawText, activeProducts);
          return { ...item, matchedProductId: autoMatch };
        }
        return item;
      });

      setOcrItems(processed);
      if (result.requiresManualReview || processed.length === 0) {
        const message = result.providerError || 'AI belum menemukan baris menu. Isi rekap manual atau coba foto yang lebih jelas.';
        setOcrError(message);
        toast(message, 'error');
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Gagal memproses gambar catatan closing.';
      setOcrError(message);
      toast(message, 'error');
    } finally {
      setIsOcrLoading(false);
    }
  };

  const updateOcrItem = (itemId, patch) => {
    setOcrItems(current => current.map(item => (
      item.id === itemId ? { ...item, ...patch } : item
    )));
  };

  const removeOcrItem = (itemId) => {
    setOcrItems(current => current.filter(item => item.id !== itemId));
  };

  const applyOcrToForm = () => {
    const newQuantities = { ...quantities };
    let appliedCount = 0;

    ocrItems.forEach(item => {
      if (item.matchedProductId) {
        newQuantities[item.matchedProductId] = (newQuantities[item.matchedProductId] || 0) + Number(item.qty || 0);
        appliedCount++;
      }
    });

    setQuantities(newQuantities);
    setIsOcrModalOpen(false);
    toast(`Berhasil memasukkan ${appliedCount} jenis menu dari hasil scan ke form.`, 'success');
  };

  // Workflow 2: WhatsApp Text Parser
  const handleParseText = () => {
    if (!rawTextToParse.trim()) {
      toast('Teks rekap masih kosong.', 'error');
      return;
    }

    const lines = rawTextToParse.split('\n');
    const newQuantities = { ...quantities };
    let parsedCount = 0;

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      // Extract number and name
      let name;
      let qty;

      const numFirstMatch = cleanLine.match(/^(\d+)\s*(?:x|\*|-|:|)\s*(.+)$/i);
      const nameFirstMatch = cleanLine.match(/^(.+?)\s*(?:x|\*|-|:|)\s*(\d+)$/i);

      if (numFirstMatch) {
        qty = parseInt(numFirstMatch[1], 10);
        name = numFirstMatch[2].trim();
      } else if (nameFirstMatch) {
        name = nameFirstMatch[1].trim();
        qty = parseInt(nameFirstMatch[2], 10);
      } else {
        name = cleanLine;
        qty = 1;
      }

      const matchedId = fuzzyMatchProduct(name, activeProducts);
      if (matchedId) {
        newQuantities[matchedId] = (newQuantities[matchedId] || 0) + qty;
        parsedCount++;
      }
    });

    if (parsedCount > 0) {
      setQuantities(newQuantities);
      setIsTextModalOpen(false);
      setRawTextToParse('');
      toast(`Berhasil mem-parse ${parsedCount} baris menu dari teks.`, 'success');
    } else {
      toast('Tidak ada menu terdaftar yang cocok dalam teks tersebut. Cek ejaan menu Anda.', 'warning');
    }
  };

  return (
    <PageWrapper title="Rekap Penjualan" subtitle="Input penjualan dari buku closing harian dengan opsi cepat & AI">
      
      {/* Hidden file input for AI OCR Scanner */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Toolbar / Actions Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-[var(--color-border)]">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">Tanggal Bisnis</p>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-1 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 font-mono text-sm font-bold focus:border-[var(--color-band-1)] focus:outline-none"
            />
          </div>
          
          <button
            type="button"
            onClick={loadRemoteData}
            className="mt-4 btn btn-secondary h-10 px-3 text-xs flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Speedup Input Options Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
          <button
            type="button"
            onClick={handleOcrUploadClick}
            disabled={isClosed}
            className="btn h-10 px-4 text-xs font-bold text-white bg-gradient-to-r from-band-1 to-coffee-light hover:opacity-90 transition-all flex items-center gap-2 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Camera size={15} />
            <Sparkles size={13} className="animate-pulse text-yellow-200" />
            Scan Foto Catatan (AI)
          </button>

          <button
            type="button"
            onClick={() => setIsTextModalOpen(true)}
            disabled={isClosed}
            className="btn h-10 px-4 text-xs font-bold text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border)] transition-all flex items-center gap-2 rounded-xl border border-[var(--color-border)] cursor-pointer disabled:opacity-50"
          >
            <FileText size={15} />
            Copas WhatsApp
          </button>

          <div className="flex items-center gap-1 bg-[var(--color-bg-secondary)] p-1 rounded-xl border border-[var(--color-border)] ml-2">
            <button
              type="button"
              onClick={() => setInputMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${inputMode === 'grid' ? 'bg-white shadow-sm text-[var(--color-band-1)]' : 'text-[var(--color-text-muted)]'}`}
              title="Tampilan Grid POS"
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setInputMode('table')}
              className={`p-1.5 rounded-lg transition-all ${inputMode === 'table' ? 'bg-white shadow-sm text-[var(--color-band-1)]' : 'text-[var(--color-text-muted)]'}`}
              title="Tampilan Tabel List"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {isClosed && (
        <div className="mb-6 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-xs font-semibold text-danger-text flex items-center gap-2">
          <span>⚠️</span>
          <span>Kas tanggal {selectedDate} sudah ditutup. Perekaman data closing terkunci.</span>
        </div>
      )}

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        
        {/* Main Input Panel */}
        <section className="glass-card p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm font-black text-[var(--color-text-primary)]">
              {inputMode === 'grid' ? 'Input Cepat Grid POS' : 'Daftar Menu Tabel'}
            </h2>
            <div className="relative w-full max-w-xs">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama menu..."
                className="form-input h-9 pl-8 pr-3 text-xs font-semibold"
              />
            </div>
          </div>

          {/* POS Grid Input Mode */}
          {inputMode === 'grid' && (
            <div>
              {/* Category tabs */}
              <div className="mb-4 flex flex-wrap gap-1.5 border-b border-[var(--color-border)] pb-2 overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setGridCategory(cat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black transition-all ${gridCategory === cat ? 'bg-[var(--color-band-1)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid cards */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                {filteredProducts.map((product) => {
                  const qty = Number(quantities[product.id] || 0);
                  const price = productPrice(product);
                  const productPromotions = getProductPromotions(product.id);
                  const promoInput = promoInputs[product.id] || {};
                  
                  return (
                    <div
                      key={product.id}
                      className={`relative flex flex-col justify-between rounded-2xl border p-4 bg-white shadow-sm transition-all ${qty > 0 ? 'border-[var(--color-band-1)] ring-1 ring-[var(--color-band-1)] bg-success-pale' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'}`}
                    >
                      <div className="mb-2">
                        <div className="flex items-start justify-between">
                          <span className="text-xl">{product.emoji || '☕'}</span>
                          {qty > 0 && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-band-1)] text-[10px] font-black text-white animate-bounce">
                              {qty}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-xs font-black text-[var(--color-text-primary)] line-clamp-2 min-h-[32px]">{product.name}</h3>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)]">{formatRupiah(price)}</p>
                      </div>

                      <div className="mt-2 space-y-2">
                        {/* Rapid Increment Buttons */}
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => adjustQty(product.id, -1)}
                            disabled={isClosed || qty === 0}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-gray-500 transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-30 cursor-pointer"
                          >
                            <Minus size={13} />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => adjustQty(product.id, 1)}
                            disabled={isClosed}
                            className="flex h-9 flex-1 items-center justify-center gap-0.5 rounded-lg bg-[var(--color-band-4)] text-[var(--color-band-1)] font-extrabold text-xs transition-all hover:bg-[var(--color-accent-light)] active:scale-95 cursor-pointer"
                          >
                            <Plus size={10} />1
                          </button>

                          <button
                            type="button"
                            onClick={() => adjustQty(product.id, 2)}
                            disabled={isClosed}
                            className="flex h-9 flex-1 items-center justify-center gap-0.5 rounded-lg bg-[var(--color-band-4)] text-[var(--color-band-1)] font-extrabold text-xs transition-all hover:bg-[var(--color-accent-light)] active:scale-95 cursor-pointer"
                          >
                            <Plus size={10} />2
                          </button>

                          <button
                            type="button"
                            onClick={() => adjustQty(product.id, 5)}
                            disabled={isClosed}
                            className="flex h-9 flex-1 items-center justify-center gap-0.5 rounded-lg bg-[var(--color-band-1)] text-white font-extrabold text-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                          >
                            <Plus size={10} />5
                          </button>
                        </div>

                        {/* Auto Promo Detection Grid UI */}
                        {(() => {
                          const selectedPromo = productPromotions.find((p) => String(p.id) === String(promoInput.promoId));
                          const hasActivePromo = selectedPromo && Number(promoInput.bundleCount || 0) > 0;
                          
                          if (hasActivePromo) {
                            return (
                              <div className="mt-2 pt-2 border-t border-dashed border-[var(--color-border)] flex items-center justify-between gap-1">
                                <span className="text-[10px] font-black text-success-text truncate">
                                  🎁 {promoInput.bundleCount}x {selectedPromo.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const bundleQty = Number(selectedPromo.bundleQty || 0);
                                    const bundleCount = Number(promoInput.bundleCount || 0);
                                    const currentNormalQty = Number(quantities[product.id] || 0);
                                    const totalQty = currentNormalQty + (bundleCount * bundleQty);
                                    
                                    setQuantities((prev) => ({ ...prev, [product.id]: totalQty }));
                                    updatePromoInput(product.id, { promoId: '', bundleCount: '' });
                                  }}
                                  className="text-[9px] font-bold text-[var(--color-accent-red)] hover:underline cursor-pointer bg-transparent border-0 px-1 py-0.5"
                                >
                                  Batal
                                </button>
                              </div>
                            );
                          }
                          
                          const offerPromo = productPromotions.find(
                            (p) => qty >= Number(p.bundleQty || 0) && Number(p.bundleQty || 0) > 0
                          );
                          
                          if (offerPromo) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  const bundleQty = Number(offerPromo.bundleQty || 0);
                                  const bundleCount = Math.floor(qty / bundleQty);
                                  const remainingQty = qty % bundleQty;
                                  
                                  updatePromoInput(product.id, { 
                                    promoId: offerPromo.id, 
                                    bundleCount: String((Number(promoInput.bundleCount || 0) + bundleCount)) 
                                  });
                                  setQuantities((prev) => ({ ...prev, [product.id]: remainingQty }));
                                }}
                                className="w-full mt-2 py-1.5 px-2 bg-success-bg border border-success-border text-success-text rounded-xl text-[10px] font-black hover:bg-success-bg/85 cursor-pointer text-center animate-pulse"
                              >
                                🎁 Jadikan Paket {offerPromo.name}?
                              </button>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-8 text-center text-xs font-bold text-[var(--color-text-muted)]">
                    Menu belum tersedia atau tidak cocok dengan pencarian.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Table Input Mode */}
          {inputMode === 'table' && (
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
              <table className="data-table min-w-[720px]">
                <thead>
                  <tr>
                    <th>Menu</th>
                    <th className="w-28 text-right">Harga</th>
                    <th className="w-28 text-center">Terjual</th>
                    <th className="w-56">Promo Paket</th>
                    <th className="w-32 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const qty = Number(quantities[product.id] || 0);
                    const price = productPrice(product);
                    const productPromotions = getProductPromotions(product.id);
                    const promoInput = promoInputs[product.id] || {};
                    const selectedPromo = productPromotions.find((promotion) => String(promotion.id) === String(promoInput.promoId));
                    const bundleCount = Number(promoInput.bundleCount || 0);
                    const promoSubtotal = selectedPromo ? bundleCount * Number(selectedPromo.bundlePrice || 0) : 0;
                    return (
                      <tr key={product.id}>
                        <td>
                          <p className="font-black text-[var(--color-text-primary)]">{product.name}</p>
                          <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">{product.category || 'Menu'}</p>
                        </td>
                        <td className="text-right font-mono font-bold">{formatRupiah(price)}</td>
                        <td>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => adjustQty(product.id, -1)}
                              disabled={isClosed || qty === 0}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-gray-500 hover:bg-gray-50 active:scale-95 disabled:opacity-30 cursor-pointer"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min="0"
                              inputMode="numeric"
                              value={quantities[product.id] || ''}
                              onChange={(event) => updateQty(product.id, event.target.value)}
                              disabled={isClosed}
                              className="w-16 rounded-lg border border-[var(--color-border)] bg-white py-1 text-center font-mono text-sm font-black focus:border-[var(--color-band-1)] focus:outline-none disabled:bg-gray-50"
                              placeholder="0"
                            />
                            <button
                              type="button"
                              onClick={() => adjustQty(product.id, 1)}
                              disabled={isClosed}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-gray-500 hover:bg-gray-50 active:scale-95 cursor-pointer"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td>
                          {(() => {
                            const hasActivePromo = selectedPromo && Number(promoInput.bundleCount || 0) > 0;
                            
                            if (hasActivePromo) {
                              return (
                                <div className="flex items-center justify-between gap-1 p-2 bg-success-bg/40 border border-success-border rounded-xl">
                                  <span className="text-xs font-bold text-success-text truncate">
                                    🎁 {promoInput.bundleCount}x {selectedPromo.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const bundleQty = Number(selectedPromo.bundleQty || 0);
                                      const bundleCount = Number(promoInput.bundleCount || 0);
                                      const currentNormalQty = Number(quantities[product.id] || 0);
                                      const totalQty = currentNormalQty + (bundleCount * bundleQty);
                                      
                                      setQuantities((prev) => ({ ...prev, [product.id]: totalQty }));
                                      updatePromoInput(product.id, { promoId: '', bundleCount: '' });
                                    }}
                                    className="text-xs font-black text-danger-text hover:underline px-2 py-1 cursor-pointer bg-transparent border-0"
                                  >
                                    Batal
                                  </button>
                                </div>
                              );
                            }
                            
                            const offerPromo = productPromotions.find(
                              (p) => qty >= Number(p.bundleQty || 0) && Number(p.bundleQty || 0) > 0
                            );
                            
                            if (offerPromo) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const bundleQty = Number(offerPromo.bundleQty || 0);
                                    const bundleCount = Math.floor(qty / bundleQty);
                                    const remainingQty = qty % bundleQty;
                                    
                                    updatePromoInput(product.id, { 
                                      promoId: offerPromo.id, 
                                      bundleCount: String((Number(promoInput.bundleCount || 0) + bundleCount)) 
                                    });
                                    setQuantities((prev) => ({ ...prev, [product.id]: remainingQty }));
                                  }}
                                  className="w-full py-1.5 px-3 bg-success-bg border border-success-border text-success-text rounded-xl text-xs font-black hover:bg-success-bg/85 cursor-pointer text-center animate-pulse"
                                >
                                  🎁 Jadikan Paket {offerPromo.name}?
                                </button>
                              );
                            }
                            
                            return (
                              <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                                {productPromotions.length ? 'Tanpa promo aktif' : 'Tidak ada promo'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="text-right font-mono font-black text-[var(--color-band-1)]">
                          {formatRupiah(qty * price + promoSubtotal)}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs font-bold text-[var(--color-text-muted)]">
                        Menu belum tersedia atau tidak cocok dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Side Panel: Summary and Payment */}
        <aside className="space-y-4">
          <section className="glass-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList size={18} className="text-[var(--color-band-1)]" />
              <h3 className="text-sm font-black text-[var(--color-text-primary)]">Ringkasan Rekap</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[var(--color-band-4)] p-3">
                <p className="text-[10px] font-extrabold uppercase text-[var(--color-text-muted)]">Total Omzet</p>
                <p className="mt-1 font-mono text-lg font-black text-[var(--color-band-1)]">{formatRupiah(totalSales)}</p>
              </div>
              <div className="rounded-xl bg-brand-blue-bg p-3">
                <p className="text-[10px] font-extrabold uppercase text-brand-blue-light">Total Cup</p>
                <p className="mt-1 font-mono text-lg font-black text-brand-blue-text">{totalCup} cup</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-white p-3">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase text-[var(--color-text-secondary)]">
                <Gift size={14} />
                Promo Tercatat
              </div>
              <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)] text-pretty">
                {selectedItems.filter((item) => item.promoId).length
                  ? selectedItems.filter((item) => item.promoId).map((item) => `${item.promoName}: ${item.bundleCount} paket`).join(', ')
                  : 'Belum ada paket promo di rekap ini.'}
              </p>
            </div>

            {/* Auto Remaining Method Selector */}
            <div className="mt-4 p-3 rounded-2xl bg-cream-card border border-[var(--color-border)]">
              <span className="block text-[10px] font-black text-[var(--color-text-secondary)] uppercase mb-2">
                Metode Sisa Otomatis
              </span>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white border border-[var(--color-border)]">
                {[
                  { id: 'qris', label: '📱 QRIS' },
                  { id: 'cash', label: '💰 Cash' },
                  { id: 'transfer', label: '🏦 Transfer' },
                  { id: 'debt', label: '📝 Bon' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRemainingMethod(opt.id)}
                    className={`py-1.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                      remainingMethod === opt.id
                        ? 'bg-[var(--color-band-1)] text-white shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[9px] text-[var(--color-text-muted)] font-semibold leading-relaxed">
                Ketik pembayaran lain, sisanya otomatis dimasukkan ke metode terpilih di atas.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {paymentFields.map(({ id, label, icon: Icon }) => {
                const isAuto = remainingMethod === id;
                return (
                  <label key={id} className="block">
                    <span className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1.5">
                        <Icon size={14} />
                        {label}
                      </span>
                      {isAuto && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-success-bg text-success-text font-black border border-success-border">
                          Sisa Otomatis
                        </span>
                      )}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={isAuto ? String(calculatedRemaining) : payments[id]}
                      onChange={(event) => {
                        if (isAuto) return;
                        setPayments((current) => ({ ...current, [id]: event.target.value }));
                      }}
                      disabled={isClosed || isAuto}
                      className={`form-input font-mono text-sm ${
                        isAuto 
                          ? 'bg-success-pale border-success-border font-bold text-[var(--color-band-1)] focus:ring-0 cursor-not-allowed' 
                          : ''
                      }`}
                      placeholder="0"
                    />
                  </label>
                );
              })}

              {(remainingMethod === 'debt' ? calculatedRemaining > 0 : Number(payments.debt || 0) > 0) && (
                <div className="mt-4 space-y-1.5 animate-fadeIn">
                  <label htmlFor="customerName" className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">Nama Pelanggan (Bon)</label>
                  <input
                    type="text"
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ketik Nama Pelanggan..."
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:border-transparent text-sm font-semibold bg-white text-[var(--color-text-primary)] animate-fadeIn"
                    required
                  />
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-white p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-[var(--color-text-secondary)]">Total Pembayaran</span>
                <span className="font-mono font-black">{formatRupiah(totalPaid)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="font-semibold text-[var(--color-text-secondary)]">Selisih Input</span>
                <span className={`font-mono font-black ${difference === 0 ? 'text-[var(--color-band-1)]' : 'text-[var(--color-accent-red)]'}`}>
                  {difference > 0 ? '+' : ''}{formatRupiah(difference)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={clearForm}
                disabled={isSaving}
                className="btn btn-secondary w-full text-xs h-10 flex items-center justify-center cursor-pointer"
              >
                Reset Pilihan & Input
              </button>
            </div>
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || isClosed}
              className="btn btn-primary mt-3 w-full text-xs disabled:opacity-60 h-11 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Simpan Rekap Closing
            </button>
          </section>

          <section className="glass-card p-5">
            <h3 className="mb-3 text-sm font-black text-[var(--color-text-primary)]">Rekap Tersimpan Hari Ini</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {[...daySales].reverse().map((sale) => (
                <div key={sale.id} className="rounded-xl border border-[var(--color-border)] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-[var(--color-text-primary)]">
                        {sale.entrySource === 'owner_closing' ? 'Rekap closing owner' : 'Penjualan'}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-[var(--color-text-muted)]">{formatWaktu(sale.date)}</p>
                    </div>
                    <p className="font-mono text-sm font-black text-[var(--color-band-1)]">{formatRupiah(sale.total)}</p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                    {(sale.items || []).map((item) => `${item.name} ${item.qty}x${item.promoName ? ` promo ${item.promoName}` : ''}`).join(', ')}
                  </p>
                </div>
              ))}
              {daySales.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs font-bold text-[var(--color-text-muted)]">
                  Belum ada rekap untuk tanggal ini.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Sticky Mobile Cart Bar */}
      {totalSales > 0 && (
        <div className="fixed bottom-[88px] left-4 right-4 z-40 lg:hidden flex items-center justify-between bg-[var(--color-band-1)] text-white px-4 py-3 rounded-2xl shadow-lg border border-white/10 backdrop-blur-sm animate-fade-in-up">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/70 font-semibold uppercase">{totalCup} Cup Terpilih</span>
            <span className="text-sm font-bold font-mono">{formatRupiah(totalSales)}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const asideEl = document.querySelector('aside');
              if (asideEl) {
                asideEl.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="bg-white text-[var(--color-band-1)] px-4 py-2 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            Lanjut Bayar →
          </button>
        </div>
      )}

      <SalesOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => {
          setIsOcrModalOpen(false);
          if (ocrImage) URL.revokeObjectURL(ocrImage);
          setOcrImage('');
        }}
        isLoading={isOcrLoading}
        ocrImage={ocrImage}
        ocrItems={ocrItems}
        ocrError={ocrError}
        activeProducts={activeProducts}
        updateOcrItem={updateOcrItem}
        removeOcrItem={removeOcrItem}
        applyOcrToForm={applyOcrToForm}
      />

      <SalesCopasModal
        isOpen={isTextModalOpen}
        onClose={() => {
          setIsTextModalOpen(false);
          setRawTextToParse('');
        }}
        rawText={rawTextToParse}
        setRawText={setRawTextToParse}
        onParse={handleParseText}
      />
    </PageWrapper>
  );
}
