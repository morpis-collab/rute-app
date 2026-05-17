import { useState } from 'react';
import { ArrowRightLeft, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import { cashAccounts, cashTransactions } from '../../data/mock/cashAccounts';
import { formatRupiah, formatWaktu } from '../../utils/formatters';
import CashModal from '../../components/owner/CashModal';

export default function OwnerCash() {
  const [activeModal, setActiveModal] = useState(null); // 'in', 'out', 'transfer', 'koreksi'
  const txs = cashTransactions; // Using mock data directly for now

  const totalCash = cashAccounts.reduce((acc, curr) => acc + curr.balance, 0);

  const handleSimpan = (e) => {
    e.preventDefault();
    // Simulasi simpan data
    setActiveModal(null);
  };

  return (
    <PageWrapper title="Kas Usaha" subtitle="Manajemen Saldo & Rekening">
      
      {/* Top Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveModal('in')} className="btn btn-primary bg-white text-[var(--color-accent-green)] border border-[var(--color-coffee-latte)] shadow-sm hover:shadow-md">
          <ArrowDown size={16} /> Kas Masuk
        </button>
        <button onClick={() => setActiveModal('out')} className="btn btn-primary bg-white text-[var(--color-accent-red)] border border-[var(--color-coffee-latte)] shadow-sm hover:shadow-md">
          <ArrowUp size={16} /> Kas Keluar
        </button>
        <button onClick={() => setActiveModal('transfer')} className="btn btn-primary bg-white text-[var(--color-accent-blue)] border border-[var(--color-coffee-latte)] shadow-sm hover:shadow-md">
          <ArrowRightLeft size={16} /> Transfer Kas
        </button>
        <button onClick={() => setActiveModal('koreksi')} className="btn btn-primary bg-white text-[var(--color-accent-orange)] border border-[var(--color-coffee-latte)] shadow-sm hover:shadow-md">
          <AlertTriangle size={16} /> Koreksi
        </button>
      </div>

      {/* Saldo Accounts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="kpi-card bg-[linear-gradient(135deg,var(--color-band-1),var(--color-band-2))] text-white border-none">
          <p className="text-[11px] uppercase tracking-wider font-semibold mb-1 opacity-80">Total Saldo Semua Kas</p>
          <p className="text-2xl font-mono font-bold">{formatRupiah(totalCash)}</p>
        </div>
        {cashAccounts.map(acc => (
          <div key={acc.id} className="kpi-card">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] font-semibold">{acc.name}</p>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${acc.type === 'tunai' ? 'bg-[#e8f5e4] text-[#4a7a3f]' : acc.type === 'bank' ? 'bg-[#e0ecf5] text-[#5a7a8f]' : 'bg-[#f5efe0] text-[#c4955a]'}`}>
                {acc.type}
              </span>
            </div>
            <p className="text-xl font-mono text-[var(--color-text-primary)] font-bold">{formatRupiah(acc.balance)}</p>
          </div>
        ))}
      </div>

      {/* History Mutasi Kas */}
      <div className="glass-card p-0">
        <div className="p-4 border-b border-[var(--color-coffee-latte)] flex justify-between items-center bg-[#faf6ef]">
          <h3 className="font-bold text-[var(--color-text-primary)]">Riwayat Mutasi Kas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-32">Waktu</th>
                <th>Jenis</th>
                <th>Keterangan</th>
                <th>Akun</th>
                <th className="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {txs.map(tx => (
                <tr key={tx.id}>
                  <td className="font-mono text-xs text-[var(--color-text-secondary)]">{formatWaktu(tx.date)}</td>
                  <td>
                    <span className={`badge ${tx.type === 'in' ? 'badge-success' : tx.type === 'out' ? 'badge-danger' : 'badge-info'}`}>
                      {tx.type === 'in' ? 'Kas Masuk' : tx.type === 'out' ? 'Kas Keluar' : 'Transfer'}
                    </span>
                  </td>
                  <td>
                    <p className="font-medium text-[var(--color-text-primary)]">{tx.description}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Oleh: {tx.user}</p>
                  </td>
                  <td className="text-sm">
                    {tx.type === 'transfer' ? (
                      <span className="text-[var(--color-text-secondary)]">
                        {cashAccounts.find(a => a.id === tx.fromAccountId)?.name} <ArrowRightLeft size={10} className="inline mx-1" /> {cashAccounts.find(a => a.id === tx.toAccountId)?.name}
                      </span>
                    ) : (
                      cashAccounts.find(a => a.id === tx.accountId)?.name
                    )}
                  </td>
                  <td className={`text-right font-mono font-bold ${tx.type === 'in' ? 'text-[var(--color-accent-green)]' : tx.type === 'out' ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-text-primary)]'}`}>
                    {tx.type === 'in' ? '+' : tx.type === 'out' ? '-' : ''}{formatRupiah(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <CashModal activeModal={activeModal} setActiveModal={setActiveModal} handleSimpan={handleSimpan} />
    </PageWrapper>
  );
}
