import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRightLeft, BarChart3, CalendarDays, Download, Package, Receipt, Wallet } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatTanggalSingkat, formatWaktu } from '../../utils/formatters';
import { getBusinessDate, isSameBusinessDate } from '../../utils/businessDate';

const paymentMethods = ['cash', 'qris', 'transfer'];

function salePaymentBreakdown(sale) {
  if (sale?.paymentBreakdown && typeof sale.paymentBreakdown === 'object') {
    return {
      cash: Number(sale.paymentBreakdown.cash || 0),
      qris: Number(sale.paymentBreakdown.qris || 0),
      transfer: Number(sale.paymentBreakdown.transfer || 0),
    };
  }
  return {
    cash: sale?.paymentMethod === 'cash' ? Number(sale.total || 0) : 0,
    qris: sale?.paymentMethod === 'qris' ? Number(sale.total || 0) : 0,
    transfer: sale?.paymentMethod === 'transfer' ? Number(sale.total || 0) : 0,
  };
}

function summarizeSales(sales = []) {
  return sales.reduce((summary, sale) => {
    const breakdown = salePaymentBreakdown(sale);
    summary.omzet += Number(sale.total || 0);
    summary.count += 1;
    paymentMethods.forEach((method) => {
      summary.byMethod[method] += Number(breakdown[method] || 0);
    });
    (sale.items || []).forEach((item) => {
      const qty = Number(item.qty || 0);
      summary.cups += qty;
      summary.menu[item.name] = (summary.menu[item.name] || 0) + qty;
    });
    return summary;
  }, {
    omzet: 0,
    count: 0,
    cups: 0,
    byMethod: { cash: 0, qris: 0, transfer: 0 },
    menu: {},
  });
}

function groupBy(rows, getKey, getAmount = (item) => Number(item.total || item.amount || 0)) {
  return rows.reduce((acc, row) => {
    const key = getKey(row) || 'Lainnya';
    acc[key] = (acc[key] || 0) + getAmount(row);
    return acc;
  }, {});
}

function mapToRows(map) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}

