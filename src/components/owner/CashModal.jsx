import { cashAccounts } from '../../data/mock/cashAccounts';

export default function CashModal({ activeModal, setActiveModal, handleSimpan }) {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm slide-in">
      <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-md shadow-[var(--shadow-lg)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-coffee-latte)] flex justify-between items-center bg-[#faf6ef]">
          <h3 className="font-bold text-[var(--color-text-primary)]">
            {activeModal === 'in' && 'Tambah Kas Masuk'}
            {activeModal === 'out' && 'Catat Kas Keluar'}
            {activeModal === 'transfer' && 'Transfer Antar Kas'}
            {activeModal === 'koreksi' && 'Koreksi Saldo Kas'}
          </h3>
          <button onClick={() => setActiveModal(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSimpan} className="p-5 space-y-4">
          {/* Form Transfer */}
          {activeModal === 'transfer' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Dari Akun</label>
                  <select className="form-select text-sm p-2">
                    {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Ke Akun</label>
                  <select className="form-select text-sm p-2">
                    {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nominal (Rp)</label>
                <input type="number" className="form-input text-sm p-2 font-mono" placeholder="0" required />
              </div>
            </>
          ) : (
            /* Form In / Out / Koreksi */
            <>
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Akun Kas</label>
                <select className="form-select text-sm p-2">
                  {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nominal (Rp)</label>
                <input type="number" className="form-input text-sm p-2 font-mono" placeholder="0" required />
              </div>
              {activeModal === 'koreksi' && (
                  <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Tipe Koreksi</label>
                  <select className="form-select text-sm p-2">
                    <option value="plus">Penambahan Saldo (+)</option>
                    <option value="minus">Pengurangan Saldo (-)</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Catatan / Alasan</label>
            <input type="text" className="form-input text-sm p-2" placeholder="Wajib diisi..." required />
          </div>

          <div className="pt-2">
            <button type="submit" className="btn btn-primary w-full shadow-md">Simpan Perubahan Kas</button>
          </div>
        </form>
      </div>
    </div>
  );
}
