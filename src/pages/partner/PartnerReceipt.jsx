import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Camera, Check, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import useSettingsStore from '../../store/useSettingsStore';
import { scanReceiptImage } from '../../services/receiptService';
import { formatRupiah } from '../../utils/formatters';
import { EXPENSE_CATEGORIES } from '../../utils/constants';

function localDateInput(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
  }
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
}

function dateInputToIso(value) {
  if (!value) return new Date().toISOString();
  return new Date(value + 'T12:00:00').toISOString();
}

function blankItem() {
  const id = Date.now() + Math.random();
  return {
    id,
    name: '',
    category: 'bahan_baku',
    qty: 1,
    unit: 'pcs',
    price: 0,
    total: 0,
    addsStock: false,
    ingredientId: '',
    stockQty: 1,
    stockUnit: 'pcs',
  };
}

function normalizeItems(items = []) {
  return items.map((item, index) => ({
    id: item.id || index + 1,
    name: item.name || '',
    category: item.category || 'bahan_baku',
    qty: Number(item.qty || 1),
    unit: item.unit || 'pcs',
    price: Number(item.price || 0),
    total: Number(item.total || 0),
    addsStock: Boolean(item.addsStock),
    ingredientId: item.ingredientId || '',
    stockQty: Number(item.stockQty || item.qty || 1),
    stockUnit: item.stockUnit || item.unit || 'pcs',
  }));
}

function sourceLabel(receipt) {
  if (!receipt) return '';
  if (receipt.source === 'ai' && !receipt.requiresManualReview) return 'OpenAI Vision';
  if (receipt.source === 'ai') return 'OpenAI Vision, perlu koreksi';
  return 'Input manual';
}

function receiptErrorMessage(error) {
  const serverMessage = error.response?.data?.error || error.response?.data?.message;
  if (error.response?.status === 409) return 'Resi ini sudah pernah dikonfirmasi.';
  if (error.response?.status === 403) return 'Tanggal resi masuk periode kas yang sudah ditutup.';
  if (error.response?.status === 400) return serverMessage || 'Item atau mapping stok belum valid.';
  return serverMessage || 'Resi belum tersimpan. Periksa koneksi backend lalu coba lagi.';
}