function dateRange(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T00:00:00`);
  const limit = new Date(`${end}T00:00:00`);
  while (!Number.isNaN(cursor.getTime()) && cursor <= limit) {
    dates.push(cursor.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function isDateInRange(dateValue, start, end) {
  const value = String(dateValue || '').substring(0, 10);
  return value >= start && value <= end;
}

function accountName(cashAccounts, accountId) {
  const account = cashAccounts.find((item) => String(item.id) === String(accountId));
  return account?.name || '-';
}

function isVaultAccount(account) {
  return /brankas/i.test(String(account?.name || account?.id || ''));
}

function accountDelta(tx, accountId) {
  const id = String(accountId);
  const amount = Number(tx.amount || 0);
  if (tx.type === 'transfer') {
    if (String(tx.toAccountId) === id) return amount;
    if (String(tx.fromAccountId) === id) return -amount;
    return 0;
  }
  if (String(tx.accountId) !== id) return 0;
  if (tx.type === 'in') return amount;
  if (tx.type === 'out') return -amount;
  if (tx.type === 'koreksi') return tx.adjustmentType === 'minus' ? -amount : amount;
  return 0;
}

export default function OwnerReports() {
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(getBusinessDate());
  const [startDate, setStartDate] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return start.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
  });
  const [endDate, setEndDate] = useState(getBusinessDate());
  const [showToast, setShowToast] = useState(false);

  const sales = useAppStore((state) => state.sales);
  const expenses = useAppStore((state) => state.expenses);
  const cashSessions = useAppStore((state) => state.cashSessions);
  const cashAccounts = useAppStore((state) => state.cashAccounts);
  const cashTransactions = useAppStore((state) => state.cashTransactions);

  const vaultAccountIds = useMemo(() => (
    (cashAccounts || []).filter(isVaultAccount).map((account) => String(account.id))
  ), [cashAccounts]);

  const daily = useMemo(() => {
    const daySales = (sales || []).filter((sale) => isSameBusinessDate(sale.date, selectedDate));
    const dayExpenses = (expenses || []).filter((expense) => isSameBusinessDate(expense.date, selectedDate) && expense.status !== 'rejected');
    const dayTransactions = (cashTransactions || []).filter((tx) => isSameBusinessDate(tx.date, selectedDate));
    const summary = summarizeSales(daySales);
    const session = (cashSessions || []).find((item) => item.date === selectedDate);
    const expenseByAccount = mapToRows(groupBy(dayExpenses, (expense) => accountName(cashAccounts, expense.cashAccountId)));
    const vaultTransactions = dayTransactions.filter((tx) => (
      vaultAccountIds.some((id) => [tx.accountId, tx.fromAccountId, tx.toAccountId].some((value) => String(value || '') === id))
    ));
    const menuRows = mapToRows(summary.menu);

    return {
      daySales,
      dayExpenses,
      dayTransactions,
      summary,
      session,
      expenseByAccount,
      vaultTransactions,
      menuRows,
    };
  }, [sales, expenses, cashTransactions, cashSessions, cashAccounts, selectedDate, vaultAccountIds]);

  const period = useMemo(() => {
    const normalizedEnd = endDate < startDate ? startDate : endDate;
    const days = dateRange(startDate, normalizedEnd);
    const periodSales = (sales || []).filter((sale) => isDateInRange(sale.date, startDate, normalizedEnd));
    const periodExpenses = (expenses || []).filter((expense) => isDateInRange(expense.date, startDate, normalizedEnd) && expense.status !== 'rejected');
    const periodTransactions = (cashTransactions || []).filter((tx) => isDateInRange(tx.date, startDate, normalizedEnd));
    const summary = summarizeSales(periodSales);
    const expenseByCategory = mapToRows(groupBy(periodExpenses, (expense) => String(expense.category || 'lainnya').replace('_', ' ')));
    const expenseByAccount = mapToRows(groupBy(periodExpenses, (expense) => accountName(cashAccounts, expense.cashAccountId)));
    const menuRows = mapToRows(summary.menu);
    const trend = days.map((date) => {
      const daySummary = summarizeSales(periodSales.filter((sale) => isSameBusinessDate(sale.date, date)));
      const dayExpenses = periodExpenses
        .filter((expense) => isSameBusinessDate(expense.date, date))
        .reduce((sum, expense) => sum + Number(expense.total || 0), 0);
      return {
        date,
        label: formatTanggalSingkat(`${date}T12:00:00.000Z`),
        omzet: daySummary.omzet,
        cash: daySummary.byMethod.cash,
        pengeluaran: dayExpenses,
      };
    });
    const vaultDeltas = (cashAccounts || [])
      .filter(isVaultAccount)
      .map((account) => ({
        account,
        delta: periodTransactions.reduce((sum, tx) => sum + accountDelta(tx, account.id), 0),
      }));

    return {
      endDate: normalizedEnd,
      periodSales,
      periodExpenses,
      periodTransactions,
      summary,
      expenseByCategory,
      expenseByAccount,
      menuRows,
      trend,
      vaultDeltas,
    };
  }, [sales, expenses, cashTransactions, cashAccounts, startDate, endDate]);

  const exportCsv = () => {
    const rows = activeTab === 'daily'
      ? [
        ['Bagian', 'Nama', 'Nominal/Jumlah'],
        ['Penjualan', 'Omzet', daily.summary.omzet],
        ['Penjualan', 'Cash', daily.summary.byMethod.cash],
        ['Penjualan', 'QRIS', daily.summary.byMethod.qris],
        ['Penjualan', 'Transfer', daily.summary.byMethod.transfer],
        ['Kas', 'Cash aktual laci', daily.session?.closingCash ?? 'Belum tutup'],
        ['Kas', 'Selisih laci', daily.session?.difference ?? 'Belum tutup'],
        ...daily.expenseByAccount.map((row) => ['Pengeluaran per sumber dana', row.label, row.value]),
        ...daily.menuRows.map((row) => ['Menu terjual', row.label, row.value]),
      ]
      : [
        ['Bagian', 'Nama', 'Nominal/Jumlah'],
        ['Penjualan', 'Omzet periode', period.summary.omzet],
        ['Penjualan', 'Cash periode', period.summary.byMethod.cash],
        ['Penjualan', 'QRIS periode', period.summary.byMethod.qris],
        ['Penjualan', 'Transfer periode', period.summary.byMethod.transfer],
        ...period.expenseByCategory.map((row) => ['Pengeluaran per kategori', row.label, row.value]),
        ...period.expenseByAccount.map((row) => ['Pengeluaran per sumber dana', row.label, row.value]),
        ...period.vaultDeltas.map((row) => ['Perubahan brankas', row.account.name, row.delta]),
      ];

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeTab === 'daily'
      ? `laporan_harian_rute_${selectedDate}.csv`
      : `laporan_periode_rute_${startDate}_${period.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  return (
    <PageWrapper title="Laporan Kas" subtitle="Pantau kas aktual, laci, brankas, dan arus uang usaha">
      {showToast && (
        <div className="fixed right-4 top-16 z-50 rounded-xl bg-[var(--color-accent-green)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-md)]">
          Laporan CSV berhasil diunduh
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-white p-1 shadow-sm">
          {[
            { id: 'daily', label: 'Harian' },
            { id: 'period', label: 'Periode' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-xs font-black transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--color-band-4)] text-[var(--color-band-1)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={exportCsv} className="btn btn-secondary bg-white text-xs">
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {activeTab === 'daily' ? (
        <DailyReport
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          daily={daily}
          cashAccounts={cashAccounts}
        />
      ) : (
        <PeriodReport
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          period={period}
        />
      )}
    </PageWrapper>
  );
}

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[var(--color-text-muted)]">
        <Icon size={16} />
        <p className="text-[10px] font-extrabold uppercase tracking-wider">{label}</p>
      </div>
      <p className="font-mono text-xl font-black text-[var(--color-text-primary)]">{value}</p>
      {helper && <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">{helper}</p>}
    </div>
  );
}

function DailyReport({ selectedDate, setSelectedDate, daily, cashAccounts }) {
  const session = daily.session;
  const statusLabel = session?.status === 'closed' ? 'Sudah tutup' : 'Belum tutup';
  const difference = Number(session?.difference || 0);

  return (
    <div className="space-y-6">
      <section className="glass-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[var(--color-band-1)]">
            <CalendarDays size={18} />
            <h3 className="text-sm font-black text-[var(--color-text-primary)]">Laporan harian</h3>
          </div>
          <p className="text-xs font-semibold text-[var(--color-text-muted)]">Cocokkan rekap penjualan, uang laci, dan mutasi brankas pada satu tanggal.</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 font-mono text-sm font-bold focus:border-[var(--color-band-1)] focus:outline-none"
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Omzet tercatat" value={formatRupiah(daily.summary.omzet)} helper={`${daily.summary.count} rekap / ${daily.summary.cups} cup`} />
        <StatCard icon={BarChart3} label="Cash penjualan" value={formatRupiah(daily.summary.byMethod.cash)} helper="Masuk ke laci kasir" />
        <StatCard icon={Receipt} label="Cash aktual laci" value={session ? formatRupiah(session.closingCash || 0) : '-'} helper={statusLabel} />
        <StatCard icon={ArrowRightLeft} label="Selisih kas" value={session ? formatRupiah(Math.abs(difference)) : '-'} helper={difference === 0 ? 'Seimbang' : difference > 0 ? 'Lebih dari sistem' : 'Kurang dari sistem'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-card p-5">
          <h3 className="mb-4 text-sm font-black text-[var(--color-text-primary)]">Pembayaran dan status laci</h3>
          <div className="space-y-3">
            {[
              ['Cash / Tunai', daily.summary.byMethod.cash],
              ['QRIS', daily.summary.byMethod.qris],
              ['Transfer', daily.summary.byMethod.transfer],
              ['Kas seharusnya', session?.expectedCash],
              ['Kas aktual', session?.closingCash],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 text-sm last:border-0">
                <span className="font-semibold text-[var(--color-text-secondary)]">{label}</span>
                <span className="font-mono font-black text-[var(--color-text-primary)]">{value == null ? '-' : formatRupiah(value)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card p-5">
          <h3 className="mb-4 text-sm font-black text-[var(--color-text-primary)]">Pengeluaran per sumber dana</h3>
          <div className="space-y-2">
            {daily.expenseByAccount.map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm">
                <span className="font-bold text-[var(--color-text-secondary)]">{row.label}</span>
                <span className="font-mono font-black text-[var(--color-accent-red)]">{formatRupiah(row.value)}</span>
              </div>
            ))}
            {daily.expenseByAccount.length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs font-bold text-[var(--color-text-muted)]">
                Tidak ada pengeluaran pada tanggal ini.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card p-5">
          <h3 className="mb-4 text-sm font-black text-[var(--color-text-primary)]">Menu terjual</h3>
          <div className="space-y-2">
            {daily.menuRows.map((row, index) => (
              <div key={row.label} className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2 last:border-0">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-band-4)] text-xs font-black text-[var(--color-band-1)]">{index + 1}</span>
                <span className="flex-1 text-sm font-bold text-[var(--color-text-primary)]">{row.label}</span>
                <span className="font-mono text-sm font-black">{row.value} cup</span>
              </div>
            ))}
            {daily.menuRows.length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs font-bold text-[var(--color-text-muted)]">Belum ada menu terjual.</p>
            )}
          </div>
        </section>

        <section className="glass-card p-5">
          <h3 className="mb-4 text-sm font-black text-[var(--color-text-primary)]">Mutasi brankas hari ini</h3>
          <div className="space-y-2">
            {daily.vaultTransactions.map((tx) => (
              <div key={tx.id} className="rounded-xl border border-[var(--color-border)] bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-[var(--color-text-primary)]">{tx.description}</p>
                    <p className="mt-1 text-[10px] font-semibold text-[var(--color-text-muted)]">
                      {formatWaktu(tx.date)} - {tx.type === 'transfer'
                        ? `${accountName(cashAccounts, tx.fromAccountId)} ke ${accountName(cashAccounts, tx.toAccountId)}`
                        : accountName(cashAccounts, tx.accountId)}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-black text-[var(--color-band-1)]">{formatRupiah(tx.amount)}</span>
                </div>
              </div>
            ))}
            {daily.vaultTransactions.length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs font-bold text-[var(--color-text-muted)]">Belum ada mutasi brankas.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PeriodReport({ startDate, setStartDate, endDate, setEndDate, period }) {
  const totalExpenses = period.periodExpenses.reduce((sum, expense) => sum + Number(expense.total || 0), 0);

  return (
    <div className="space-y-6">
      <section className="glass-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h3 className="text-sm font-black text-[var(--color-text-primary)]">Laporan periode</h3>
          <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">Lihat tren uang masuk, pengeluaran, dan perubahan brankas antar tanggal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 font-mono text-sm font-bold focus:border-[var(--color-band-1)] focus:outline-none" />
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 font-mono text-sm font-bold focus:border-[var(--color-band-1)] focus:outline-none" />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Omzet periode" value={formatRupiah(period.summary.omzet)} helper={`${period.periodSales.length} rekap`} />
        <StatCard icon={BarChart3} label="Cash masuk" value={formatRupiah(period.summary.byMethod.cash)} helper="Dari penjualan tunai" />
        <StatCard icon={Receipt} label="Pengeluaran" value={formatRupiah(totalExpenses)} helper={`${period.periodExpenses.length} catatan`} />
        <StatCard icon={Package} label="Total cup" value={`${period.summary.cups} cup`} helper="Akumulasi menu terjual" />
      </div>

      <section className="glass-card p-5">
        <h3 className="mb-4 text-sm font-black text-[var(--color-text-primary)]">Tren kas dan penjualan</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={period.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatRupiah(value)} />
              <Bar dataKey="omzet" name="Omzet" fill="var(--color-band-1)" radius={[5, 5, 0, 0]} />
              <Bar dataKey="cash" name="Cash" fill="var(--color-accent-green)" radius={[5, 5, 0, 0]} />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill="var(--color-accent-red)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <ReportList title="Pengeluaran per kategori" rows={period.expenseByCategory} valueFormatter={formatRupiah} empty="Belum ada pengeluaran." />
        <ReportList title="Pengeluaran per sumber dana" rows={period.expenseByAccount} valueFormatter={formatRupiah} empty="Belum ada sumber dana terpakai." />
        <ReportList title="Menu terlaris" rows={period.menuRows.slice(0, 8)} valueFormatter={(value) => `${value} cup`} empty="Belum ada menu terjual." />
      </div>

      <section className="glass-card p-5">
        <h3 className="mb-4 text-sm font-black text-[var(--color-text-primary)]">Perubahan brankas selama periode</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {period.vaultDeltas.map(({ account, delta }) => (
            <div key={account.id} className="rounded-xl border border-[var(--color-border)] bg-white p-4">
              <p className="text-xs font-black text-[var(--color-text-primary)]">{account.name}</p>
              <p className={`mt-2 font-mono text-lg font-black ${delta < 0 ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-accent-green)]'}`}>
                {delta < 0 ? '-' : '+'}{formatRupiah(Math.abs(delta))}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[var(--color-text-muted)]">Delta dari mutasi periode</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportList({ title, rows, valueFormatter, empty }) {
  return (
    <section className="glass-card p-5">
      <h3 className="mb-4 text-sm font-black text-[var(--color-text-primary)]">{title}</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm">
            <span className="min-w-0 truncate font-bold text-[var(--color-text-secondary)]">{row.label}</span>
            <span className="ml-3 font-mono font-black text-[var(--color-text-primary)]">{valueFormatter(row.value)}</span>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs font-bold text-[var(--color-text-muted)]">{empty}</p>
        )}
      </div>
    </section>
  );
}
