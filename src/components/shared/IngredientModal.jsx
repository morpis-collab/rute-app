import { useState } from 'react';

const CATEGORY_OPTIONS = [
  { value: 'bahan_baku', label: 'Bahan Baku' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'operasional', label: 'Operasional' },
  { value: 'lainnya', label: 'Lainnya' },
];

const UNIT_OPTIONS = ['gram', 'kg', 'ml', 'liter', 'pcs', 'botol', 'sachet', 'lembar', 'buah'];

export default function IngredientModal({ isOpen, onClose, onSave, ingredient }) {
  const isEditing = !!ingredient;

  const [name, setName] = useState(ingredient?.name || '');
  const [category, setCategory] = useState(ingredient?.category || 'bahan_baku');
  const [unit, setUnit] = useState(ingredient?.unit || 'gram');
  const [costPerUnit, setCostPerUnit] = useState(
    ingredient?.costPerUnit != null ? String(ingredient.costPerUnit) : ''
  );
  const [notes, setNotes] = useState(ingredient?.notes || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category,
        unit,
        costPerUnit: Number(costPerUnit || 0),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error(err);
      // Stay open on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-[var(--radius-xl)] w-full max-w-md shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-primary)] shrink-0">
          <h3 className="font-bold text-[var(--color-text-primary)]">
            {isEditing ? 'Ubah Bahan Baku' : 'Tambah Bahan Baku'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Nama */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
              Nama Bahan <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="form-input text-sm p-3 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]"
              placeholder="Contoh: Kopi Blend, Susu UHT..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Kategori + Satuan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
                Kategori
              </label>
              <select
                className="form-select text-sm p-3 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
                Satuan
              </label>
              <select
                className="form-select text-sm p-3 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Harga Modal */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
              Harga Modal per Satuan (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className="form-input text-sm p-3 font-mono w-full text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]"
              placeholder="0"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
            />
            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
              Otomatis diperbarui saat ada pembelian bahan baku yang di-link ke item ini.
            </p>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">
              Catatan (Opsional)
            </label>
            <input
              type="text"
              className="form-input text-sm p-3 w-full font-sans text-gray-800 bg-white border border-[var(--color-border)] rounded-md focus:border-[var(--color-band-1)]"
              placeholder="Contoh: Merk tertentu, spesifikasi kualitas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 text-sm font-semibold rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-gray-50 cursor-pointer min-h-[44px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-3 text-sm font-semibold rounded-xl bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-primary)]/90 cursor-pointer min-h-[44px] disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
