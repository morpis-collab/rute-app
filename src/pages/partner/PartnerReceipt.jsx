import { Fragment, useState } from 'react';
import { Camera, ImagePlus, Check, Loader2 } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';
import { scanReceiptImage } from '../../services/receiptService';
import { formatRupiah } from '../../utils/formatters';

export default function PartnerReceipt() {
  const [step, setStep] = useState('upload');
  const [items, setItems] = useState([]);
  const [imgPrev, setImgPrev] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const saveReceiptExpense = useAppStore((state) => state.saveReceiptExpense);
  const { user } = useAuthStore();

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgPrev(URL.createObjectURL(f));
    setStep('scanning');
    const aiResult = await scanReceiptImage(f);
    setReceipt(aiResult);
    setItems(aiResult.items.map(i => ({...i})));
    setStep('preview');
  };

  const onConfirm = () => {
    saveReceiptExpense({
      receipt: { ...receipt, items },
      imageUrl: imgPrev,
      user: user?.name || 'Partner',
    });
    setStep('done');
    setTimeout(() => { setStep('upload'); setItems([]); setImgPrev(null); setReceipt(null); }, 1500);
  };

  const total = items.reduce((s, i) => s + i.total, 0);

  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;

      const next = { ...item, [field]: value };
      const qty = Number(field === 'qty' ? value : next.qty) || 0;
      const price = Number(field === 'price' ? value : next.price) || 0;
      const stockRatio = item.qty ? item.stockQty / item.qty : 1;

      return {
        ...next,
        qty,
        price,
        total: qty * price,
        stockQty: item.addsStock ? qty * stockRatio : item.stockQty,
      };
    }));
  };

  return (
    <PageWrapper title="Upload Resi" subtitle="Foto resi diproses AI, lalu konfirmasi sebelum masuk data">
      {step === 'upload' && (
        <div className="flex flex-col gap-3 py-4">
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] cursor-pointer hover:bg-[#F5F5F5] transition-colors h-32">
            <Camera size={24} className="text-[var(--color-text-secondary)]" />
            <p className="font-medium text-sm text-[var(--color-text-primary)]">Ambil Foto</p>
            <input type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
          </label>
          <label className="flex items-center justify-center gap-2 p-3 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] cursor-pointer hover:bg-[#F5F5F5] transition-colors">
            <ImagePlus size={18} className="text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium">Pilih Galeri</span>
            <input type="file" accept="image/*" onChange={onFile} className="hidden" />
          </label>
        </div>
      )}

      {step === 'scanning' && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 size={24} className="text-[var(--color-text-primary)] animate-spin" />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">Memproses OCR...</p>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4 fade-in">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Cek & Konfirmasi AI</h3>
              {receipt && <p className="text-xs text-[var(--color-text-muted)]">{receipt.merchantName} · Confidence {Math.round(receipt.confidence * 100)}%</p>}
            </div>
            <button onClick={() => setStep('upload')} className="text-[11px] font-bold text-[var(--color-band-2)] hover:underline">Ulang Foto</button>
          </div>
          
          {imgPrev && (
            <div className="w-full h-40 bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden border border-[var(--color-border)] mb-4">
              <img src={imgPrev} alt="Resi Preview" className="w-full h-full object-contain" />
            </div>
          )}
          
          <div className="glass-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead className="bg-[#faf6ef]">
                  <tr>
                    <th className="w-1/3">Item di Resi</th>
                    <th>Jml</th>
                    <th>Harga (Rp)</th>
                    <th className="text-right">Masuk Stok?</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <Fragment key={item.id}>
                    <tr>
                      <td>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          className="w-full text-xs p-1 border-b border-transparent hover:border-[var(--color-coffee-latte)] focus:border-[var(--color-band-2)] outline-none bg-transparent"
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={item.qty}
                            onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                            className="w-12 rounded border border-[var(--color-coffee-latte)] px-1 py-1 text-center font-mono text-xs"
                          />
                          <span className="text-[10px] text-[var(--color-text-muted)]">{item.unit}</span>
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                          className="w-full rounded border border-[var(--color-coffee-latte)] px-1 py-1 text-right font-mono text-xs"
                        />
                      </td>
                      <td className="text-right">
                        <label className="flex flex-col items-end gap-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px]">{item.addsStock ? 'Ya' : 'Tidak'}</span>
                            <input
                              type="checkbox"
                              checked={item.addsStock}
                              onChange={(e) => updateItem(item.id, 'addsStock', e.target.checked)}
                              className="w-4 h-4 accent-[var(--color-band-1)]"
                            />
                          </div>
                        </label>
                      </td>
                    </tr>
                    {item.addsStock && (
                      <tr key={`${item.id}-mapping`} className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-coffee-latte)]">
                        <td colSpan="4" className="p-2">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Mapping ke Stok:</span>
                            <select 
                              className="form-select text-xs p-1 w-48"
                              value={item.ingredientId || ''}
                              onChange={(e) => updateItem(item.id, 'ingredientId', Number(e.target.value))}
                            >
                              <option value="">-- Pilih Bahan Baku --</option>
                              {useAppStore.getState().ingredients.map(ing => (
                                <option key={ing.id} value={ing.id}>{ing.name}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="0"
                              placeholder="Qty Stok"
                              value={item.stockQty || ''}
                              onChange={(e) => updateItem(item.id, 'stockQty', Number(e.target.value))}
                              className="w-16 rounded border border-[var(--color-coffee-latte)] px-1 py-1 text-center font-mono text-xs"
                            />
                            <select 
                              className="form-select text-xs p-1 w-16"
                              value={item.stockUnit || 'gram'}
                              onChange={(e) => updateItem(item.id, 'stockUnit', e.target.value)}
                            >
                              <option value="gram">g</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="l">L</option>
                              <option value="pcs">pcs</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-[#faf6ef] flex justify-between items-center border-t border-[var(--color-coffee-latte)]">
              <span className="text-sm font-semibold">Total Pengeluaran</span>
              <span className="text-lg font-bold font-mono text-[var(--color-accent-red)]">{formatRupiah(total)}</span>
            </div>
          </div>

          <div className="glass-card p-4">
            <h4 className="text-[11px] font-bold uppercase text-[var(--color-text-secondary)] mb-2">Pilih Sumber Dana (Kas)</h4>
            <select className="form-select text-sm p-2 mb-2">
              <option value="kas_tunai">Kas Tunai Outlet (Rp 1.850.000)</option>
              <option value="kas_operasional">Kas Operasional (Rp 850.000)</option>
              <option value="qris">QRIS (Rp 4.250.000)</option>
            </select>
          </div>

          <button onClick={onConfirm} className="w-full btn btn-primary mt-2">Konfirmasi & Simpan Pengeluaran</button>
        </div>
      )}

      {step === 'done' && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-success)] text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 text-sm font-medium slide-in">
          <Check size={16} /> Resi disimpan
        </div>
      )}
    </PageWrapper>
  );
}
