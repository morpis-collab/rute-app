import { useState } from 'react';
import { X } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'bahan_baku', label: 'Bahan Baku' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'operasional', label: 'Operasional' },
  { value: 'lainnya', label: 'Lainnya' },
];

const UNIT_OPTIONS = ['gram', 'kg', 'ml', 'l', 'pcs'];

export default function IngredientModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('bahan_baku');
  const [unit, setUnit] = useState('gram');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setCategory('bahan_baku');
    setUnit('gram');
    setStock('');
    setMinStock('');
    setCostPerUnit('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category,
        unit,
        stock: Number(stock || 0),
        minStock: Number(minStock || 0),
        costPerUnit: Number(costPerUnit || 0),
      });
      resetForm();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm slide-in">
      <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-md shadow-[var(--shadow-lg)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-primary)]">
          <h3 className="font-bold text-[var(--color-text-primary)]">Tambah Bahan Baku</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]" title="Tutup">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Nama Bahan</label>
            <input
              type="text"
              className="form-input text-sm p-2 w-full"
              placeholder="Contoh: Kopi Blend"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Kategori</label>
              <select className="form-select text-sm p-2 w-full" value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Unit Dasar</label>
              <select className="form-select text-sm p-2 w-full" value={unit} onChange={(event) => setUnit(event.target.value)}>
                {UNIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Stok Awal</label>
              <input type="number" min="0" step="0.001" className="form-input text-sm p-2 w-full font-mono" value={stock} onChange={(event) => setStock(event.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Min Stok</label>
              <input type="number" min="0" step="0.001" className="form-input text-sm p-2 w-full font-mono" value={minStock} onChange={(event) => setMinStock(event.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Biaya / Unit</label>
              <input type="number" min="0" step="0.01" className="form-input text-sm p-2 w-full font-mono" value={costPerUnit} onChange={(event) => setCostPerUnit(event.target.value)} />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving} className="btn btn-primary w-full shadow-md disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan Bahan Baku'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
