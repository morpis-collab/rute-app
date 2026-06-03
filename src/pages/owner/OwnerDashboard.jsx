import { AlertTriangle, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatWaktu } from '../../utils/formatters';
import { getBusinessDate } from '../../utils/businessDate';

export default function OwnerDashboard() {
  const expenses = useAppStore((state) => state.expenses);
  const activityLog = useAppStore((state) => state.activityLog);
  const dailyNotes = useAppStore((state) => state.dailyNotes);
  const cashAccounts = useAppStore((state) => state.cashAccounts);
  const cashSessions = useAppStore((state) => state.cashSessions);
  const getSalesSummary = useAppStore((state) => state.getSalesSummary);
  const getEstimatedHpp = useAppStore((state) => state.getEstimatedHpp);
  const getTodaySales = useAppStore((state) => state.getTodaySales);
  const getCashExpected = useAppStore((state) => state.getCashExpected);
  
  const businessDate = getBusinessDate();
  const summary = getSalesSummary(businessDate);
  const recentActivity = activityLog.slice(-5).reverse();
  const todayNote = dailyNotes.find((note) => note.date === businessDate);
  const estimasiHPP = getEstimatedHpp(businessDate);
  const todayExpenseTotal = expenses.filter(e => e.date?.startsWith(businessDate)).reduce((sum, e) => sum + e.total, 0);
  const estimasiLabaBersih = summary.totalOmzet - estimasiHPP - todayExpenseTotal;

  // Hourly sales chart data
  const todaySales = getTodaySales(businessDate);
  const hourlyData = {};
  todaySales.forEach(sale => {
    const hour = new Date(sale.date).getHours().toString().padStart(2, '0') + ':00';
    hourlyData[hour] = (hourlyData[hour] || 0) + sale.total;
  });
  const chartData = Object.keys(hourlyData).sort().map(time => ({
    time,
    omzet: hourlyData[time]
  }));
  if (chartData.length === 0) {
    chartData.push({ time: '08:00', omzet: 0 });
  }

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
          <p className="text-xl font-mono text-[var(--color-text-primary)] font-bold">{formatRupiah(summary.totalOmzet)}</p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Transactions</p>
          <p className="text-xl font-mono text-[var(--color-text-primary)] font-bold">{summary.totalTransaksi} <span className="text-xs font-sans text-[var(--color-text-muted)] font-normal">/ {summary.totalCup} cup</span></p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Expenses</p>
          <p className="text-xl font-mono text-[var(--color-accent-red)] font-bold">{formatRupiah(todayExpenseTotal)}</p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Est. Net Profit</p>
          <p className={`text-xl font-mono font-bold ${estimasiLabaBersih >= 0 ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>{formatRupiah(estimasiLabaBersih)}</p>
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
                    <p className="text-lg font-mono font-bold text-[var(--color-text-primary)] mt-1">{formatRupiah(account.balance)}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 truncate">{account.description || 'Akun aktif'}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Volume Chart */}
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 h-64 shadow-sm">
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">Volume Penjualan Hari Ini</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'var(--color-text-muted)'}} />
                <YAxis hide domain={['dataMin', 'dataMax + 20000']} />
                <Tooltip contentStyle={{fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', boxShadow: 'none'}} formatter={(val) => formatRupiah(val)} />
                <Line type="monotone" dataKey="omzet" stroke="var(--color-accent-primary)" strokeWidth={2} dot={{r: 3, fill: 'var(--color-accent-primary)'}} activeDot={{r: 5}} />
              </LineChart>
            </ResponsiveContainer>
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
                      <td className="p-3 text-center text-xs text-[var(--color-text-muted)] italic">Tidak ada aktivitas hari ini.</td>
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
                <p className="text-xs text-[var(--color-text-muted)] italic text-center py-2">Belum ada menu terjual.</p>
              )}
            </div>
          </div>

          {/* Operator Notes */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Catatan Operator</h3>
            <div className="bg-white border border-[var(--color-border)] rounded-xl p-3 text-xs text-[var(--color-text-secondary)] shadow-sm leading-relaxed">
              {todayNote ? todayNote.note : <span className="text-[var(--color-text-muted)] italic">Tidak ada catatan untuk hari ini.</span>}
            </div>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
