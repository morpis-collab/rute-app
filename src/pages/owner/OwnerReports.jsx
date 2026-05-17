import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah } from '../../utils/formatters';

export default function OwnerReports() {
  const [showToast, setShowToast] = useState(false);
  const { getSalesSummary, getEstimatedHpp, getExpenseTotal } = useAppStore();
  
  const summary = getSalesSummary();
  const totalHpp = getEstimatedHpp();
  const totalExpense = getExpenseTotal();
  const rows = [
    { label: 'Total Omzet', value: formatRupiah(summary.totalOmzet) },
    { label: 'Total HPP', value: formatRupiah(totalHpp) },
    { label: 'Laba Kotor', value: formatRupiah(summary.totalOmzet - totalHpp) },
    { label: 'Pengeluaran Operasional', value: formatRupiah(totalExpense) },
    { label: 'Total Transaksi', value: `${summary.totalTransaksi} trx` },
    { label: 'Total Cup', value: `${summary.totalCup} cup` },
  ];

  const expenses = useAppStore((state) => state.expenses);
  const sales = useAppStore((state) => state.sales);

  const handleExport = (type) => {
    if (type === 'csv' || type === 'excel') {
      const csvContent = [
        ['Type', 'ID', 'Date', 'Category/Method', 'Description', 'Total (Rp)'],
        ...sales.map(s => ['Sale', s.id, s.date, s.paymentMethod, `Penjualan ${s.items.length} item`, s.total]),
        ...expenses.map(e => ['Expense', e.id, e.date, e.category, e.description, e.total])
      ].map(e => e.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `laporan_rute_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <PageWrapper title="Laporan Keuangan" subtitle="Ringkasan Performa & Ekspor Data">
      
      {showToast && (
        <div className="fixed top-16 right-4 z-50 bg-[var(--color-accent-green)] text-white px-4 py-3 rounded shadow-[var(--shadow-md)] flex items-center gap-2 text-sm font-medium slide-in">
          ✓ File laporan berhasil di-export!
        </div>
      )}

      {/* Export Actions */}
      <div className="glass-card mb-6 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h3 className="font-bold text-[var(--color-text-primary)] text-sm mb-1">Unduh Laporan</h3>
          <p className="text-xs text-[var(--color-text-secondary)]">Export data transaksi ke Excel atau CSV.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="btn btn-secondary bg-white text-xs">
            Export CSV
          </button>
          <button onClick={() => handleExport('excel')} className="btn btn-primary text-xs">
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-[var(--color-band-1)]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">Laporan Hari Ini</h3>
          </div>
          <div className="space-y-3">
            {rows.map(r => (
              <div key={r.label} className="flex justify-between items-center text-sm border-b border-[var(--color-coffee-latte)] pb-2 last:border-0">
                <span className="text-[var(--color-text-secondary)] font-medium">{r.label}</span>
                <span className="font-mono font-bold text-[var(--color-text-primary)]">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="glass-card">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">Menu Terlaris</h3>
          {summary.menuTerlaris.map((m, i) => (
            <div key={m.name} className="flex items-center gap-3 mb-3 border-b border-[var(--color-coffee-latte)] pb-2 last:border-0">
              <span className="w-6 h-6 rounded-md bg-[linear-gradient(135deg,var(--color-band-4),var(--color-coffee-latte))] text-[var(--color-band-1)] text-xs font-bold flex items-center justify-center shadow-sm">{i+1}</span>
              <span className="flex-1 text-sm font-medium">{m.name}</span>
              <span className="text-sm font-mono font-bold">{m.qty} cup</span>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
