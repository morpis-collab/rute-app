import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatWaktu } from '../../utils/formatters';

export default function ActivityLog() {
  const activityLog = useAppStore(state => state.activityLog);
  const reversedLog = [...activityLog].reverse();

  return (
    <PageWrapper title="Riwayat Aktivitas" subtitle="Log perubahan dan transaksi sistem">
      <div className="glass-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="bg-[#faf6ef]">
              <tr>
                <th className="w-32">Waktu</th>
                <th className="w-24">User</th>
                <th>Modul</th>
                <th>Aksi / Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {reversedLog.map((log) => (
                <tr key={log.id}>
                  <td className="font-mono text-xs text-[var(--color-text-secondary)]">{formatWaktu(log.time)}</td>
                  <td>
                    <span className="font-semibold text-[11px] uppercase tracking-wider">{log.user}</span>
                  </td>
                  <td>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      log.type === 'kas' ? 'bg-[#e0ecf5] text-[#5a7a8f]' :
                      log.type === 'penjualan' ? 'bg-[#e8f5e4] text-[#4a7a3f]' :
                      log.type === 'pengeluaran' ? 'bg-[#fae8e0] text-[#c4705a]' :
                      'bg-[#f5efe0] text-[#c4955a]'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="text-[var(--color-text-primary)] text-sm">
                    {log.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
