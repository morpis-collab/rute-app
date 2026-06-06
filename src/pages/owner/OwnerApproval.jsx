import { ShieldCheck, Check, X } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatTanggal } from '../../utils/formatters';

export default function OwnerApproval() {
  const { expenses, updateExpenseStatus } = useAppStore();
  const list = expenses.filter(e => e.status === 'pending');

  const handleAction = (id, action) => {
    updateExpenseStatus(id, action === 'approve' ? 'approved' : 'rejected');
  };

  return (
    <PageWrapper title="Approval" subtitle="Pengeluaran yang menunggu persetujuan">
      {list.length === 0 ? (
        <div className="text-center py-12">
          <ShieldCheck size={48} className="mx-auto mb-3 text-[var(--color-success)]" />
          <p className="font-semibold">Tidak ada yang menunggu approval</p>
          <p className="text-sm text-[var(--color-text-muted)]">Semua pengeluaran sudah diproses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(exp => (
            <div key={exp.id} className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{exp.description}</span>
                <span className="badge badge-warning">Menunggu</span>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mb-2">{formatTanggal(exp.date)} · {(exp.category || '').replace('_',' ')}</div>
              {(exp.items || []).map((item, i) => (
                <div key={i} className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--color-text-secondary)]">{item.name} x{item.qty}</span>
                  <span className="font-mono">{formatRupiah(item.total)}</span>
                </div>
              ))}
              <div className="border-t border-[var(--color-border)] pt-2 mt-2 flex items-center justify-between">
                <span className="font-bold font-mono text-[var(--color-accent-primary)]">{formatRupiah(exp.total)}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleAction(exp.id, 'reject')} className="btn btn-danger px-3 py-2 text-xs"><X size={14} /> Tolak</button>
                  <button onClick={() => handleAction(exp.id, 'approve')} className="btn btn-success px-3 py-2 text-xs"><Check size={14} /> Setujui</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
