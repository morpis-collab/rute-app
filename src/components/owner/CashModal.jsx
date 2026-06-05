import { useState } from 'react';

export default function CashModal({ activeModal, setActiveModal, handleSimpan, cashAccounts = [], saving = false, error = '', defaultAccountId = '' }) {
  const firstAcc = defaultAccountId || cashAccounts[0]?.id || '';
  const secondAcc = cashAccounts.find(a => a.id !== firstAcc)?.id || cashAccounts[1]?.id || firstAcc;

  const [form, setForm] = useState({
    accountId: firstAcc,
    fromAccountId: firstAcc,
    toAccountId: secondAcc,
    amount: '',
    description: '',
    adjustmentType: 'plus',
  });

  if (!activeModal) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    const firstAccount = cashAccounts[0]?.id || '';
    const secondAccount = cashAccounts[1]?.id || firstAccount;
    const payload = {
      type: activeModal,
      amount: Number(form.amount || 0),
      description: form.description,
    };

    if (activeModal === 'transfer') {
      payload.fromAccountId = form.fromAccountId || firstAccount;
      payload.toAccountId = form.toAccountId || secondAccount;
    } else {
      payload.accountId = form.accountId || firstAccount;
      if (activeModal === 'koreksi') payload.adjustmentType = form.adjustmentType;
    }

    handleSimpan(payload);
  };

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
        
        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Form Transfer */}
          {activeModal === 'transfer' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Dari Akun</label>
                  <select
                    className="form-select text-sm p-2"
                    value={form.fromAccountId}
                    onChange={(event) => updateField('fromAccountId', event.target.value)}
                    required
                  >
                    {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Ke Akun</label>
                  <select
                    className="form-select text-sm p-2"
                    value={form.toAccountId}
                    onChange={(event) => updateField('toAccountId', event.target.value)}
                    required
                  >
                    {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  className="form-input text-sm p-2 font-mono"
                  placeholder="0"
                  min="1"
                  value={form.amount}
                  onChange={(event) => updateField('amount', event.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            /* Form In / Out / Koreksi */
            <>
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Akun Kas</label>
                <select
                  className="form-select text-sm p-2"
                  value={form.accountId}
                  onChange={(event) => updateField('accountId', event.target.value)}
                  required
                >
                  {cashAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  className="form-input text-sm p-2 font-mono"
                  placeholder="0"
                  min="1"
                  value={form.amount}
                  onChange={(event) => updateField('amount', event.target.value)}
                  required
                />
              </div>
              {activeModal === 'koreksi' && (
                  <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Tipe Koreksi</label>
                  <select
                    className="form-select text-sm p-2"
                    value={form.adjustmentType}
                    onChange={(event) => updateField('adjustmentType', event.target.value)}
                  >
                    <option value="plus">Penambahan Saldo (+)</option>
                    <option value="minus">Pengurangan Saldo (-)</option>
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Catatan / Alasan</label>
            <input
              type="text"
              className="form-input text-sm p-2"
              placeholder="Wajib diisi..."
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-[var(--radius-md)] border border-[#f0c7ba] bg-[#fff4ef] px-3 py-2 text-xs text-[#a34f39]">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={saving} className="btn btn-primary w-full shadow-md disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan Perubahan Kas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
