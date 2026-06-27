import { FileText, Sparkles, X } from 'lucide-react';

/**
 * SalesCopasModal - Component for parsing WhatsApp rekap text.
 */
export default function SalesCopasModal({
  isOpen,
  onClose,
  rawText,
  setRawText,
  onParse,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-[var(--color-border)] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="text-[var(--color-band-1)]" size={18} />
            <h3 className="text-sm font-black text-[var(--color-text-primary)]">Copas Rekap WhatsApp / Teks</h3>
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
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Contoh format:\nKopi Susu RUTE 5\nAmericano 2\nMatcha Latte 1\nKentang Goreng 3`}
              className="form-input w-full p-3 font-mono text-xs resize-none focus:outline-none"
            />
          </div>

          <div className="rounded-xl bg-warning-bg border border-warning-border p-3 text-[10px] text-warning-text leading-relaxed font-semibold">
            💡 <b>Tips:</b> Anda bisa mengetik dengan format <code>[Jumlah] [Nama Menu]</code> atau <code>[Nama Menu] [Jumlah]</code>. Singkatan menu yang wajar akan tetap dikenali (misal: <i>"Ame"</i> akan dicocokkan dengan <i>Americano</i>).
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[var(--color-border)] bg-gray-50 px-6 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary h-9 text-xs cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onParse}
            className="btn btn-primary h-9 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={13} />
            Proses & Isi Form
          </button>
        </div>
      </div>
    </div>
  );
}
