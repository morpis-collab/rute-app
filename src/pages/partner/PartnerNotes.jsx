import { useState } from 'react';
import { Check } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useAuthStore from '../../store/useAuthStore';

export default function PartnerNotes() {
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const { dailyNotes, addDailyNote } = useAppStore();
  const { user } = useAuthStore();

  const handleSave = () => {
    if (!note.trim()) return;
    addDailyNote(note, user?.name || 'Partner');
    setSaved(true);
    setNote('');
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <PageWrapper title="Catatan" subtitle="Laporan & kendala hari ini">
      {saved && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-success)] text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 text-sm font-medium slide-in">
          <Check size={16} /> Disimpan
        </div>
      )}

      <div className="mb-4">
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Tulis singkat..."
          rows={4}
          className="w-full p-3 rounded border border-[var(--color-border)] text-sm focus:outline-none focus:border-[var(--color-accent-primary)] resize-none"
        />
        <div className="flex gap-2 mt-2 flex-wrap">
          {['Ramai', 'Sepi', 'Bahan Habis', 'Alat Rusak'].map(tag => (
            <button key={tag} onClick={() => setNote(prev => prev + (prev ? ', ' : '') + tag)} className="px-2 py-1 border border-[var(--color-border)] rounded text-[10px] text-[var(--color-text-secondary)] hover:bg-[#F5F5F5]">
              {tag}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleSave} className="w-full btn btn-primary mb-6">Simpan Catatan</button>

      <h3 className="text-xs font-semibold mb-2 text-[var(--color-text-muted)] uppercase tracking-wider">Histori</h3>
      <div className="bg-white border border-[var(--color-border)] rounded overflow-hidden">
        <ul className="divide-y divide-[var(--color-border)] text-sm">
          {dailyNotes.map(n => (
            <li key={n.date} className="p-3">
              <span className="text-[10px] font-mono text-[var(--color-text-muted)] block mb-0.5">{n.date}</span>
              <span className="text-[var(--color-text-secondary)]">{n.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </PageWrapper>
  );
}