export default function PartnerReceipt() {
  const [step, setStep] = useState('upload');
  const [items, setItems] = useState([]);
  const [imgPrev, setImgPrev] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [merchantName, setMerchantName] = useState('');
  const [transactionDate, setTransactionDate] = useState(localDateInput());
  const [cashAccountId, setCashAccountId] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [doneTimer, setDoneTimer] = useState(null);
  const navigate = useNavigate();

  const saveReceiptExpense = useAppStore((state) => state.saveReceiptExpense);
  const ingredients = useAppStore((state) => state.ingredients);
  const cashAccounts = useAppStore((state) => state.cashAccounts);
  const { user } = useAuthStore();
  const settings = useSettingsStore();

  const defaultCashAccount = cashAccounts.find((account) => (
    ['cash', 'tunai'].includes(String(account.type || '').toLowerCase())
  )) || cashAccounts[0];
  const selectedCashAccountId = cashAccountId || defaultCashAccount?.id || '';
  const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);

  useEffect(() => {
    return () => {
      if (imgPrev) {
        URL.revokeObjectURL(imgPrev);
      }
      if (doneTimer) {
        clearTimeout(doneTimer);
      }
    };
  }, [imgPrev, doneTimer]);

  const resetForm = () => {
    setStep('upload');
    setItems([]);
    setImgPrev(null);
    setReceipt(null);
    setMerchantName('');
    setTransactionDate(localDateInput());
    setCashAccountId('');
    setError('');
    if (doneTimer) {
      clearTimeout(doneTimer);
      setDoneTimer(null);
    }
  };

  const handleDoneReturn = () => {
    if (doneTimer) {
      clearTimeout(doneTimer);
    }
    resetForm();
    navigate('/partner/expenses');
  };

  const handleUlangFoto = () => {
    if (items.length > 0) {
      if (!window.confirm('Perubahan yang belum disimpan akan hilang. Ulang foto resi?')) {
        return;
      }
    }
    resetForm();
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    if (imgPrev) {
      URL.revokeObjectURL(imgPrev);
    }
    setImgPrev(URL.createObjectURL(file));
    setStep('scanning');
    try {
      const result = await scanReceiptImage(file);
      setReceipt(result);
      setItems(normalizeItems(result.items));
      setMerchantName(result.merchantName || '');
      setTransactionDate(localDateInput(result.transactionDate));
      setStep('preview');
    } catch (scanError) {
      console.warn('Gagal scan resi.', scanError);
      const message = scanError.response?.data?.error || 'Resi gagal diproses. Coba foto ulang atau pilih gambar lain.';
      setError(message);
      setStep('upload');
    }
    event.target.value = '';
  };

  const addItem = () => {
    setItems((current) => [...current, blankItem()]);
  };

  const removeItem = (id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;

      const next = { ...item, [field]: value };
      if (field === 'qty' || field === 'price') {
        next[field] = Number(value || 0);
      }
      if (field === 'addsStock') {
        next.addsStock = Boolean(value);
        if (next.addsStock && !next.stockQty) next.stockQty = next.qty || 1;
      }
      if (field === 'ingredientId') {
        const ingredient = ingredients.find((candidate) => String(candidate.id) === String(value));
        next.ingredientId = value;
        next.stockUnit = ingredient?.unit || next.stockUnit || next.unit || 'pcs';
      }
      if (field === 'stockQty') {
        next.stockQty = Number(value || 0);
      }

      const qty = Number(next.qty || 0);
      const price = Number(next.price || 0);
      next.total = qty * price;
      return next;
    }));
  };

  const validateItems = () => {
    if (!items.length) return 'Minimal satu item resi wajib diisi.';
    for (const [index, item] of items.entries()) {
      const row = index + 1;
      if (!String(item.name || '').trim()) return 'Nama item baris ' + row + ' wajib diisi.';
      if (Number(item.qty || 0) <= 0) return 'Qty item baris ' + row + ' wajib lebih dari 0.';
      if (Number(item.total || 0) <= 0) return 'Total item baris ' + row + ' wajib lebih dari 0.';
      if (item.addsStock && !item.ingredientId) return 'Mapping stok item baris ' + row + ' wajib dipilih.';
      if (item.addsStock && Number(item.stockQty || 0) <= 0) return 'Qty stok item baris ' + row + ' wajib lebih dari 0.';
    }
    if (cashAccounts.length && !selectedCashAccountId) return 'Sumber dana kas wajib dipilih.';
    return '';
  };

  const confirmedItems = () => items.map((item) => ({
    name: String(item.name || '').trim(),
    category: item.category || 'lainnya',
    qty: Number(item.qty || 0),
    unit: item.unit || 'pcs',
    price: Number(item.price || 0),
    total: Number(item.total || 0),
    addsStock: Boolean(item.addsStock),
    ingredientId: item.addsStock ? Number(item.ingredientId) : null,
    stockQty: item.addsStock ? Number(item.stockQty || 0) : 0,
    stockUnit: item.addsStock ? item.stockUnit || item.unit || 'pcs' : null,
  }));

  const onConfirm = async () => {
    const validationError = validateItems();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await saveReceiptExpense({
        receipt: {
          ...(receipt || {}),
          merchantName: merchantName.trim(),
          transactionDate: dateInputToIso(transactionDate),
          items: confirmedItems(),
        },
        imageUrl: receipt?.imageUrl || imgPrev,
        cashAccountId: selectedCashAccountId,
        user: user?.name || 'Partner',
      });
      setStep('done');
      const timer = setTimeout(() => {
        resetForm();
        navigate('/partner/expenses');
      }, 5000);
      setDoneTimer(timer);
    } catch (saveError) {
      console.warn('Gagal simpan resi.', saveError);
      setError(receiptErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageWrapper title="Upload Resi" subtitle="Foto resi diproses AI, lalu konfirmasi sebelum masuk data">
      {step === 'upload' && (
        <div className="flex flex-col gap-3 py-4">
          {error && (
            <div className="flex items-start gap-2 rounded border border-[var(--color-accent-red)] bg-red-50 p-3 text-xs text-[var(--color-accent-red)]">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 transition-colors hover:bg-[#F5F5F5]">
            <Camera size={24} className="text-[var(--color-text-secondary)]" />
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Ambil Foto</p>
            <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 transition-colors hover:bg-[#F5F5F5]">
            <ImagePlus size={18} className="text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium">Pilih Galeri</span>
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>
        </div>
      )}

      {step === 'scanning' && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 size={24} className="animate-spin text-[var(--color-text-primary)]" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Memproses OCR...</p>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4 fade-in">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Cek & Konfirmasi Resi</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Confidence {Math.round(Number(receipt?.confidence || 0) * 100)}% - {sourceLabel(receipt)}
              </p>
            </div>
            <button onClick={handleUlangFoto} className="text-[11px] font-bold text-[var(--color-band-2)] hover:underline">Ulang Foto</button>
          </div>

          {receipt?.requiresManualReview && (
            <div className="flex items-start gap-2 rounded border border-[#e6c56a] bg-[#fff8dc] p-3 text-xs text-[#806100]">
              <AlertCircle size={16} className="shrink-0" />
              <span>OCR butuh koreksi manual. Isi merchant dan item sebelum simpan.</span>
            </div>
          )}

          {imgPrev && (
            <div className="h-40 w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
              <img src={imgPrev} alt="Preview resi" className="h-full w-full object-contain" />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">
              Merchant
              <input
                type="text"
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
                placeholder="Nama supplier/toko"
                className="mt-1 w-full rounded border border-[var(--color-coffee-latte)] px-3 py-2 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">
              Tanggal Resi
              <input
                type="date"
                value={transactionDate}
                onChange={(event) => setTransactionDate(event.target.value)}
                className="mt-1 w-full rounded border border-[var(--color-coffee-latte)] px-3 py-2 text-sm font-normal"
              />
            </label>
          </div>

          <div className="glass-card overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-[var(--color-coffee-latte)] bg-[#faf6ef] p-3">
              <span className="text-xs font-bold uppercase text-[var(--color-text-secondary)]">Item Resi</span>
              <button type="button" onClick={addItem} className="btn btn-secondary px-3 py-1 text-xs">
                <Plus size={14} /> Tambah Item
              </button>
            </div>
            {items.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">
                Belum ada item terbaca. Tambahkan item manual dari resi.
              </div>
            ) : (
              <div>
                {/* Desktop Layout - Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="data-table">
                    <thead className="bg-[#faf6ef] dark:bg-[#221c19]">
                      <tr>
                        <th className="min-w-36">Item</th>
                        <th className="w-20 text-center">Jml</th>
                        <th className="w-28 text-right">Harga</th>
                        <th className="w-32">Kategori</th>
                        <th className="min-w-44">Gudang Bahan</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/30 dark:hover:bg-white/5">
                          <td className="align-top py-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(event) => updateItem(item.id, 'name', event.target.value)}
                              className="w-full border-b border-transparent bg-transparent p-1 text-xs outline-none hover:border-[var(--color-coffee-latte)] focus:border-[var(--color-band-2)] text-[var(--color-text-primary)]"
                              placeholder="Nama item"
                            />
                          </td>
                          <td className="align-top py-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={item.qty}
                                onChange={(event) => updateItem(item.id, 'qty', event.target.value)}
                                className="w-12 rounded border border-[var(--color-coffee-latte)] px-1 py-1 text-center font-mono text-xs bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                              />
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(event) => updateItem(item.id, 'unit', event.target.value)}
                                className="w-10 rounded border border-[var(--color-coffee-latte)] px-1 py-1 text-xs bg-[var(--color-bg-primary)] text-center text-[var(--color-text-primary)]"
                                placeholder="pcs"
                              />
                            </div>
                          </td>
                          <td className="align-top py-3">
                            <input
                              type="number"
                              min="0"
                              value={item.price}
                              onChange={(event) => updateItem(item.id, 'price', event.target.value)}
                              className="w-full rounded border border-[var(--color-coffee-latte)] px-1 py-1 text-right font-mono text-xs bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                            />
                          </td>
                          <td className="align-top py-3">
                            <select
                              className="form-select p-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-coffee-latte)] text-[var(--color-text-primary)]"
                              value={item.category}
                              onChange={(event) => updateItem(item.id, 'category', event.target.value)}
                            >
                              {EXPENSE_CATEGORIES.filter(cat => !cat.ownerOnly || user?.role === 'owner').map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="align-top py-3">
                            <div className="space-y-1 text-xs">
                              <label className="flex items-center gap-1.5 font-medium cursor-pointer text-[var(--color-text-secondary)]">
                                <input
                                  type="checkbox"
                                  checked={item.addsStock}
                                  onChange={(e) => updateItem(item.id, 'addsStock', e.target.checked)}
                                  className="rounded text-[var(--color-accent-primary)] focus:ring-0 w-3.5 h-3.5"
                                />
                                <span>Masuk Stok Gudang</span>
                              </label>
                              
                              {item.addsStock && (
                                <div className="space-y-1 fade-in">
                                  <select
                                    required
                                    className="form-select p-1 text-xs w-full bg-[var(--color-bg-primary)] border border-[var(--color-coffee-latte)] text-[var(--color-text-primary)]"
                                    value={item.ingredientId}
                                    onChange={(event) => updateItem(item.id, 'ingredientId', event.target.value)}
                                  >
                                    <option value="">-- Pilih Bahan Baku --</option>
                                    {ingredients.map(ing => (
                                      <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                    ))}
                                  </select>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">Qty masuk:</span>
                                    <input
                                      type="number"
                                      min="0.001"
                                      step="any"
                                      value={item.stockQty}
                                      onChange={(event) => updateItem(item.id, 'stockQty', event.target.value)}
                                      className="w-14 rounded border border-[var(--color-coffee-latte)] px-1 py-0.5 text-center font-mono text-[10px] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                                    />
                                    <span className="text-[10px] font-bold text-[var(--color-text-secondary)]">{item.stockUnit}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="align-top py-3 text-right">
                            <button type="button" onClick={() => removeItem(item.id)} className="rounded p-1 text-[var(--color-accent-red)] hover:bg-red-50 transition-colors" title="Hapus item">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Layout - Card Stack */}
                <div className="md:hidden divide-y divide-[var(--color-border)]">
                  {items.map((item, index) => (
                    <div key={item.id} className="py-4 bg-[var(--color-bg-card)] space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-[var(--color-text-secondary)]">Item #{index + 1}</span>
                        <button type="button" onClick={() => removeItem(item.id)} className="rounded-lg p-1.5 text-[var(--color-accent-red)] hover:bg-red-55" title="Hapus item">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Item Name */}
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nama Item</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(event) => updateItem(item.id, 'name', event.target.value)}
                          className="w-full rounded border border-[var(--color-coffee-latte)] px-3 py-2 text-xs bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:border-[var(--color-band-2)] focus:outline-none"
                          placeholder="Contoh: Susu UHT Diamond"
                        />
                      </div>

                      {/* Qty & Price row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Qty</label>
                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(event) => updateItem(item.id, 'qty', event.target.value)}
                            className="w-full rounded border border-[var(--color-coffee-latte)] px-2 py-2 font-mono text-xs bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-center focus:border-[var(--color-band-2)] focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Satuan</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(event) => updateItem(item.id, 'unit', event.target.value)}
                            className="w-full rounded border border-[var(--color-coffee-latte)] px-2 py-2 text-xs bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-center focus:border-[var(--color-band-2)] focus:outline-none"
                            placeholder="pcs"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Harga Satuan</label>
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(event) => updateItem(item.id, 'price', event.target.value)}
                            className="w-full rounded border border-[var(--color-coffee-latte)] px-2 py-2 font-mono text-xs bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-right focus:border-[var(--color-band-2)] focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Category & Subtotal row */}
                      <div className="grid grid-cols-2 gap-3 items-end">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Kategori</label>
                          <select
                            className="form-select p-2 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-coffee-latte)] text-[var(--color-text-primary)] w-full font-normal"
                            value={item.category}
                            onChange={(event) => updateItem(item.id, 'category', event.target.value)}
                          >
                            {EXPENSE_CATEGORIES.filter(cat => !cat.ownerOnly || user?.role === 'owner').map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="p-2 bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] text-right">
                          <span className="text-[9px] text-[var(--color-text-muted)] block font-semibold">SUBTOTAL</span>
                          <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">{formatRupiah(item.total)}</span>
                        </div>
                      </div>

                      {/* Stock Integration for Mobile */}
                      <div className="p-3 bg-[var(--color-bg-secondary)]/50 rounded-xl border border-[var(--color-border)] space-y-2.5">
                        <label className="flex items-center gap-2 font-semibold text-xs cursor-pointer text-[var(--color-text-secondary)]">
                          <input
                            type="checkbox"
                            checked={item.addsStock}
                            onChange={(e) => updateItem(item.id, 'addsStock', e.target.checked)}
                            className="rounded text-[var(--color-accent-primary)] focus:ring-0 w-4 h-4"
                          />
                          <span>Masuk ke Stok Gudang</span>
                        </label>

                        {item.addsStock && (
                          <div className="space-y-2 fade-in text-[var(--color-text-primary)]">
                            <div>
                              <label className="block text-[9px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Hubungkan ke Bahan Baku</label>
                              <select
                                required
                                className="form-select p-2 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-coffee-latte)] text-[var(--color-text-primary)] w-full font-normal"
                                value={item.ingredientId}
                                onChange={(event) => updateItem(item.id, 'ingredientId', event.target.value)}
                              >
                                <option value="">-- Pilih Bahan Baku --</option>
                                {ingredients.map(ing => (
                                  <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1/2">
                                <label className="block text-[9px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Qty Stok</label>
                                <input
                                  type="number"
                                  min="0.001"
                                  step="any"
                                  value={item.stockQty}
                                  onChange={(event) => updateItem(item.id, 'stockQty', event.target.value)}
                                  className="w-full rounded border border-[var(--color-coffee-latte)] px-2 py-1.5 text-center font-mono text-xs bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none"
                                />
                              </div>
                              <div className="w-1/2">
                                <label className="block text-[9px] font-bold text-[var(--color-text-muted)] uppercase mb-1">Satuan Stok</label>
                                <span className="p-1.5 block text-xs font-bold text-[var(--color-text-secondary)] bg-white/70 dark:bg-black/20 rounded border border-gray-200/50 mt-0.5 text-center">{item.stockUnit}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[var(--color-coffee-latte)] bg-[#faf6ef] dark:bg-[#221c19] p-4">
              <span className="text-sm font-semibold">Total Pengeluaran</span>
              <span className="font-mono text-lg font-bold text-[var(--color-accent-red)]">{formatRupiah(total)}</span>
            </div>
          </div>

          <div className="glass-card p-4">
            <h4 className="mb-2 text-[11px] font-bold uppercase text-[var(--color-text-secondary)]">Sumber Dana Kas</h4>
            {cashAccounts.length ? (
              <select className="form-select mb-1 p-2 text-sm" value={selectedCashAccountId} onChange={(event) => setCashAccountId(event.target.value)}>
                {cashAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name} ({formatRupiah(account.balance || 0)})</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">Akun kas belum dimuat. Backend akan memakai akun kas utama jika tersedia.</p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded border border-[var(--color-accent-red)] bg-red-50 p-3 text-xs text-[var(--color-accent-red)]">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button onClick={onConfirm} disabled={isSaving} className="btn btn-primary mt-2 w-full disabled:opacity-60">
            {isSaving ? 'Menyimpan...' : 'Konfirmasi & Simpan Pengeluaran'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center justify-center py-6 fade-in">
          {/* Success Notification */}
          <div className="mb-6 flex items-center gap-2 rounded-full bg-[var(--color-success)] px-5 py-2.5 text-sm font-bold text-white shadow-lg">
            <Check size={18} strokeWidth={3} />
            <span>Resi Berhasil Disimpan!</span>
          </div>

          {/* Thermal Receipt Paper Frame */}
          <div 
            className="receipt-paper w-full p-6 text-black font-mono text-xs mb-8 rounded-b-sm"
            style={{ maxWidth: settings.receiptPaperSize === '80mm' ? '380px' : '320px' }}
          >
            {/* Logo/Header */}
            <div className="text-center space-y-1 mb-4">
              <h2 className="text-sm font-bold tracking-widest uppercase">{settings.receiptHeaderName || 'ruang.tengah'}</h2>
              <p className="text-[10px] text-gray-500">{settings.receiptAddress || 'COFFEE & CO-WORKING'}</p>
              {settings.receiptPhone && (
                <p className="text-[9px] text-gray-400">Telp: {settings.receiptPhone}</p>
              )}
              <div className="border-b border-dashed border-gray-300 my-2" />
            </div>

            {/* Receipt Meta */}
            <div className="space-y-1 text-[10px] text-gray-600 mb-3">
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{transactionDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Supplier:</span>
                <span className="font-bold">{merchantName || 'Lainnya'}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir/Partner:</span>
                <span>{user?.name || 'Partner'}</span>
              </div>
              <div className="flex justify-between">
                <span>Sumber Kas:</span>
                <span>{cashAccounts.find(a => String(a.id) === String(selectedCashAccountId))?.name || 'Kas Utama'}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-gray-300 my-2" />

            {/* Items */}
            <div className="space-y-2 mb-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[10px]">
                  <div className="pr-4">
                    <div className="font-bold text-gray-800">{item.name}</div>
                    <div className="text-[9px] text-gray-500">
                      {item.qty} {item.unit} x {formatRupiah(item.price)}
                      {item.addsStock && ` (Stok: +${item.stockQty} ${item.stockUnit})`}
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 shrink-0">{formatRupiah(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="border-b border-dashed border-gray-300 my-2" />

            {/* Total */}
            <div className="space-y-1 text-xs mb-4">
              <div className="flex justify-between font-extrabold text-sm">
                <span>TOTAL:</span>
                <span>{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[9px] text-gray-400 mt-6 space-y-1 whitespace-pre-line">
              {settings.receiptFooter || (
                <>
                  <p>TERIMA KASIH</p>
                  <p>RUTE Coffee Management System</p>
                  <div className="border-b border-dashed border-gray-300 my-2" />
                  <p className="text-[8px] font-mono tracking-tighter uppercase">*** PENGELUARAN TERVERIFIKASI ***</p>
                </>
              )}
            </div>
          </div>

          {/* Action buttons / Timer redirect info */}
          <div className="text-center space-y-4">
            <p className="text-xs text-[var(--color-text-muted)] animate-pulse">
              Mengalihkan ke daftar pengeluaran otomatis...
            </p>
            <button
              onClick={handleDoneReturn}
              className="btn btn-primary px-8 py-2.5 text-xs rounded-full font-bold"
            >
              Kembali Sekarang
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
