import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, TrendingUp, Clock, Percent, CheckCircle2 } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import useSettingsStore from '../../store/useSettingsStore';
import { getBusinessDate } from '../../utils/businessDate';

export default function DailyFlowIndicator() {
  const navigate = useNavigate();
  const location = useLocation();

  const openingCapital = useAppStore((state) => state.openingCapital);
  const sales = useAppStore((state) => state.sales);
  const cashSessions = useAppStore((state) => state.cashSessions);
  const settings = useSettingsStore();

  const todayDate = getBusinessDate();

  // 1. Modal Awal Status
  const isStep1Done = useMemo(() => {
    return !!(openingCapital && Number(openingCapital.cashCapital) > 0);
  }, [openingCapital]);

  // 2. Rekap Penjualan Status
  const isStep2Done = useMemo(() => {
    const todaySales = (sales || []).filter(s => s.date.substring(0, 10) === todayDate);
    return todaySales.length > 0;
  }, [sales, todayDate]);

  // 3. Tutup Kas Status
  const isStep3Done = useMemo(() => {
    const todaySession = (cashSessions || []).find(s => s.date === todayDate);
    return !!(todaySession && todaySession.status === 'closed');
  }, [cashSessions, todayDate]);

  // 4. Bagi Omzet Status
  const isStep4Done = useMemo(() => {
    return settings.lastAllocatedDate === todayDate;
  }, [settings.lastAllocatedDate, todayDate]);

  const steps = [
    {
      id: 'step1',
      label: 'Modal Awal',
      to: '/owner/opening-capital',
      done: isStep1Done,
      icon: Briefcase,
    },
    {
      id: 'step2',
      label: 'Rekap Penjualan',
      to: '/owner/live-sales',
      done: isStep2Done,
      icon: TrendingUp,
    },
    {
      id: 'step3',
      label: 'Tutup Kas',
      to: '/owner/close-cash',
      done: isStep3Done,
      icon: Clock,
    },
    {
      id: 'step4',
      label: 'Bagi Omzet',
      to: '/owner/revenue-allocation',
      done: isStep4Done,
      icon: Percent,
    },
  ];

  // Determine current active step (first step that is not done)
  const activeIndex = steps.findIndex(s => !s.done);
  const currentActiveIndex = activeIndex === -1 ? 3 : activeIndex;

  return (
    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-cream-card shadow-sm space-y-3.5">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xs font-black text-[var(--color-text-primary)]">Alur Kerja Harian Owner</h4>
          <p className="text-[10px] font-semibold text-[var(--color-text-muted)] mt-0.5">Pantauan urutan operasional hari ini ({todayDate})</p>
        </div>
        {activeIndex === -1 && (
          <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase bg-success-bg text-success-text px-2 py-0.5 rounded-full border border-success-border animate-pulse">
            <CheckCircle2 size={10} /> Selesai Semua
          </span>
        )}
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-4 gap-1.5 md:gap-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentActiveIndex;
          const isCurrentPage = location.pathname === step.to;
          
          return (
            <button
              key={step.id}
              onClick={() => navigate(step.to)}
              className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all cursor-pointer relative h-20 group ${
                step.done
                  ? 'border-success-border bg-success-bg/30 hover:bg-success-bg/50 text-success-text'
                  : isActive
                    ? 'border-[var(--color-band-1)] bg-[var(--color-band-4)] text-[var(--color-band-1)] font-bold shadow-xs'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-gray-300'
              }`}
            >
              {/* Top Step Icon & Status Badge */}
              <div className="flex justify-between w-full px-1 items-start">
                <span className="text-[9px] font-black font-mono opacity-65">0{idx + 1}</span>
                {step.done ? (
                  <CheckCircle2 size={11} className="text-success-text shrink-0" />
                ) : (
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-[var(--color-band-1)] animate-ping' : 'bg-transparent'}`} />
                )}
              </div>

              {/* Step Icon */}
              <Icon size={16} className={`my-1 shrink-0 ${isActive ? 'text-[var(--color-band-1)] scale-110' : 'text-current'}`} />

              {/* Step Label */}
              <span className={`text-[9px] font-extrabold tracking-tight truncate w-full ${isCurrentPage ? 'underline decoration-2 font-black' : ''}`}>
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
