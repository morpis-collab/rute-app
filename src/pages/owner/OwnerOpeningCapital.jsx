import { useEffect, useState } from 'react';
import { Briefcase, Coins, Package, Wallet, Trash2, Plus, Loader2, Save, AlertCircle, Info } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useToastStore from '../../store/useToastStore';
import { getOpeningCapital } from '../../services/apiClient';
import { formatRupiah } from '../../utils/formatters';

export default function OwnerOpeningCapital() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const ingredients = useAppStore((state) => state.ingredients);
  const expenses = useAppStore((state) => state.expenses);
  const saveOpeningCapital = useAppStore((state) => state.saveOpeningCapital);
  const { addToast } = useToastStore();

  const [form, setForm] = useState({
    businessStartDate: '',
    cashCapital: 0,
    assetContributions: [],
    inventoryContributions: [],
    personalExcludedItems: [],
    notes: '',
  });

  // Load detailed opening capital from API on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        const res = await getOpeningCapital();
        if (res) {
          setForm({
            businessStartDate: res.businessStartDate || '',
            cashCapital: res.cashCapital || 0,
            assetContributions: res.assetContributions || [],
            inventoryContributions: [],
            personalExcludedItems: res.personalExcludedItems || [],
            notes: res.notes || '',
          });
        }
      } catch (err) {
        console.error('Gagal memuat modal awal', err);
        setError('Gagal mengambil data modal awal dari server.');
        addToast('Gagal memuat data modal awal', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [addToast]);

  // Calculate pre-operational expenses (from all expenses with category 'pra_operasional')
  const preOpExpenses = expenses.filter(e => e.category === 'pra_operasional');
  const totalPreOpExpenses = preOpExpenses.reduce((sum, e) => sum + Number(e.total || 0), 0);

  // Totals calculations
  const totalAssets = form.assetContributions.reduce((sum, item) => sum + Number(item.estimatedValue || 0), 0);
  const grandTotalCapital = Number(form.cashCapital) + totalAssets;
  const totalExcluded = form.personalExcludedItems.reduce((sum, item) => sum + Number(item.estimatedValue || 0), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      
      // Basic validation
      if (form.businessStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.businessStartDate)) {
        setError('Tanggal mulai usaha harus berformat YYYY-MM-DD');
        setSaving(false);
        return;
      }

      await saveOpeningCapital({
        businessStartDate: form.businessStartDate || null,
        cashCapital: Number(form.cashCapital),
        assetContributions: form.assetContributions,
        inventoryContributions: form.inventoryContributions,
        personalExcludedItems: form.personalExcludedItems,
        notes: form.notes,
      });

      addToast('Data modal awal berhasil disimpan!', 'success');
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan data modal awal');
      addToast('Gagal menyimpan data', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Row operations
  const addAssetRow = () => {
    setForm(prev => ({
      ...prev,
      assetContributions: [
        ...prev.assetContributions,
        { id: `ASSET-${Date.now()}-${Math.random()}`, name: '', quantity: 1, unit: 'unit', estimatedValue: 0, notes: '' }
      ]
    }));
  };

  const updateAssetRow = (id, field, value) => {
    setForm(prev => ({
      ...prev,
      assetContributions: prev.assetContributions.map(item => 
        item.id === id ? { ...item, [field]: field === 'quantity' || field === 'estimatedValue' ? Number(value) : value } : item
      )
    }));
  };

  const removeAssetRow = (id) => {
    setForm(prev => ({
      ...prev,
      assetContributions: prev.assetContributions.filter(item => item.id !== id)
    }));
  };



  const addExcludedRow = () => {
    setForm(prev => ({
      ...prev,
      personalExcludedItems: [
        ...prev.personalExcludedItems,
        { id: `EXC-${Date.now()}-${Math.random()}`, name: '', estimatedValue: 0, reason: '' }
      ]
    }));
  };

  const updateExcludedRow = (id, field, value) => {
    setForm(prev => ({
      ...prev,
      personalExcludedItems: prev.personalExcludedItems.map(item => 
        item.id === id ? { ...item, [field]: field === 'estimatedValue' ? Number(value) : value } : item
      )
    }));
  };

  const removeExcludedRow = (id) => {
    setForm(prev => ({
      ...prev,
      personalExcludedItems: prev.personalExcludedItems.filter(item => item.id !== id)
    }));
  };

  if (loading) {
    return (
      <PageWrapper title="Modal Awal & Pra-Operasional" subtitle="Inisialisasi Keuangan Usaha">
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-[var(--color-text-muted)]">
          <Loader2 size={32} className="animate-spin" />
          <p>Memuat data modal awal...</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Modal Awal & Pra-Op" subtitle="Pendataan Investasi Awal & Biaya Pra-Pembukaan">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card bg-[linear-gradient(135deg,var(--color-band-1),var(--color-band-2))] text-white border-none col-span-2 lg:col-span-1">
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1 opacity-80">Total Modal Awal</p>
          <p className="text-xl lg:text-2xl font-mono font-bold">{formatRupiah(grandTotalCapital)}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-1">
            <Coins size={14} className="text-[var(--color-accent-green)]" />
            <p className="text-[10px] uppercase tracking-wider font-semibold">Modal Kas Tunai</p>
          </div>
          <p className="text-lg font-mono text-[var(--color-text-primary)] font-bold">{formatRupiah(form.cashCapital)}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-1">
            <Briefcase size={14} className="text-[var(--color-accent-blue)]" />
            <p className="text-[10px] uppercase tracking-wider font-semibold">Total Nilai Aset</p>
          </div>
          <p className="text-lg font-mono text-[var(--color-text-primary)] font-bold">{formatRupiah(totalAssets)}</p>
        </div>
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] mb-1">
            <Wallet size={14} className="text-[var(--color-accent-red)]" />
            <p className="text-[10px] uppercase tracking-wider font-semibold">Biaya Pra-Op</p>
          </div>
          <p className="text-lg font-mono text-[var(--color-text-primary)] font-bold">{formatRupiah(totalPreOpExpenses)}</p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-border)] bg-[#faf6ef] p-4 text-xs text-[var(--color-text-secondary)] mb-6">
        <Info size={16} className="shrink-0 text-[var(--color-accent-primary)]" />
        <div className="space-y-1">
          <p className="font-semibold text-[var(--color-text-primary)]">Mengapa memisahkan Modal Awal dan Pengeluaran?</p>
          <p>Dengan mendata modal awal berupa <strong>Kas</strong> dan <strong>Aset Alat</strong> secara terpisah, sistem tidak menganggap belanja persiapan usaha sebagai kerugian bersih operasional laci kasir saat baru buka. Biaya pra-operasional habis pakai (bensin, spanduk, dll) dapat diinput di menu <strong>Pengeluaran</strong> dengan kategori <strong>Pra-Operasional / Persiapan Usaha</strong> agar terhitung terpisah.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#f0c7ba] bg-[#fff4ef] px-4 py-3 text-sm text-[#a34f39] flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tanggal & Modal Kas */}
        <div className="glass-card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Tanggal Mulai Usaha / Buka</label>
            <input 
              type="date" 
              required
              value={form.businessStartDate} 
              onChange={e => setForm(prev => ({ ...prev, businessStartDate: e.target.value }))}
              className="w-full rounded-xl border border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-band-1)] focus:outline-none"
            />
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Tanggal resmi outlet mulai beroperasi laku jual.</p>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Modal Tunai Operasional Kas (Rp)</label>
            <input 
              type="number" 
              min="0"
              required
              value={form.cashCapital} 
              onChange={e => setForm(prev => ({ ...prev, cashCapital: Number(e.target.value) }))}
              className="w-full rounded-xl border border-[var(--color-border)] p-3 font-mono text-sm focus:border-[var(--color-band-1)] focus:outline-none"
              placeholder="0"
            />
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Dana segar di laci kasir (kembalian awal) pada hari pertama buka.</p>
          </div>
        </div>

        {/* 1. Alat Usaha / Aset Tetap */}
        <div className="glass-card p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--color-coffee-latte)] flex justify-between items-center bg-[#faf6ef]">
            <div>
              <h3 className="font-bold text-[var(--color-text-primary)]">1. Alat Usaha / Aset Tetap</h3>
              <p className="text-[10px] text-[var(--color-text-muted)]">Grinder, ROK Presso, Booth, Meja, Timbangan, dll.</p>
            </div>
            <button type="button" onClick={addAssetRow} className="btn btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
              <Plus size={14} /> Tambah Aset
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--color-text-primary)]">
              <thead>
                <tr className="bg-[#faf6ef]/50 border-b border-[var(--color-border)]">
                  <th className="p-3 font-semibold">Nama Alat / Aset</th>
                  <th className="p-3 font-semibold w-20 text-center">Qty</th>
                  <th className="p-3 font-semibold w-32">Satuan</th>
                  <th className="p-3 font-semibold w-36">Estimasi Nilai (Rp)</th>
                  <th className="p-3 font-semibold">Catatan / Merek</th>
                  <th className="p-3 w-12 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {form.assetContributions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-[var(--color-text-muted)]">Belum ada aset tetap disetor. Klik "+ Tambah Aset".</td>
                  </tr>
                ) : (
                  form.assetContributions.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2">
                        <input 
                          type="text" 
                          required
                          value={item.name} 
                          onChange={e => updateAssetRow(item.id, 'name', e.target.value)}
                          placeholder="Contoh: ROK Presso GC" 
                          className="w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-band-1)] p-1 outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          min="1"
                          required
                          value={item.quantity} 
                          onChange={e => updateAssetRow(item.id, 'quantity', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-band-1)] p-1 outline-none text-center font-mono"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          required
                          value={item.unit} 
                          onChange={e => updateAssetRow(item.id, 'unit', e.target.value)}
                          placeholder="unit" 
                          className="w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-band-1)] p-1 outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          min="0"
                          required
                          value={item.estimatedValue} 
                          onChange={e => updateAssetRow(item.id, 'estimatedValue', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-band-1)] p-1 outline-none font-mono text-right"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          value={item.notes} 
                          onChange={e => updateAssetRow(item.id, 'notes', e.target.value)}
                          placeholder="Catatan merek atau kondisi" 
                          className="w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-band-1)] p-1 outline-none"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => removeAssetRow(item.id)} className="text-[var(--color-accent-red)] hover:bg-red-50 p-1 rounded">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-[#faf6ef]/30 border-t border-[var(--color-border)] flex justify-between text-xs font-semibold text-[var(--color-text-secondary)]">
            <span>Total Nilai Aset</span>
            <span className="font-mono text-[var(--color-text-primary)]">{formatRupiah(totalAssets)}</span>
          </div>
        </div>

        {/* 2. Barang Pribadi Excluded */}
        <div className="glass-card p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--color-coffee-latte)] flex justify-between items-center bg-[#faf6ef]">
            <div>
              <h3 className="font-bold text-[var(--color-text-primary)]">2. Barang Pribadi (Dikecualikan dari Modal Usaha)</h3>
              <p className="text-[10px] text-[var(--color-text-muted)]">Laptop pribadi owner, HP operasional pribadi. Hanya untuk catatan audit (tidak dihitung dalam kas/stok/laba).</p>
            </div>
            <button type="button" onClick={addExcludedRow} className="btn btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
              <Plus size={14} /> Tambah Excluded
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--color-text-primary)]">
              <thead>
                <tr className="bg-[#faf6ef]/50 border-b border-[var(--color-border)]">
                  <th className="p-3 font-semibold">Nama Barang</th>
                  <th className="p-3 font-semibold w-40">Nilai Wajar (Rp)</th>
                  <th className="p-3 font-semibold">Alasan Dikecualikan</th>
                  <th className="p-3 w-12 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {form.personalExcludedItems.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-[var(--color-text-muted)]">Belum ada barang pribadi yang dicatat.</td>
                  </tr>
                ) : (
                  form.personalExcludedItems.map((item) => (
                    <tr key={item.id}>
                      <td className="p-2">
                        <input 
                          type="text" 
                          required
                          value={item.name} 
                          onChange={e => updateExcludedRow(item.id, 'name', e.target.value)}
                          placeholder="Contoh: iPhone 13 Pribadi" 
                          className="w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-band-1)] p-1 outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          min="0"
                          required
                          value={item.estimatedValue} 
                          onChange={e => updateExcludedRow(item.id, 'estimatedValue', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-band-1)] p-1 outline-none font-mono text-right"
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          required
                          value={item.reason} 
                          onChange={e => updateExcludedRow(item.id, 'reason', e.target.value)}
                          placeholder="Contoh: Dipakai pribadi, bukan inventaris toko" 
                          className="w-full bg-transparent border-b border-transparent hover:border-[var(--color-border)] focus:border-[var(--color-band-1)] p-1 outline-none"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => removeExcludedRow(item.id)} className="text-[var(--color-accent-red)] hover:bg-red-50 p-1 rounded">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-[#faf6ef]/30 border-t border-[var(--color-border)] flex justify-between text-xs font-semibold text-[var(--color-text-secondary)]">
            <span>Total Catatan Barang Pribadi</span>
            <span className="font-mono text-[var(--color-text-primary)]">{formatRupiah(totalExcluded)}</span>
          </div>
        </div>

        {/* 3. Monitoring Biaya Pra-Operasional */}
        <div className="glass-card">
          <h3 className="font-bold text-[var(--color-text-primary)] mb-1">3. Biaya Pra-Operasional (Habis Pakai)</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mb-4">Biaya persiapan sebelum buka yang diinput secara dinamis di menu <strong>Pengeluaran</strong> berkategori <strong>Pra-Operasional / Persiapan Usaha</strong>.</p>
          
          {preOpExpenses.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-xl">
              Belum ada biaya pra-operasional yang dicatat. Input biaya baru lewat menu <a href="/owner/expenses" className="text-[var(--color-accent-primary)] font-semibold hover:underline">Pengeluaran</a> dengan memilih kategori "Pra-Operasional".
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {preOpExpenses.map(exp => (
                <div key={exp.id} className="p-2.5 rounded-lg border border-[var(--color-border)] bg-white flex justify-between items-center text-xs">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{exp.description}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{new Date(exp.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · Oleh: {exp.user}</p>
                  </div>
                  <span className="font-mono font-semibold text-[var(--color-text-primary)]">{formatRupiah(exp.total)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-between text-xs font-semibold text-[var(--color-text-secondary)] border-t border-[var(--color-border)] pt-3">
            <span>Total Biaya Pra-Operasional</span>
            <span className="font-mono text-[var(--color-text-primary)]">{formatRupiah(totalPreOpExpenses)}</span>
          </div>
        </div>

        {/* Catatan Tambahan & Tombol Simpan */}
        <div className="glass-card space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Catatan Audit Tambahan</label>
            <textarea 
              value={form.notes} 
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Catatan tambahan mengenai modal awal atau proses persiapan buka toko..." 
              className="w-full rounded-xl border border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-band-1)] focus:outline-none min-h-[80px]"
            />
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={saving} 
              className="btn btn-primary px-6 py-3 flex items-center gap-2 text-sm font-semibold shadow-lg hover:shadow-xl active:-translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Menyimpan...' : 'Simpan Modal Awal'}
            </button>
          </div>
        </div>
      </form>
    </PageWrapper>
  );
}
