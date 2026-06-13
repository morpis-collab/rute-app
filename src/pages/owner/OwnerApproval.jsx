import { useState } from 'react';
import { ShieldCheck, Check, X } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import { formatRupiah, formatTanggal, getPhotoUrl } from '../../utils/formatters';
import useToastStore from '../../store/useToastStore';


export default function OwnerApproval() {
  const { expenses, updateExpenseStatus, cashSessions } = useAppStore();
  const [activePhotoUrl, setActivePhotoUrl] = useState(null);
  const list = expenses.filter(e => e.status === 'pending');

  const isDateClosed = (dateStr) => {
    if (!dateStr) return false;
    const targetDate = String(dateStr).substring(0, 10);
    return cashSessions.some(session => session.date === targetDate && session.status === 'closed');
  };

  const handleAction = (id, action) => {
    const expense = expenses.find(e => e.id === id);
    if (expense && isDateClosed(expense.date)) {
      useToastStore.getState().addToast('Gagal memproses: Kas pada tanggal pengeluaran sudah ditutup.', 'error');
      return;
    }
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
          {list.map(exp => {
            const isClosed = isDateClosed(exp.date);
            return (
              <div key={exp.id} className="kpi-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{exp.description}</span>
                  <span className="badge badge-warning">Menunggu</span>
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mb-2">
                  {formatTanggal(exp.date)} · {(exp.category || '').replace('_',' ')} · Dicatat oleh: {exp.user || 'Sistem'}
                </div>
                
                <div className="space-y-1 my-2">
                  {(exp.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        {item.name} x{item.qty} {item.unit || 'pcs'}
                        {item.addsStock && (
                          <span className="text-[9px] px-1 ml-1.5 rounded bg-success/10 text-success font-semibold border border-success/20">
                            + {item.stockQty} {item.stockUnit || item.unit} stok
                          </span>
                        )}
                      </span>
                      <span className="font-mono">{formatRupiah(item.total)}</span>
                    </div>
                  ))}
                </div>

                {/* Photo Preview inside Approval Card */}
                {(exp.photoUrl || exp.proofUrl) && (
                  <div className="mt-3 mb-2 flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div 
                      onClick={() => setActivePhotoUrl(exp.photoUrl || exp.proofUrl)}
                      className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden cursor-zoom-in bg-white flex-shrink-0"
                    >
                      <img 
                        src={getPhotoUrl(exp.photoUrl || exp.proofUrl)} 
                        alt="Resi Pending" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-[var(--color-text-primary)]">Ada lampiran resi fisik</p>
                      <button 
                        onClick={() => setActivePhotoUrl(exp.photoUrl || exp.proofUrl)}
                        className="text-[var(--color-accent-primary)] font-bold hover:underline text-[10px]"
                      >
                        KLIK UNTUK LIHAT RESI
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-[var(--color-border)] pt-2 mt-2 flex items-center justify-between">
                  <span className="font-bold font-mono text-[var(--color-accent-primary)]">{formatRupiah(exp.total)}</span>
                  <div className="flex gap-2 items-center">
                    {isClosed && (
                      <span className="text-[10px] text-[var(--color-accent-red)] font-semibold bg-[#fff4ef] px-2 py-1 rounded border border-[#f0c7ba]">
                        Kas tanggal ini sudah ditutup
                      </span>
                    )}
                    <button 
                      onClick={() => handleAction(exp.id, 'reject')} 
                      disabled={isClosed}
                      className="btn btn-danger px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X size={14} /> Tolak
                    </button>
                    <button 
                      onClick={() => handleAction(exp.id, 'approve')} 
                      disabled={isClosed}
                      className="btn btn-success px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check size={14} /> Setujui
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Foto Portal */}
      {activePhotoUrl && (
        <div 
          onClick={() => setActivePhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs transition-all duration-200 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl p-2 shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
            <img 
              src={getPhotoUrl(activePhotoUrl)} 
              alt="Bukti Resi Besar" 
              className="max-w-full max-h-[80vh] object-contain rounded-lg" 
            />
            <button 
              onClick={() => setActivePhotoUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-800 shadow-md flex items-center justify-center font-bold text-sm border hover:bg-gray-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
