import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Banknote,
  CheckCircle2,
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
  Trash2,
  Grid,
  List,
  X
} from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import useToastStore from '../../store/useToastStore';
import { formatRupiah, formatWaktu } from '../../utils/formatters';
import { getBusinessDate, isSameBusinessDate } from '../../utils/businessDate';
import { getPromotionPrice, getPromotionStatus, isProductInPromotion } from '../../utils/promotions';
import { postSalesNoteScan } from '../../services/apiClient';

const paymentFields = [
  { id: 'cash', label: 'Cash / Tunai', icon: Banknote },
  { id: 'qris', label: 'QRIS', icon: QrCode },
  { id: 'transfer', label: 'Transfer', icon: WalletCards },
];

function inputDateToIso(date) {
  return date ? `${date}T12:00:00.000Z` : undefined;
}

function productPrice(product) {
  return Number(product?.sellingPrice ?? product?.price ?? 0);
}

// Nicknames mapping for intelligent fuzzy matching
const PRODUCT_NICKNAMES = {
  'ruang': 1,
  'rute': 1,
  'kopi susu': 1,
  'americano': 3,
  'ame': 3,
  'cokelat': 4,
  'chocolate': 4,
  'coklat': 4,
  'es kopi': 5,
  'thai tea': 6,
  'tea': 6,
  'thai': 6,
  'morpis': 1779031553821,
  'matcha': 2,
};

