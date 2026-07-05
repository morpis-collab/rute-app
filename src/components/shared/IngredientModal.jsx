import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: 'bahan_baku', label: 'Bahan Baku' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'operasional', label: 'Operasional' },
  { value: 'lainnya', label: 'Lainnya' },
];

const UNIT_OPTIONS = ['gram', 'kg', 'ml', 'l', 'pcs'];

export default function IngredientModal({ isOpen, onClose, onSave, ingredient }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('bahan_baku');
  const [unit, setUnit] = useState('gram');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (ingredient) {
        setName(ingredient.name || '');
        setCategory(ingredient.category || 'bahan_baku');
        setUnit(ingredient.unit || 'gram');
        setCostPerUnit(ingredient.costPerUnit !== undefined ? String(ingredient.costPerUnit) : '');
        setNotes(ingredient.notes || '');
      } else {
        setName('');
        setCategory('bahan_baku');
        setUnit('gram');
        setCostPerUnit('');
        setNotes('');
      }
    }
  }, [ingredient, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category,
        unit,
        costPerUnit: costPerUnit === '' ? 0 : Number(costPerUnit),
        notes: notes.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Gagal menyimpan bahan baku:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm slide-in">
      <div className="bg-[var(--color-bg-card)] rounded-[var(--radius-xl)] w-full max-w-md shadow-[var(--shadow-lg)] overflow-hidden border border-[var(--color-border)]">
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
          <h3 className="font-bold text-[var(--color-text-primary)] font-display text-lg">
            {ingredient ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full h-11 w-11 flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
              Nama Bahan
            </label>
            <input
              type="text"
              className="form-input text-sm p-3 w-full"
              placeholder="Contoh: Kopi Blend"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
                Kategori
              </label>
              <select
                className="form-select text-sm p-3 w-full"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
                Unit Dasar
              </label>
              <select
                className="form-select text-sm p-3 w-full"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              >
                {UNIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
              Harga Modal (Biaya / Unit)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-secondary)] font-mono">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input text-sm p-3 pl-9 w-full font-mono"
                placeholder="0"
                value={costPerUnit}
                onChange={(event) => setCostPerUnit(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
              Catatan (Notes)
            </label>
            <textarea
              className="form-input text-sm p-3 w-full h-24 resize-none"
              placeholder="Contoh: Beli di supplier langganan"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full shadow-md disabled:opacity-60 p-3 flex items-center justify-center font-bold text-sm h-11"
            >
              {saving ? 'Menyimpan...' : ingredient ? 'Simpan Perubahan' : 'Tambah Bahan Baku'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
