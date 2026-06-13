import { useState } from 'react';
import { Percent, Calendar, RefreshCw, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAppStore from '../../store/useAppStore';
import useSettingsStore from '../../store/useSettingsStore';
import { getBusinessDate, isSameBusinessDate } from '../../utils/businessDate';
import { formatRupiah } from '../../utils/formatters';
import useToastStore from '../../store/useToastStore';

export default function OwnerRevenueAllocation() {
  const sales = useAppStore((state) => state.sales);
  const settings = useSettingsStore();
  const { addToast } = useToastStore();

  const [selectedDate, setSelectedDate] = useState(getBusinessDate());
  const [calculationMode, setCalculationMode] = useState('auto'); // 'auto' | 'manual'
  const [manualRevenue, setManualRevenue] = useState('1000000');

  // Load percentages from settings store
  const [pctRawMaterials, setPctRawMaterials] = useState(settings.allocationRawMaterials ?? 50);
  const [pctOperations, setPctOperations] = useState(settings.allocationOperations ?? 20);
  const [pctProfit, setPctProfit] = useState(settings.allocationProfit ?? 30);

  const totalPct = Number(pctRawMaterials || 0) + Number(pctOperations || 0) + Number(pctProfit || 0);
  const isValidAllocation = totalPct === 100;

  // Calculate automatic revenue (sum of sales on selected date)
  const selectedSales = sales.filter((s) => isSameBusinessDate(s.date, selectedDate));
  const autoRevenue = selectedSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const salesCount = selectedSales.length;

  const baseRevenue = calculationMode === 'auto' ? autoRevenue : Number(manualRevenue || 0);

  // Split amounts
  const amtRawMaterials = (baseRevenue * pctRawMaterials) / 100;
  const amtOperations = (baseRevenue * pctOperations) / 100;
  const amtProfit = (baseRevenue * pctProfit) / 100;

  const handleSaveRatios = () => {
    if (!isValidAllocation) return;
    settings.updateSettings({
      allocationRawMaterials: Number(pctRawMaterials),
      allocationOperations: Number(pctOperations),
      allocationProfit: Number(pctProfit),
    });
    addToast('Default rasio alokasi omzet berhasil diperbarui secara permanen', 'success');
  };

  // SVG Donut Calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke-dasharray offsets
  const offsetRawMaterials = circumference;
  const strokeRawMaterials = (pctRawMaterials / 100) * circumference;

  const offsetOperations = circumference - strokeRawMaterials;
  const strokeOperations = (pctOperations / 100) * circumference;

  const offsetProfit = circumference - strokeRawMaterials - strokeOperations;
  const strokeProfit = (pctProfit / 100) * circumference;

  return (
    <PageWrapper title="Bagi Omzet" subtitle="Hitung dan bagi porsi alokasi omzet penjualan harian">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column - Controls & Ratios */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card 1: Input & Mode */}
          <div className="p-4 rounded-2xl bg-white border border-[var(--color-border)] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Calendar size={16} className="text-[var(--color-accent-primary)]" />
              <span>Sumber Data Omzet</span>
            </h3>

            {/* Date Selector */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Tanggal Bisnis</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input text-sm p-2 w-full font-mono bg-white border border-[var(--color-border)] rounded-lg focus:border-[var(--color-band-1)]"
              />
            </div>

            {/* Mode Switcher */}
            <div>
              <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-2">Metode Kalkulasi</label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100/80 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setCalculationMode('auto')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
                    calculationMode === 'auto'
                      ? 'bg-white text-[var(--color-band-1)] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Otomatis (Live)
                </button>
                <button
                  type="button"
                  onClick={() => setCalculationMode('manual')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center ${
                    calculationMode === 'manual'
                      ? 'bg-white text-[var(--color-band-1)] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Manual (Input)
                </button>
              </div>
            </div>

            {/* Revenue Base input/display */}
            {calculationMode === 'auto' ? (
              <div className="p-3.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-[var(--color-text-muted)] block">OMZET HARI INI ({salesCount} Transaksi)</span>
                  <span className="text-lg font-bold font-mono text-[var(--color-text-primary)]">{formatRupiah(autoRevenue)}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => useAppStore.getState().loadRemoteData()}
                  className="p-2 rounded-lg hover:bg-white text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                  title="Refresh Data Transaksi"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-[var(--color-text-secondary)] uppercase mb-1">Ketik Nominal Omzet (Rp)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Masukkan jumlah omzet..."
                  value={manualRevenue}
                  onChange={(e) => setManualRevenue(e.target.value)}
                  className="form-input text-sm p-2 w-full font-mono"
                />
              </div>
            )}
          </div>

          {/* Card 2: Allocation Percentage Settings */}
          <div className="p-4 rounded-2xl bg-white border border-[var(--color-border)] shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Percent size={16} className="text-[var(--color-accent-primary)]" />
              <span>Rasio Anggaran</span>
            </h3>

            {/* Sliders */}
            <div className="space-y-3">
              {/* Raw Materials Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-700">1. Bahan Baku</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pctRawMaterials}
                      onChange={(e) => setPctRawMaterials(Math.min(100, Math.max(0, Number(e.target.value || 0))))}
                      className="w-12 text-center rounded border border-gray-300 py-0.5 px-1 font-mono font-bold text-xs"
                    />
                    <span className="text-gray-500 font-semibold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={pctRawMaterials}
                  onChange={(e) => setPctRawMaterials(Number(e.target.value))}
                  className="w-full accent-[var(--color-band-2)]"
                />
              </div>

              {/* Operations Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-700">2. Operasional</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pctOperations}
                      onChange={(e) => setPctOperations(Math.min(100, Math.max(0, Number(e.target.value || 0))))}
                      className="w-12 text-center rounded border border-gray-300 py-0.5 px-1 font-mono font-bold text-xs"
                    />
                    <span className="text-gray-500 font-semibold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={pctOperations}
                  onChange={(e) => setPctOperations(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent-primary)]"
                />
              </div>

              {/* Profit Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-700">3. Keuntungan Pribadi</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pctProfit}
                      onChange={(e) => setPctProfit(Math.min(100, Math.max(0, Number(e.target.value || 0))))}
                      className="w-12 text-center rounded border border-gray-300 py-0.5 px-1 font-mono font-bold text-xs"
                    />
                    <span className="text-gray-500 font-semibold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={pctProfit}
                  onChange={(e) => setPctProfit(Number(e.target.value))}
                  className="w-full accent-[#8b5a2b]"
                />
              </div>
            </div>

            {/* Validation Indicator & Save Button */}
            <div className="pt-2 border-t border-gray-150 space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-gray-600">Total Akumulasi:</span>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                  isValidAllocation
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-danger/10 text-danger border border-danger/20'
                }`}>
                  {totalPct}%
                </span>
              </div>

              {!isValidAllocation && (
                <div className="flex items-start gap-1.5 text-[10px] text-red-600 leading-relaxed">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>Akumulasi pembagian rasio saat ini <strong>{totalPct}%</strong>. Total porsi harus pas <strong>100%</strong> agar data anggaran seimbang.</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveRatios}
                disabled={!isValidAllocation}
                className="w-full py-2 px-4 rounded-xl border border-transparent bg-[var(--color-band-2)] hover:bg-[var(--color-band-1)] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                <Save size={14} />
                <span>Simpan Rasio Default</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Visual splits breakdown */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-[var(--color-border)] shadow-xs space-y-5">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">Hasil Pembagian Alokasi</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Anggaran dihitung dari total omzet terpilih</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase block">TOTAL OMZET</span>
                <span className="text-lg font-black font-mono text-[var(--color-band-1)]">{formatRupiah(baseRevenue)}</span>
              </div>
            </div>

            {/* Split breakdown Grid & Chart */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              
              {/* Graphic Pie Donut representation */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background Circle */}
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="#f3f4f6"
                      strokeWidth="12"
                    />

                    {/* Raw Materials (Greenish Coffee) */}
                    {pctRawMaterials > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="var(--color-band-2)"
                        strokeWidth="12"
                        strokeDasharray={`${strokeRawMaterials} ${circumference}`}
                        strokeDashoffset={offsetRawMaterials}
                        strokeLinecap="round"
                        className="transition-all duration-350"
                      />
                    )}

                    {/* Operations (Accent Warm) */}
                    {pctOperations > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="var(--color-accent-primary)"
                        strokeWidth="12"
                        strokeDasharray={`${strokeOperations} ${circumference}`}
                        strokeDashoffset={offsetOperations}
                        strokeLinecap="round"
                        className="transition-all duration-350"
                      />
                    )}

                    {/* Profit (Darker Coffee) */}
                    {pctProfit > 0 && (
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="#8b5a2b"
                        strokeWidth="12"
                        strokeDasharray={`${strokeProfit} ${circumference}`}
                        strokeDashoffset={offsetProfit}
                        strokeLinecap="round"
                        className="transition-all duration-350"
                      />
                    )}
                  </svg>
                  
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rasio</span>
                    <span className="text-sm font-extrabold text-[var(--color-text-primary)] font-mono">
                      {pctRawMaterials}/{pctOperations}/{pctProfit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Color coded Breakdown cards */}
              <div className="md:col-span-7 space-y-3">
                {/* Pos 1: Bahan Baku */}
                <div className="p-3 rounded-xl border border-l-4 border-l-[var(--color-band-2)] border-gray-100 bg-[var(--color-bg-secondary)] flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-band-2)]" />
                      <span className="text-xs font-bold text-gray-800">Pos Bahan Baku</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-success/10 text-success">{pctRawMaterials}%</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-relaxed">
                      Anggaran belanja kopi blend, susu UHT, sirup, gula, dan packaging cup.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-gray-900">{formatRupiah(amtRawMaterials)}</span>
                  </div>
                </div>

                {/* Pos 2: Operasional */}
                <div className="p-3 rounded-xl border border-l-4 border-l-[var(--color-accent-primary)] border-gray-100 bg-[var(--color-bg-secondary)] flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-primary)]" />
                      <span className="text-xs font-bold text-gray-800">Pos Operasional</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700">{pctOperations}%</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-relaxed">
                      Alokasi biaya listrik, air bersih, es batu, internet, gas, dan keperluan harian.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-gray-900">{formatRupiah(amtOperations)}</span>
                  </div>
                </div>

                {/* Pos 3: Keuntungan Pribadi */}
                <div className="p-3 rounded-xl border border-l-4 border-l-[#8b5a2b] border-gray-100 bg-[var(--color-bg-secondary)] flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#8b5a2b]" />
                      <span className="text-xs font-bold text-gray-800">Keuntungan Bersih</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-900/10 text-amber-900">{pctProfit}%</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-relaxed">
                      Sisa dana keuntungan yang aman untuk diambil sebagai gaji pribadi / dividen.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-gray-900">{formatRupiah(amtProfit)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick tips panel */}
            <div className="p-3.5 rounded-xl bg-orange-50/50 border border-orange-100 flex items-start gap-2 text-xs text-amber-900">
              <CheckCircle2 size={16} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed space-y-1">
                <p className="font-semibold">Saran Pengelolaan:</p>
                <p className="text-[11px] text-amber-900/80">
                  Secara berkala, alokasikan uang cash di laci kas ke masing-masing dompet penyimpanan (misal: Rekening Operasional BNI, Brankas Bahan Baku, dan Kantong Pribadi) sesuai porsi Rupiah di atas demi menjaga kedisiplinan keuangan RUTE.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
