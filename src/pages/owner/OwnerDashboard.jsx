import { AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatWaktu } from '../../utils/formatters';
import { getBusinessDate } from '../../utils/businessDate';

export default function OwnerDashboard() {
  const expenses = useAppStore((state) => state.expenses);
  const ingredients = useAppStore((state) => state.ingredients);
  const activityLog = useAppStore((state) => state.activityLog);
  const dailyNotes = useAppStore((state) => state.dailyNotes);
  const getSalesSummary = useAppStore((state) => state.getSalesSummary);
  const getEstimatedHpp = useAppStore((state) => state.getEstimatedHpp);
  const getTodaySales = useAppStore((state) => state.getTodaySales);
  const businessDate = getBusinessDate();
  const summary = getSalesSummary(businessDate);
  const criticalStock = ingredients.filter(i => i.status === 'kritis');
  const recentActivity = activityLog.slice(-4).reverse();
  const todayNote = dailyNotes.find((note) => note.date === businessDate) || dailyNotes[0];
  const estimasiHPP = getEstimatedHpp(businessDate);
  const estimasiLaba = summary.totalOmzet - estimasiHPP;
  const todayExpenseTotal = expenses.filter(e => e.date?.startsWith(businessDate)).reduce((sum, e) => sum + e.total, 0);

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
    chartData.push({ time: '08:00', omzet: 0 }); // Fallback empty state
  }

  return (
    <PageWrapper title="Operations Overview" subtitle="Hari ini">
      {/* 1-Row Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Gross Volume</p>
          <p className="text-xl font-mono text-[var(--color-text-primary)]">{formatRupiah(summary.totalOmzet)}</p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Transactions</p>
          <p className="text-xl font-mono text-[var(--color-text-primary)]">{summary.totalTransaksi} <span className="text-sm font-sans text-[var(--color-text-muted)] font-normal">/ {summary.totalCup} cup</span></p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Expenses</p>
          <p className="text-xl font-mono text-[var(--color-danger)]">{formatRupiah(todayExpenseTotal)}</p>
        </div>
        <div className="pb-2 border-b border-[var(--color-border)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-1">Est. Profit</p>
          <p className="text-xl font-mono text-[var(--color-success)]">{formatRupiah(estimasiLaba)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Charts & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Minimal Chart */}
          <div className="bg-white border border-[var(--color-border)] rounded p-4 h-64">
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">Volume Today</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'var(--color-text-muted)'}} />
                <YAxis hide domain={['dataMin', 'dataMax + 20000']} />
                <Tooltip contentStyle={{fontSize: '12px', borderRadius: '4px', border: '1px solid var(--color-border)', boxShadow: 'none'}} formatter={(val) => formatRupiah(val)} />
                <Line type="monotone" dataKey="omzet" stroke="var(--color-accent-primary)" strokeWidth={2} dot={{r: 3, fill: 'var(--color-accent-primary)'}} activeDot={{r: 5}} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Log Table */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Recent Activity</h3>
            <div className="bg-white border border-[var(--color-border)] rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-[var(--color-border)]">
                  {recentActivity.map(act => (
                    <tr key={act.id}>
                      <td className="p-3 w-16 text-xs font-mono text-[var(--color-text-muted)]">{formatWaktu(act.time)}</td>
                      <td className="p-3 text-[var(--color-text-secondary)]">{act.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Alerts & Notes */}
        <div className="space-y-6">
          {/* Alerts */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Needs Attention</h3>
            <div className="space-y-2">
              <div className="flex gap-2 p-3 bg-[#FFF8E1] border border-[#FFECB3] rounded text-sm text-[#F57F17]">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Operator belum tutup kas</p>
                  <p className="text-xs mt-0.5 opacity-80">Kasir belum rekonsiliasi</p>
                </div>
              </div>
              {criticalStock.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-white border border-[var(--color-border)] rounded text-sm">
                  <span className="text-[var(--color-text-secondary)]">{item.name}</span>
                  <span className="font-mono text-[var(--color-danger)] font-medium text-xs">{item.stock} {item.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Operator Notes</h3>
            <div className="bg-white border border-[var(--color-border)] rounded p-3 text-sm text-[var(--color-text-secondary)]">
              {todayNote ? todayNote.note : <span className="text-[var(--color-text-muted)] italic">No notes today.</span>}
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
