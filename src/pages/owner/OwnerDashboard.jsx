import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatTanggalSingkat, getGreeting } from '../../utils/formatters';
import { getBusinessDate } from '../../utils/businessDate';
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

function KpiCard({ icon: Icon, title, value, helperText, tone = 'green' }) {
  const toneClasses = {
    green: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    red: 'bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-700 dark:text-rose-400',
    blue: 'bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30 text-blue-700 dark:text-blue-400',
    sage: 'bg-[var(--color-band-4)] border-[var(--color-border)] text-[var(--color-band-1)]',
  };

  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        <span className={`rounded-full p-2.5 ${toneClasses[tone] || toneClasses.sage}`}>
          <Icon size={20} />
        </span>
      </div>
      <h3 className="mt-4 text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">{title}</h3>
      <p className="mt-1 font-mono text-2xl font-black text-[var(--color-text-primary)]">{value}</p>
      {helperText && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)] font-semibold">{helperText}</p>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  const wallets = useAppStore((state) => state.wallets);
  const incomes = useAppStore((state) => state.incomes);
  const expenses = useAppStore((state) => state.expenses);
  const transfers = useAppStore((state) => state.transfers);
  const loadRemoteData = useAppStore((state) => state.loadRemoteData);
  const apiStatus = useAppStore((state) => state.apiStatus);

  useEffect(() => {
    loadRemoteData().catch((err) => {
      console.error('Failed to load remote data:', err);
    });
  }, [loadRemoteData]);

  // Current Month calculations
  const businessDate = getBusinessDate();
  const currentMonth = businessDate.substring(0, 7); // YYYY-MM
  const monthName = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const totalSaldoKas = (wallets || []).reduce((sum, w) => sum + Number(w.balance || 0), 0);

  const totalPemasukan = (incomes || [])
    .filter((inc) => inc.date && inc.date.substring(0, 7) === currentMonth)
    .reduce((sum, inc) => sum + Number(inc.amount || 0), 0);

  const totalPengeluaran = (expenses || [])
    .filter((exp) => exp.date && exp.date.substring(0, 7) === currentMonth && exp.status !== 'rejected')
    .reduce((sum, exp) => sum + Number(exp.amount || exp.total || 0), 0);

  const arusKasBersih = totalPemasukan - totalPengeluaran;

  // Last 7 days trend calculations
  const trendData = Array.from({ length: 7 }, (_, index) => {
    const date = dateKey(6 - index);
    const dayIncomes = (incomes || []).filter((inc) => inc.date && inc.date.substring(0, 10) === date);
    const dayExpenses = (expenses || []).filter((exp) => exp.date && exp.date.substring(0, 10) === date && exp.status !== 'rejected');

    const pemasukan = dayIncomes.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
    const pengeluaran = dayExpenses.reduce((sum, exp) => sum + Number(exp.amount || exp.total || 0), 0);

    return {
      date,
      label: shortDateLabel(date),
      pemasukan,
      pengeluaran,
    };
  });

  const getWalletName = (walletId) => {
    const wallet = wallets.find((w) => String(w.id) === String(walletId));
    return wallet ? wallet.name : 'Wallet Lain';
  };

  // Combined transactions
  const allTransactions = [
    ...(incomes || []).map((inc) => ({
      id: inc.id,
      type: 'income',
      date: inc.date || inc.createdAt,
      amount: Number(inc.amount || 0),
      walletName: getWalletName(inc.walletId),
      category: inc.category || 'Pemasukan',
      description: inc.notes || '-',
    })),
    ...(expenses || []).map((exp) => ({
      id: exp.id,
      type: 'expense',
      date: exp.date || exp.createdAt,
      amount: Number(exp.amount || exp.total || 0),
      walletName: getWalletName(exp.walletId),
      category: exp.category || 'Pengeluaran',
      description: exp.description || '-',
    })),
    ...(transfers || []).map((trf) => ({
      id: trf.id,
      type: 'transfer',
      date: trf.date || trf.createdAt,
      amount: Number(trf.amount || 0),
      walletName: `${getWalletName(trf.fromWalletId)} → ${getWalletName(trf.toWalletId)}`,
      category: 'Transfer Saldo',
      description: trf.description || '-',
    })),
  ];

  const sortedTransactions = allTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getTransactionBadge = (type) => {
    switch (type) {
      case 'income':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Pemasukan
          </span>
        );
      case 'expense':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/20 dark:text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Pengeluaran
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Transfer
          </span>
        );
      default:
        return null;
    }
  };

  const getAmountDisplay = (tx) => {
    if (tx.type === 'income') {
      return <span className="font-mono font-bold text-emerald-600">+{formatRupiah(tx.amount)}</span>;
    }
    if (tx.type === 'expense') {
      return <span className="font-mono font-bold text-rose-600">-{formatRupiah(tx.amount)}</span>;
    }
    return <span className="font-mono font-bold text-blue-600">{formatRupiah(tx.amount)}</span>;
  };

  const handleRefresh = () => {
    loadRemoteData().catch(() => {});
  };

  return (
    <PageWrapper 
      title="Dashboard Keuangan" 
      subtitle={`${getGreeting()}, Owner. Berikut ringkasan arus kas RUTE Coffee.`}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header Action Row */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
            Tanggal Bisnis: <span className="font-mono bg-[var(--color-band-4)] px-2.5 py-1 rounded-[var(--radius-sm)] border border-[var(--color-border)]">{businessDate}</span>
          </p>
          <button
            onClick={handleRefresh}
            disabled={apiStatus === 'loading'}
            className="flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-band-4)] hover:text-[var(--color-band-1)] active:scale-95 transition-all duration-150 cursor-pointer min-h-11 min-w-11"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw size={16} className={apiStatus === 'loading' ? 'animate-spin' : ''} />
            <span>{apiStatus === 'loading' ? 'Memuat...' : 'Refresh'}</span>
          </button>
        </div>

        {/* KPI Tiles Row */}
        <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard 
            icon={Wallet} 
            title="Total Saldo Kas" 
            value={formatRupiah(totalSaldoKas)} 
            helperText="Akumulasi semua wallet" 
            tone="sage" 
          />
          <KpiCard 
            icon={ArrowUpRight} 
            title="Total Pemasukan" 
            value={formatRupiah(totalPemasukan)} 
            helperText={`Bulan ${monthName}`} 
            tone="green" 
          />
          <KpiCard 
            icon={ArrowDownRight} 
            title="Total Pengeluaran" 
            value={formatRupiah(totalPengeluaran)} 
            helperText={`Bulan ${monthName}`} 
            tone="red" 
          />
          <KpiCard 
            icon={arusKasBersih >= 0 ? TrendingUp : TrendingDown} 
            title="Arus Kas Bersih" 
            value={formatRupiah(arusKasBersih)} 
            helperText="Pemasukan - Pengeluaran" 
            tone={arusKasBersih >= 0 ? 'green' : 'red'} 
          />
        </motion.div>

        {/* Main Content Layout */}
        <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-[1.8fr_1.2fr]">
          {/* Left Column: Trend & Wallets */}
          <div className="space-y-6">
            {/* Recharts comparison graph */}
            <section className="glass-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">Tren Arus Kas</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">Perbandingan Pemasukan vs Pengeluaran (7 hari bisnis terakhir)</p>
                </div>
                <span className="rounded-[var(--radius-button)] border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-text-secondary)]">7 Hari Terakhir</span>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pemasukanGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-band-1)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--color-band-1)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="pengeluaranGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent-red)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--color-accent-red)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                      axisLine={false}
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}jt`;
                        if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}rb`;
                        return `Rp ${value}`;
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => formatRupiah(value)} 
                      contentStyle={{ 
                        borderRadius: 12, 
                        border: '1px solid var(--color-border)', 
                        backgroundColor: 'var(--color-bg-glass)', 
                        backdropFilter: 'blur(10px)',
                        fontSize: '12px'
                      }} 
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area 
                      type="monotone" 
                      dataKey="pemasukan" 
                      name="Pemasukan" 
                      stroke="var(--color-band-1)" 
                      strokeWidth={3} 
                      fill="url(#pemasukanGrad)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pengeluaran" 
                      name="Pengeluaran" 
                      stroke="var(--color-accent-red)" 
                      strokeWidth={3} 
                      fill="url(#pengeluaranGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* List of wallets */}
            <section className="glass-card p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">Daftar Dompet & Kas</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Saldo masing-masing akun keuangan</p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {wallets.map((wallet) => (
                  <div 
                    key={wallet.id} 
                    className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-gradient-to-br from-white to-[var(--color-band-4)] p-5 hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-l from-[var(--color-band-1)]/5 to-transparent pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-[var(--color-band-1)]/10 p-2.5 text-[var(--color-band-1)] group-hover:scale-110 transition-transform duration-200">
                        <Wallet size={20} />
                      </span>
                      {wallet.isDefault && (
                        <span className="rounded-[var(--radius-badge)] bg-[var(--color-band-1)] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          Utama
                        </span>
                      )}
                    </div>
                    <h4 className="mt-4 text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">{wallet.name}</h4>
                    <p className="mt-1 font-mono text-xl font-black text-[var(--color-text-primary)]">{formatRupiah(wallet.balance || 0)}</p>
                    {wallet.description && (
                      <p className="mt-2 text-xs text-[var(--color-text-muted)] truncate">{wallet.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Transactions & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions Panel */}
            <section className="glass-card p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">Aksi Cepat</h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)] mb-4">Catat transaksi keuangan dengan cepat</p>
              <div className="grid grid-cols-3 gap-3">
                <Link 
                  to="/owner/incomes" 
                  className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-emerald-100 bg-emerald-50/50 p-4 text-center hover:bg-emerald-50 transition-all duration-200 group h-24 min-h-11"
                >
                  <span className="rounded-full bg-emerald-100 p-2 text-emerald-700 group-hover:scale-110 transition-transform duration-200">
                    <ArrowUpRight size={18} />
                  </span>
                  <span className="mt-2 text-xs font-bold text-emerald-800">Pemasukan</span>
                </Link>
                <Link 
                  to="/owner/expenses" 
                  className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-rose-100 bg-rose-50/50 p-4 text-center hover:bg-rose-50 transition-all duration-200 group h-24 min-h-11"
                >
                  <span className="rounded-full bg-rose-100 p-2 text-rose-700 group-hover:scale-110 transition-transform duration-200">
                    <ArrowDownRight size={18} />
                  </span>
                  <span className="mt-2 text-xs font-bold text-rose-800">Pengeluaran</span>
                </Link>
                <Link 
                  to="/owner/cash" 
                  className="flex flex-col items-center justify-center rounded-[var(--radius-xl)] border border-blue-100 bg-blue-50/50 p-4 text-center hover:bg-blue-50 transition-all duration-200 group h-24 min-h-11"
                >
                  <span className="rounded-full bg-blue-100 p-2 text-blue-700 group-hover:scale-110 transition-transform duration-200">
                    <ArrowLeftRight size={18} />
                  </span>
                  <span className="mt-2 text-xs font-bold text-blue-800">Transfer</span>
                </Link>
              </div>
            </section>

            {/* Recent Transactions List */}
            <section className="glass-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">Transaksi Terkini</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">5 transaksi terakhir yang dilakukan</p>
                </div>
                <Link 
                  to="/owner/cash" 
                  className="text-xs font-bold text-[var(--color-band-1)] hover:underline flex items-center justify-center min-h-11 px-2"
                >
                  Lihat Semua
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--color-border)]">
                  <thead>
                    <tr className="text-left text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      <th className="pb-3 pt-2">Tipe</th>
                      <th className="pb-3 pt-2">Tanggal</th>
                      <th className="pb-3 pt-2">Nominal</th>
                      <th className="pb-3 pt-2">Wallet</th>
                      <th className="pb-3 pt-2">Kategori/Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {sortedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[var(--color-band-4)]/50 transition-colors duration-150">
                        <td className="py-3 pr-2">{getTransactionBadge(tx.type)}</td>
                        <td className="py-3 px-2 font-semibold text-[var(--color-text-primary)]">
                          {formatTanggalSingkat(tx.date)}
                        </td>
                        <td className="py-3 px-2">{getAmountDisplay(tx)}</td>
                        <td className="py-3 px-2 text-[10px] font-bold text-[var(--color-text-secondary)]">
                          {tx.walletName}
                        </td>
                        <td className="py-3 pl-2">
                          <div className="font-bold text-[var(--color-text-primary)]">{tx.category}</div>
                          {tx.description && tx.description !== '-' && (
                            <div className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[120px]" title={tx.description}>
                              {tx.description}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {sortedTransactions.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-xs text-[var(--color-text-muted)]">
                          Belum ada transaksi tercatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
