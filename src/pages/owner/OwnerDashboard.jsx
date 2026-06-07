import { AlertTriangle, Check, Coffee, FileText, Activity } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatWaktu } from '../../utils/formatters';
import { getBusinessDate } from '../../utils/businessDate';
import EmptyState from '../../components/common/EmptyState';
import AnimatedNumber from '../../components/common/AnimatedNumber';

export default function OwnerDashboard() {
  const sales = useAppStore((state) => state.sales);
  const products = useAppStore((state) => state.products);
  const expenses = useAppStore((state) => state.expenses);
  const activityLog = useAppStore((state) => state.activityLog);
  const dailyNotes = useAppStore((state) => state.dailyNotes);
  const cashAccounts = useAppStore((state) => state.cashAccounts);
  const cashSessions = useAppStore((state) => state.cashSessions);
  const getSalesSummary = useAppStore((state) => state.getSalesSummary);
  const getEstimatedHpp = useAppStore((state) => state.getEstimatedHpp);
  const getCashExpected = useAppStore((state) => state.getCashExpected);
  
  const businessDate = getBusinessDate();
  const summary = getSalesSummary(businessDate);
  const recentActivity = activityLog.slice(-5).reverse();
  const todayNote = dailyNotes.find((note) => note.date === businessDate);
  const estimasiHPP = getEstimatedHpp(businessDate);
  const todayExpenseTotal = expenses
    .filter(e => e.date?.startsWith(businessDate) && e.status !== 'rejected')
    .reduce((sum, e) => sum + e.total, 0);
  const estimasiLabaBersih = summary.totalOmzet - estimasiHPP - todayExpenseTotal;

  // Calculate overall totals (sales, hpp, expenses, net profit)
  const totalOmzetKeseluruhan = sales.reduce((sum, s) => sum + s.total, 0);
  
  const totalHppKeseluruhan = sales.reduce((sum, sale) => {
    return sum + (sale.items?.reduce((itemSum, item) => {
      if (item.estimatedHpp != null) return itemSum + Number(item.estimatedHpp);
      const product = products.find((p) => String(p.id) === String(item.productId));
      return itemSum + Number(product?.hpp || 0) * Number(item.qty || 0);
    }, 0) || 0);
  }, 0);

  const totalPengeluaranKeseluruhan = expenses
    .filter(e => e.status !== 'rejected')
    .reduce((sum, e) => sum + e.total, 0);

  const totalKeuntunganKeseluruhan = totalOmzetKeseluruhan - totalHppKeseluruhan - totalPengeluaranKeseluruhan;

  // Dynamic Cash Session Status
  const todaySession = cashSessions.find(s => s.date === businessDate);
  const systemExpectedCash = getCashExpected(businessDate);

  // Payment Breakdown Percentage
  const totalPayment = (summary.byMethod.cash || 0) + (summary.byMethod.qris || 0) + (summary.byMethod.transfer || 0) || 1;
  const cashPct = Math.round(((summary.byMethod.cash || 0) / totalPayment) * 100);
  const qrisPct = Math.round(((summary.byMethod.qris || 0) / totalPayment) * 100);
  const transferPct = Math.round(((summary.byMethod.transfer || 0) / totalPayment) * 100);

  return (
    <PageWrapper title="Operations Overview" subtitle="Hari ini">
      {/* 4-KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Gross Volume (Omzet)</p>
          <p className="text-xl font-mono text-[var(--color-text-primary)] font-bold"><AnimatedNumber value={summary.totalOmzet} /></p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Transactions</p>
          <p className="text-xl font-mono text-[var(--color-text-primary)] font-bold"><AnimatedNumber value={summary.totalTransaksi} formatter={(v) => String(Math.round(v))} /> <span className="text-xs font-sans text-[var(--color-text-muted)] font-normal">/ <AnimatedNumber value={summary.totalCup} formatter={(v) => `${Math.round(v)} cup`} duration={600} /></span></p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Expenses</p>
          <p className="text-xl font-mono text-[var(--color-accent-red)] font-bold"><AnimatedNumber value={todayExpenseTotal} /></p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Est. Net Profit</p>
          <p className={`text-xl font-mono font-bold ${estimasiLabaBersih >= 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}><AnimatedNumber value={estimasiLabaBersih} /></p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Real-time Cash Balances */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Saldo Kas Usaha</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cashAccounts.map(account => {
                let borderStyle = 'border-l-4 border-l-gray-400';
                if (account.type === 'cash') borderStyle = 'border-l-4 border-l-[var(--color-accent-green)]';
                if (account.type === 'qris') borderStyle = 'border-l-4 border-l-[var(--color-accent-orange)]';
                if (account.type === 'bank') borderStyle = 'border-l-4 border-l-[var(--color-accent-blue)]';
                
                return (
                  <div key={account.id} className={`p-4 rounded-xl bg-white border border-[var(--color-border)] ${borderStyle} shadow-sm`}>
                    <p className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">{account.name}</p>
                    <p className="text-lg font-mono font-bold text-[var(--color-text-primary)] mt-1"><AnimatedNumber value={account.balance} duration={1000} /></p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">{account.description || 'Akun aktif'}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Keuntungan & Pengeluaran Keseluruhan */}
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">Keuntungan & Pengeluaran Keseluruhan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[var(--color-border)] border-l-4 border-l-[var(--color-accent-green)] shadow-sm">
                <p className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">Total Keuntungan Bersih</p>
                <p className="text-2xl font-mono font-bold text-[var(--color-accent-green)] mt-2"><AnimatedNumber value={totalKeuntunganKeseluruhan} duration={1200} /></p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Akumulasi laba bersih usaha</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[var(--color-border)] border-l-4 border-l-[var(--color-accent-red)] shadow-sm">
                <p className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">Total Pengeluaran</p>
                <p className="text-2xl font-mono font-bold text-[var(--color-accent-red)] mt-2"><AnimatedNumber value={totalPengeluaranKeseluruhan} duration={1200} /></p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Akumulasi biaya operasional</p>
              </div>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Aktivitas Terkini</h3>
            <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-[var(--color-border)]">
                  {recentActivity.map(act => (
                    <tr key={act.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 w-16 text-xs font-mono text-[var(--color-text-muted)]">{formatWaktu(act.time)}</td>
                      <td className="p-3 text-[var(--color-text-secondary)] text-xs">{act.action}</td>
                    </tr>
                  ))}
                  {recentActivity.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-0">
                        <EmptyState
                          message="Tidak ada aktivitas hari ini."
                          sub="Aktivitas akan muncul saat ada transaksi"
                          icon={<Activity size={24} />}
                          size="sm"
                          showParticles={false}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
          
          {/* Dynamic Tutup Kas Status */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Status Tutup Kas</h3>
            {!todaySession || todaySession.status !== 'closed' ? (
              <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 shadow-sm">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <p className="font-semibold text-xs">Operator Belum Tutup Kas</p>
                  <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                    Sesi kasir hari ini masih aktif. Perkiraan uang tunai di laci saat ini: <strong>{formatRupiah(systemExpectedCash)}</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 shadow-sm">
                <Check size={18} className="shrink-0 mt-0.5 text-emerald-500" />
                <div>
                  <p className="font-semibold text-xs">Tutup Kas Selesai</p>
                  <div className="text-[11px] mt-1.5 space-y-1 opacity-90 leading-relaxed font-mono">
                    <p>Fisik laci: {formatRupiah(todaySession.closingCash)}</p>
                    <p>Sistem: {formatRupiah(todaySession.expectedCash)}</p>
                    <p>Selisih: <span className={todaySession.difference === 0 ? 'text-gray-600' : todaySession.difference < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                      {todaySession.difference === 0 ? 'Seimbang' : formatRupiah(todaySession.difference)}
                    </span></p>
                    {todaySession.notes && <p className="italic text-gray-500 font-sans mt-1">Note: "{todaySession.notes}"</p>}
                    <p className="text-[10px] text-gray-400 font-sans mt-1">Oleh: {todaySession.closedBy}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Breakdown */}
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Komposisi Pembayaran</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Tunai (Cash)</span>
                  <span className="font-mono">{formatRupiah(summary.byMethod.cash)} ({cashPct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[var(--color-accent-green)] h-1.5 rounded-full" style={{ width: `${cashPct}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>QRIS BNI</span>
                  <span className="font-mono">{formatRupiah(summary.byMethod.qris)} ({qrisPct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[var(--color-accent-orange)] h-1.5 rounded-full" style={{ width: `${qrisPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Transfer Bank</span>
                  <span className="font-mono">{formatRupiah(summary.byMethod.transfer)} ({transferPct}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[var(--color-accent-blue)] h-1.5 rounded-full" style={{ width: `${transferPct}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Top Menus */}
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Menu Terlaris Hari Ini</h3>
            <div className="space-y-2">
              {summary.menuTerlaris.slice(0, 3).map((m, i) => (
                <div key={m.name} className="flex items-center gap-3 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <span className="w-5 h-5 rounded bg-[var(--color-band-4)] text-[var(--color-band-1)] text-[10px] font-bold flex items-center justify-center shadow-sm">{i + 1}</span>
                  <span className="flex-1 text-xs font-medium truncate">{m.name}</span>
                  <span className="text-xs font-mono font-bold">{m.qty} cup</span>
                </div>
              ))}
              {summary.menuTerlaris.length === 0 && (
                <EmptyState
                  message="Belum ada menu terjual."
                  sub="Menu terlaris akan muncul setelah ada penjualan"
                  icon={<Coffee size={24} />}
                  size="sm"
                />
              )}
            </div>
          </div>

          {/* Operator Notes */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Catatan Operator</h3>
            {todayNote ? (
              <div className="bg-white border border-[var(--color-border)] rounded-xl p-3 text-xs text-[var(--color-text-secondary)] shadow-sm leading-relaxed">
                {todayNote.note}
              </div>
            ) : (
              <EmptyState
                message="Tidak ada catatan untuk hari ini."
                sub="Operator belum membuat catatan"
                icon={<FileText size={24} />}
                size="sm"
              />
            )}
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
