import { useState } from 'react';
import { createPortal } from 'react-dom';
import useAuthStore from '../../store/useAuthStore';
import { EXPENSE_CATEGORIES } from '../../utils/constants';
import { getBusinessDate } from '../../utils/businessDate';

export default function ExpenseModal({ isOpen, onClose, onSave }) {
  const { user } = useAuthStore();
  const [description, setDescription] = useState('');
  const [total, setTotal] = useState('');
  const [category, setCategory] = useState('lainnya');
  const [date, setDate] = useState(getBusinessDate());

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !total) return;

    const items = [{
      name: description,
      qty: 1,
      unit: 'pcs',
      price: Number(total),
      total: Number(total),
      addsStock: false,
    }];

    onSave({
      description,
      total: Number(total),
      category,
      items,
      date: date ? `${date}T12:00:00.000Z` : undefined,
    });

    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm slide-in">
      <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-md shadow-[var(--shadow-lg)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-primary)] shrink-0">
          <h3 className="font-bold text-[var(--color-text-primary)]">Tambah Pengeluaran</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Deskripsi</label>
            <input 
              type="text" 
              className="form-input text-sm p-2 w-full" 
              placeholder="Contoh: Beli susu sapi, token listrik..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nominal (Rp)</label>
            <input 
              type="number" 
              className="form-input text-sm p-2 font-mono w-full" 
              placeholder="0" 
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Tanggal</label>
            <input 
              type="date" 
              className="form-input text-sm p-2 w-full font-mono bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Kategori</label>
            <select className="form-select text-sm p-2 w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              {EXPENSE_CATEGORIES.filter(cat => !cat.ownerOnly || user?.role === 'owner').map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 pb-2">
            <button type="submit" className="btn btn-primary w-full shadow-md">Simpan Pengeluaran</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
