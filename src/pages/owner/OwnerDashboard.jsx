import { Link } from 'react-router-dom';
import {
  Activity,
  Banknote,
  Check,
  Coffee,
  FileText,
  Package,
  ReceiptText,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageWrapper from '../../components/layout/PageWrapper';
import { KpiTile, ProductThumb, SectionHeader, StatusAlert } from '../../components/common/DashboardPrimitives';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatWaktu } from '../../utils/formatters';
import { getBusinessDate, isSameBusinessDate } from '../../utils/businessDate';
import EmptyState from '../../components/common/EmptyState';
import AnimatedNumber from '../../components/common/AnimatedNumber';
import { motion } from 'framer-motion';

const BUSINESS_TIME_ZONE = 'Asia/Makassar';

function dateKey(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString('en-CA', { timeZone: BUSINESS_TIME_ZONE });
}

function shortDateLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('id-ID', {
    timeZone: BUSINESS_TIME_ZONE,
    day: '2-digit',
    month: 'short',
  });
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 30 } },
};

export default function OwnerDashboard() {
  const sales = useAppStore((state) => state.sales);
  const products = useAppStore((state) => state.products);
  const expenses = useAppStore((state) => state.expenses);
  const activityLog = useAppStore((state) => state.activityLog);
  const dailyNotes = useAppStore((state) => state.dailyNotes);
  const cashAccounts = useAppStore((state) => state.cashAccounts);
  const cashSessions = useAppStore((state) => state.cashSessions);
  const ingredients = useAppStore((state) => state.ingredients);
  const getSalesSummary = useAppStore((state) => state.getSalesSummary);
  const getEstimatedHpp = useAppStore((state) => state.getEstimatedHpp);
  const getCashExpected = useAppStore((state) => state.getCashExpected);

  const businessDate = getBusinessDate();
  const summary = getSalesSummary(businessDate);
  const recentActivity = (activityLog || []).slice(-5).reverse();
  const todayNote = (dailyNotes || []).find((note) => note.date === businessDate);
  const estimasiHPP = Number(getEstimatedHpp(businessDate) || 0);
  const todayExpenseTotal = (expenses || [])
    .filter((expense) => isSameBusinessDate(expense.date, businessDate) && expense.status !== 'rejected')
    .reduce((sum, expense) => sum + Number(expense.total || 0), 0);
  const estimasiLabaBersih = Number(summary.totalOmzet || 0) - estimasiHPP - todayExpenseTotal;

  const totalOmzetKeseluruhan = (sales || []).reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const totalHppKeseluruhan = (sales || []).reduce((sum, sale) => (
    sum + ((sale.items || []).reduce((itemSum, item) => {
      if (item.estimatedHpp != null) return itemSum + Number(item.estimatedHpp || 0);
      const product = (products || []).find((candidate) => String(candidate.id) === String(item.productId));
      return itemSum + Number(product?.hpp || 0) * Number(item.qty || 0);
    }, 0))
  ), 0);
  const totalPengeluaranKeseluruhan = (expenses || [])
    .filter((expense) => expense.status !== 'rejected')
    .reduce((sum, expense) => sum + Number(expense.total || 0), 0);
  const totalKeuntunganKeseluruhan = totalOmzetKeseluruhan - totalHppKeseluruhan - totalPengeluaranKeseluruhan;

  const todaySession = (cashSessions || []).find((session) => session.date === businessDate);
  const systemExpectedCash = Number(getCashExpected(businessDate) || 0);
  const pendingApprovalsCount = (expenses || []).filter((expense) => expense.status === 'pending').length;
  const hasDiscrepancy = todaySession && todaySession.status === 'closed' && Number(todaySession.difference || 0) !== 0;
  const criticalStockList = (ingredients || []).filter((item) => item.status === 'kritis' || Number(item.stock || 0) <= Number(item.minStock || 0));
  const isCashNotClosed = !todaySession || todaySession.status !== 'closed';

  const trendData = Array.from({ length: 7 }, (_, index) => {
    const date = dateKey(6 - index);
    const daySales = (sales || []).filter((sale) => isSameBusinessDate(sale.date, date));
    const omzet = daySales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const hpp = daySales.reduce((sum, sale) => sum + ((sale.items || []).reduce((itemSum, item) => {
      if (item.estimatedHpp != null) return itemSum + Number(item.estimatedHpp || 0);
      const product = (products || []).find((candidate) => String(candidate.id) === String(item.productId));
      return itemSum + Number(product?.hpp || 0) * Number(item.qty || 0);
    }, 0)), 0);
    return {
      date,
      label: shortDateLabel(date),
      omzet,
      laba: Math.max(omzet - hpp, 0),
    };
  });

  const totalPayment = Number(summary.byMethod.cash || 0) + Number(summary.byMethod.qris || 0) + Number(summary.byMethod.transfer || 0) || 1;
  const paymentRows = [
    { label: 'Cash / Tunai', value: Number(summary.byMethod.cash || 0), color: 'bg-[var(--color-accent-green)]' },
    { label: 'QRIS', value: Number(summary.byMethod.qris || 0), color: 'bg-[var(--color-accent-orange)]' },
    { label: 'Transfer Bank', value: Number(summary.byMethod.transfer || 0), color: 'bg-[var(--color-accent-blue)]' },
  ];

  const alerts = [];
  if (criticalStockList.length > 0) {
    alerts.push({ level: 'danger', title: `${criticalStockList.length} bahan stok kritis`, message: 'Perlu pembelian segera', link: '/owner/stock' });
  }
  if (pendingApprovalsCount > 0) {
    alerts.push({ level: 'warning', title: `${pendingApprovalsCount} pengeluaran pending`, message: 'Menunggu approval owner', link: '/owner/approval' });
  }
  if (isCashNotClosed) {
    alerts.push({ level: 'info', title: 'Partner belum tutup kas', message: `Ekspektasi laci ${formatRupiah(systemExpectedCash)}`, link: '/owner/cash' });
  }
  if (hasDiscrepancy) {
    alerts.push({ level: 'danger', title: 'Selisih kas terdeteksi', message: formatRupiah(todaySession.difference), link: '/owner/cash' });
  }

  return (
    <PageWrapper title="Ringkasan Operasional" subtitle="Pantau penjualan, kas, stok, dan aktivitas partner hari ini">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* KPI Tiles Row */}
        <motion.div variants={itemVariants} className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-5">
          <KpiTile icon={TrendingUp} label="Omzet Hari Ini" value={<AnimatedNumber value={summary.totalOmzet || 0} />} helper={`${summary.totalTransaksi || 0} transaksi / ${summary.totalCup || 0} cup`} tone="green" />
          <KpiTile icon={Wallet} label="Laba Bersih" value={<AnimatedNumber value={estimasiLabaBersih} />} helper={`HPP ${formatRupiah(estimasiHPP)}`} tone={estimasiLabaBersih >= 0 ? 'blue' : 'red'} />
          <KpiTile icon={Package} label="Stok Kritis" value={criticalStockList.length} helper="Bahan di bawah minimum" tone="orange" />
          <KpiTile icon={Banknote} label="Belum Tutup Kas" value={isCashNotClosed ? 1 : 0} helper={isCashNotClosed ? 'Shift berjalan' : 'Selesai'} tone={isCashNotClosed ? 'red' : 'green'} />
          <KpiTile icon={ReceiptText} label="Pengeluaran Pending" value={pendingApprovalsCount} helper={formatRupiah(todayExpenseTotal)} tone="purple" />
        </motion.div>

        {/* Alerts Grid Section */}
        <motion.div variants={itemVariants} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {alerts.length ? alerts.map((alert, idx) => (
            <Link key={`${alert.level}-${alert.title}-${idx}`} to={alert.link} className="block w-full">
              <StatusAlert level={alert.level} title={alert.title} message={alert.message} actionLabel="Kelola" />
            </Link>
          )) : (
            <div className="md:col-span-2 xl:col-span-3">
              <StatusAlert level="success" title="Sistem normal" message="Tidak ada kendala operasional prioritas." actionLabel="Aman" />
            </div>
          )}
        </motion.div>

        {/* Main Content Layout */}
        <motion.div variants={itemVariants} className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          {/* Left Column Content */}
          <div className="space-y-6">
            <section className="glass-card bg-white/70 p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <SectionHeader title="Tren Live Penjualan" subtitle="Omzet dan estimasi laba 7 hari terakhir">
                <span className="rounded-[var(--radius-button)] border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--color-text-secondary)]">7 Hari Terakhir</span>
              </SectionHeader>
              <div className="h-[310px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ left: -18, right: 8, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="omzetGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#4c694d" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#4c694d" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="labaGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#608261" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#608261" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={(value) => `Rp ${Math.round(value / 1000000)}jt`} />
                    <Tooltip formatter={(value) => formatRupiah(value)} contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-glass)', backdropFilter: 'blur(10px)' }} />
                    <Area type="monotone" dataKey="omzet" name="Omzet" stroke="#4c694d" strokeWidth={3} fill="url(#omzetGradient)" />
                    <Area type="monotone" dataKey="laba" name="Laba" stroke="#608261" strokeWidth={2.5} fill="url(#labaGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="glass-card bg-white/70 p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <SectionHeader title="Kas Usaha" subtitle="Saldo akun keuangan dan rekonsiliasi terbaru" />
              <div className="grid gap-3.5 md:grid-cols-4 mt-4">
                <div className="rounded-[var(--radius-card)] bg-[var(--color-band-4)] p-4 md:col-span-1 border border-[var(--color-border)]">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">Ekspektasi Laci</p>
                  <p className="mt-2 font-mono text-lg font-black text-[var(--color-band-1)]">{formatRupiah(systemExpectedCash)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">{todaySession?.status === 'closed' ? 'Kas sudah ditutup' : 'Shift berjalan'}</p>
                </div>
                {(cashAccounts || []).slice(0, 3).map((account) => (
                  <div key={account.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">{account.name}</p>
                    <p className="mt-2 font-mono text-lg font-black text-[var(--color-text-primary)]">{formatRupiah(account.balance || 0)}</p>
                    <p className="mt-1 truncate text-[11px] font-semibold text-[var(--color-text-muted)]">{account.description || 'Akun aktif'}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-card bg-white/70 p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <SectionHeader title="Status Partner & Shift" subtitle="Ringkasan pengerjaan operasional hari ini" />
              <div className="overflow-x-auto mt-4">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Partner / Outlet</th>
                      <th>Omzet Hari Ini</th>
                      <th>Status Tutup Kas</th>
                      <th>Catatan Harian</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-bold">Ruang Tengah Coffee</td>
                      <td className="font-mono font-bold text-[var(--color-band-1)]">{formatRupiah(summary.totalOmzet || 0)}</td>
                      <td>
                        <span className={`badge ${todaySession?.status === 'closed' ? 'badge-success' : 'badge-danger'}`}>
                          {todaySession?.status === 'closed' ? 'Selesai' : 'Shift Berjalan'}
                        </span>
                      </td>
                      <td className="text-[var(--color-text-secondary)] font-medium">{todayNote ? 'Ada Catatan' : 'Tidak ada'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right Column Content */}
          <div className="space-y-6">
            <section className="glass-card bg-white/70 p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <SectionHeader title="Metode Pembayaran" subtitle="Rasio transaksi masuk hari ini" />
              <div className="space-y-3.5 mt-4">
                {paymentRows.map((row) => {
                  const pct = Math.round((row.value / totalPayment) * 100);
                  return (
                    <div key={row.label}>
                      <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                        <span>{row.label}</span>
                        <span className="font-mono text-[var(--color-text-secondary)]">{pct}% ({formatRupiah(row.value)})</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="glass-card bg-white/70 p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <SectionHeader title="Menu Terlaris" subtitle="Top 5 menu terjual hari ini" />
              <div className="space-y-2 mt-4">
                {(summary.menuTerlaris || []).slice(0, 5).map((menu, index) => {
                  const product = (products || []).find((candidate) => candidate.name === menu.name) || { name: menu.name };
                  return (
                    <div key={menu.name} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-band-4)] text-[10px] font-black text-[var(--color-band-1)]">{index + 1}</span>
                      <ProductThumb product={product} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black text-[var(--color-text-primary)]">{menu.name}</p>
                        <p className="font-mono text-[11px] font-bold text-[var(--color-text-muted)]">{menu.qty} cup</p>
                      </div>
                    </div>
                  );
                })}
                {(!summary.menuTerlaris || summary.menuTerlaris.length === 0) && (
                  <EmptyState message="Belum ada menu terjual." sub="Menu terlaris akan muncul setelah transaksi" icon={<Coffee size={20} />} size="sm" />
                )}
              </div>
            </section>

            <section className="glass-card bg-white/70 p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <SectionHeader title="Catatan Partner" action={<Link className="text-xs font-bold text-[var(--color-band-1)] hover:underline" to="/owner/activity">Lihat Semua</Link>} />
              <div className="mt-4">
                {todayNote ? (
                  <div className="rounded-[var(--radius-card)] bg-[var(--color-coffee-milk)] p-3.5 text-xs font-medium leading-relaxed text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                    {todayNote.note}
                  </div>
                ) : (
                  <EmptyState message="Tidak ada catatan hari ini." sub="Partner belum membuat catatan" icon={<FileText size={20} />} size="sm" showParticles={false} />
                )}
              </div>
            </section>

            <section className="glass-card bg-white/70 p-5 rounded-2xl border border-[var(--color-border)] shadow-sm">
              <SectionHeader title="Aktivitas Terkini" />
              <div className="space-y-2 mt-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] p-2.5 bg-white">
                    <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-[var(--color-band-4)] text-[var(--color-band-1)]">
                      <Activity size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">{activity.action}</p>
                      <p className="mt-1 font-mono text-[9px] font-bold text-[var(--color-text-muted)]">{formatWaktu(activity.time)}</p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <EmptyState message="Tidak ada aktivitas hari ini." sub="Aktivitas muncul saat ada transaksi" icon={<Check size={20} />} size="sm" showParticles={false} />
                )}
              </div>
            </section>

            <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-l from-[var(--color-accent-light)]/20 to-transparent pointer-events-none" />
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">Akumulasi Usaha</p>
              <p className="mt-2 font-mono text-2xl font-black text-success">{formatRupiah(totalKeuntunganKeseluruhan)}</p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)] leading-normal">Total keuntungan bersih dihitung dari akumulasi omzet dikurangi HPP dan pengeluaran valid.</p>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
