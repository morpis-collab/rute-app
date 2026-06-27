import {
  Camera,
  Sparkles,
  X,
  Loader2,
  Minus,
  Plus,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { formatRupiah } from '../../utils/formatters';
import { productPrice } from '../../utils/salesParser';

/**
 * SalesOcrModal - Component for side-by-side AI OCR verification and manual mapping.
 */
export default function SalesOcrModal({
  isOpen,
  onClose,
  isLoading,
  ocrImage,
  ocrItems,
  ocrError,
  activeProducts,
  updateOcrItem,
  removeOcrItem,
  applyOcrToForm,
}) {
  if (!isOpen) return null;

  return (
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
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--color-text-secondary)] hover:bg-gray-200 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
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
                                className="px-2 h-full hover:bg-gray-50 border-r border-[var(--color-border)] cursor-pointer"
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
                                className="px-2 h-full hover:bg-gray-50 border-l border-[var(--color-border)] cursor-pointer"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeOcrItem(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-all cursor-pointer"
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
                      onClick={onClose}
                      className="btn btn-secondary flex-1 sm:flex-initial h-9 text-xs cursor-pointer"
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
  );
}