function fuzzyMatchProduct(text, productsList) {
  const query = String(text || '').toLowerCase().trim();
  if (!query) return '';

  // 1. Direct match with nicknames
  for (const [nickname, id] of Object.entries(PRODUCT_NICKNAMES)) {
    if (query.includes(nickname)) {
      const found = productsList.find(p => String(p.id) === String(id));
      if (found) return found.id;
    }
  }

  // 2. Exact name contains or matching
  const matches = productsList.map(product => {
    const name = String(product.name || '').toLowerCase();
    let score = 0;

    if (name === query) score = 100;
    else if (name.includes(query)) score = 80;
    else if (query.includes(name)) score = 60;

    // Word overlapping check
    const queryWords = query.split(/\s+/);
    const nameWords = name.split(/\s+/);
    const commonWords = queryWords.filter(w => nameWords.includes(w));
    score += commonWords.length * 20;

    return { id: product.id, score };
  });

  const sorted = matches.sort((a, b) => b.score - a.score);
  if (sorted[0] && sorted[0].score > 30) {
    return sorted[0].id;
  }

  return '';
}

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
  const [payments, setPayments] = useState({ cash: '', qris: '', transfer: '' });
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
  const totalPaid = paymentFields.reduce((sum, field) => sum + Number(payments[field.id] || 0), 0);
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

  const setPaymentToTotal = () => {
    setPayments({ cash: String(totalSales), qris: '0', transfer: '0' });
  };

  const clearForm = () => {
    setQuantities({});
    setPromoInputs({});
    setPayments({ cash: '', qris: '', transfer: '' });
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
      toast('Total cash, QRIS, dan transfer harus sama dengan total penjualan.', 'error');
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
        paymentBreakdown: {
          cash: Number(payments.cash || 0),
          qris: Number(payments.qris || 0),
          transfer: Number(payments.transfer || 0),
        },
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
            className="btn h-10 px-4 text-xs font-bold text-white bg-gradient-to-r from-[#4f684f] to-[#6f856a] hover:opacity-90 transition-all flex items-center gap-2 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
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
        <div className="mb-6 rounded-xl border border-[#f0c7ba] bg-[#fff4ef] px-4 py-3 text-xs font-semibold text-[#a34f39] flex items-center gap-2">
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
                      className={`relative flex flex-col justify-between rounded-2xl border p-4 bg-white shadow-sm transition-all ${qty > 0 ? 'border-[var(--color-band-1)] ring-1 ring-[var(--color-band-1)] bg-[#f7fbf7]' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'}`}
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

                        {/* Promo selection inside Grid Card */}
                        {productPromotions.length > 0 && (
                          <div className="pt-2 border-t border-dashed border-[var(--color-border)]">
                            <select
                              value={promoInput.promoId || ''}
                              onChange={(e) => updatePromoInput(product.id, { promoId: e.target.value, bundleCount: e.target.value ? (promoInput.bundleCount || '') : '' })}
                              disabled={isClosed}
                              className="form-select h-8 py-0 px-2 text-[10px] bg-white rounded-lg border-[var(--color-border)]"
                            >
                              <option value="">Promo Paket?</option>
                              {productPromotions.map((promo) => (
                                <option key={promo.id} value={promo.id}>
                                  {promo.name}
                                </option>
                              ))}
                            </select>

                            {promoInput.promoId && (
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  inputMode="numeric"
                                  value={promoInput.bundleCount || ''}
                                  onChange={(e) => updatePromoInput(product.id, { bundleCount: e.target.value })}
                                  disabled={isClosed}
                                  placeholder="0"
                                  className="w-12 h-7 rounded border border-[var(--color-border)] text-center font-mono text-xs font-bold"
                                />
                                <span className="text-[9px] text-[var(--color-text-muted)]">paket</span>
                              </div>
                            )}
                          </div>
                        )}
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
                          <div className="space-y-2">
                            <select
                              value={promoInput.promoId || ''}
                              onChange={(event) => updatePromoInput(product.id, { promoId: event.target.value, bundleCount: event.target.value ? (promoInput.bundleCount || '') : '' })}
                              disabled={isClosed || productPromotions.length === 0}
                              className="form-select h-10 py-1.5 text-xs"
                            >
                              <option value="">{productPromotions.length ? 'Tanpa promo' : 'Tidak ada promo aktif'}</option>
                              {productPromotions.map((promotion) => (
                                <option key={promotion.id} value={promotion.id}>
                                  {promotion.name} ({promotion.bundleQty} cup = {formatRupiah(promotion.bundlePrice)})
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={promoInput.bundleCount || ''}
                                onChange={(event) => updatePromoInput(product.id, { bundleCount: event.target.value })}
                                disabled={isClosed || !promoInput.promoId}
                                className="w-20 rounded-lg border border-[var(--color-border)] bg-white px-2 py-2 text-center font-mono text-sm font-black focus:border-[var(--color-band-1)] focus:outline-none disabled:bg-gray-50"
                                placeholder="0"
                                aria-label={`Jumlah paket promo ${product.name}`}
                              />
                              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
                                paket{selectedPromo ? ` x ${selectedPromo.bundleQty} cup` : ''}
                              </span>
                            </div>
                          </div>
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
              <div className="rounded-xl bg-[#eef3fe] p-3">
                <p className="text-[10px] font-extrabold uppercase text-[#5c7bb9]">Total Cup</p>
                <p className="mt-1 font-mono text-lg font-black text-[#2e4c85]">{totalCup} cup</p>
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

            <div className="mt-4 space-y-3">
              {paymentFields.map(({ id, label, icon: Icon }) => (
                <label key={id} className="block">
                  <span className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">
                    <Icon size={14} />
                    {label}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={payments[id]}
                    onChange={(event) => setPayments((current) => ({ ...current, [id]: event.target.value }))}
                    disabled={isClosed}
                    className="form-input font-mono text-sm"
                    placeholder="0"
                  />
                </label>
              ))}
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

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={setPaymentToTotal}
                disabled={isClosed || totalSales <= 0}
                className="btn btn-secondary flex-1 text-xs disabled:opacity-50 h-10 flex items-center justify-center cursor-pointer"
              >
                Semua Cash
              </button>
              <button
                type="button"
                onClick={clearForm}
                disabled={isSaving}
                className="btn btn-secondary flex-1 text-xs disabled:opacity-50 h-10 flex items-center justify-center cursor-pointer"
              >
                Reset
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

      {/* Workflow 1 Modal: Side-by-Side AI OCR Review */}
      {isOcrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4">
              <div className="flex items-center gap-2">
                <Camera className="text-[var(--color-band-1)]" size={20} />
                <Sparkles size={16} className="text-yellow-500 animate-pulse" />
                <h3 className="text-sm font-black text-[var(--color-text-primary)]">Verifikasi Hasil Scan Catatan (AI OCR)</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOcrModalOpen(false);
                  if (ocrImage) URL.revokeObjectURL(ocrImage);
                  setOcrImage('');
                }}
                className="rounded-lg p-1 text-[var(--color-text-secondary)] hover:bg-gray-200 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {isOcrLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={40} className="animate-spin text-[var(--color-band-1)] mb-4" />
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">AI sedang menganalisis foto catatan harian...</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Mengekstrak menu, kuantitas, dan nominal harga...</p>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  
                  {/* Left Column: Image View (Notebook) */}
                  <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-gray-50 overflow-hidden min-h-[300px] lg:min-h-0 lg:max-h-[60vh]">
                    <div className="bg-gray-200 px-4 py-2 text-[10px] font-black uppercase text-[var(--color-text-secondary)] tracking-wider">
                      Foto Buku Catatan Asli
                    </div>
                    <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
                      <img
                        src={ocrImage}
                        alt="Catatan closing"
                        className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Right Column: OCR Results Mapping */}
                  <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-white overflow-hidden lg:max-h-[60vh]">
                    <div className="bg-gray-50 px-4 py-2 text-[10px] font-black uppercase text-[var(--color-text-secondary)] tracking-wider flex justify-between items-center">
                      <span>Hasil Deteksi & Pencocokan Menu</span>
                      <span className="text-[9px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold font-mono">Verifikasi Manual</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      <p className="text-[11px] text-[var(--color-text-secondary)] font-semibold leading-relaxed">
                        Berikut adalah hasil pembacaan tulisan tangan dari foto. Periksa kembali dan pastikan setiap baris telah dipetakan ke menu yang sesuai di sistem sebelum menekan tombol <b>Terapkan</b>.
                      </p>
                      {ocrError && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-800">
                          {ocrError}
                        </div>
                      )}

                      <div className="space-y-2.5">
                        {ocrItems.map((item) => {
                          const isMatched = item.matchedProductId && activeProducts.some(p => String(p.id) === String(item.matchedProductId));
                          return (
                            <div
                              key={item.id}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${isMatched ? 'border-green-200 bg-green-50/20' : 'border-amber-200 bg-amber-50/20'}`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="mb-1.5 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black uppercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                                    "{item.rawText}"
                                  </span>
                                  {!isMatched && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                      Belum Dipetakan
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] whitespace-nowrap">Petakan ke:</span>
                                  <select
                                    value={item.matchedProductId ? String(item.matchedProductId) : ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const foundProd = activeProducts.find(p => String(p.id) === String(val));
                                      updateOcrItem(item.id, { matchedProductId: foundProd ? foundProd.id : '' });
                                    }}
                                    className="form-select h-8 py-0 px-2 text-xs bg-white border-[var(--color-border)] max-w-xs flex-1 rounded-lg"
                                  >
                                    <option value="">⚠️ Pilih Menu (Tidak cocok)...</option>
                                    {activeProducts.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.emoji || '☕'} {p.name} ({formatRupiah(productPrice(p))})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 justify-end">
                                <div className="flex items-center border border-[var(--color-border)] bg-white rounded-lg overflow-hidden h-8">
                                  <button
                                    type="button"
                                    onClick={() => updateOcrItem(item.id, { qty: Math.max(1, (item.qty || 1) - 1) })}
                                    className="px-2 h-full hover:bg-gray-50 border-r border-[var(--color-border)]"
                                  >
                                    <Minus size={11} />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={(e) => updateOcrItem(item.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                    className="w-10 text-center font-mono text-xs font-bold focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateOcrItem(item.id, { qty: (item.qty || 0) + 1 })}
                                    className="px-2 h-full hover:bg-gray-50 border-l border-[var(--color-border)]"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeOcrItem(item.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-all"
                                  title="Hapus baris ini"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* OCR Modal Footer Info */}
                    <div className="border-t border-[var(--color-border)] bg-gray-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs font-bold text-[var(--color-text-secondary)]">
                        Terdeteksi: <span className="font-mono text-sm font-black text-[var(--color-band-1)]">{ocrItems.length} baris</span>
                        <span className="mx-2 text-gray-300">|</span>
                        Terpetakan: <span className="font-mono text-sm font-black text-green-600">{ocrItems.filter(i => i.matchedProductId).length} menu</span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOcrModalOpen(false);
                            if (ocrImage) URL.revokeObjectURL(ocrImage);
                            setOcrImage('');
                          }}
                          className="btn btn-secondary flex-1 sm:flex-initial h-9 text-xs"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={applyOcrToForm}
                          disabled={ocrItems.filter(i => i.matchedProductId).length === 0}
                          className="btn btn-primary flex-1 sm:flex-initial h-9 text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} />
                          Terapkan & Review di Form
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workflow 2 Modal: WhatsApp Copas Text Parser */}
      {isTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-[var(--color-border)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="text-[var(--color-band-1)]" size={18} />
                <h3 className="text-sm font-black text-[var(--color-text-primary)]">Copas Rekap WhatsApp / Teks</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTextModalOpen(false)}
                className="rounded-lg p-1 text-[var(--color-text-secondary)] hover:bg-gray-200 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Tempelkan teks laporan closing yang dikirim oleh partner di chat. Sistem akan otomatis mendeteksi nama menu dan jumlahnya menggunakan pencocokan cerdas.
              </p>
              
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Teks Rekap Chat
                </label>
                <textarea
                  rows={6}
                  value={rawTextToParse}
                  onChange={(e) => setRawTextToParse(e.target.value)}
                  placeholder={`Contoh format:\nKopi Susu RUTE 5\nAmericano 2\nMatcha Latte 1\nKentang Goreng 3`}
                  className="form-input w-full p-3 font-mono text-xs resize-none"
                />
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[10px] text-amber-800 leading-relaxed font-semibold">
                💡 <b>Tips:</b> Anda bisa mengetik dengan format <code>[Jumlah] [Nama Menu]</code> atau <code>[Nama Menu] [Jumlah]</code>. Singkatan menu yang wajar akan tetap dikenali (misal: <i>"Ame"</i> akan dicocokkan dengan <i>Americano</i>).
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] bg-gray-50 px-6 py-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsTextModalOpen(false);
                  setRawTextToParse('');
                }}
                className="btn btn-secondary h-9 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleParseText}
                className="btn btn-primary h-9 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} />
                Proses & Isi Form
              </button>
            </div>
          </div>
        </div>
      )}

    </PageWrapper>
  );
}
