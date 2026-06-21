import { CalendarDays, LogOut, Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useSettingsStore from '../../store/useSettingsStore';
import useAppStore from '../../store/useAppStore';
import { getBusinessDate } from '../../utils/businessDate';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { pageVariants } from '../../utils/motion';

export default function PageWrapper({ children, title, subtitle }) {
  const { user, logout } = useAuthStore();
  const { theme, updateSettings, sidebarCollapsed } = useSettingsStore();
  const isDarkMode = theme === 'dark';
  const apiStatus = useAppStore((state) => state.apiStatus);
  const businessDate = getBusinessDate();
  const statusLabel = apiStatus === 'connected' ? 'Sinkron' : apiStatus === 'loading' ? 'Memuat' : apiStatus === 'offline' ? 'Offline' : 'Lokal';
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const toggleDarkMode = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    updateSettings({ theme: newTheme });
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className={`min-h-screen bg-[var(--color-bg-primary)] transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} pb-32 lg:pb-8`}>
      {title && (
        <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/92 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8 lg:py-4">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                <CalendarDays size={13} />
                <span>{businessDate}</span>
                <span className="hidden sm:inline">/</span>
                <span className="hidden sm:inline">Owner RUTE</span>
              </div>
              <h1 className="page-title truncate text-[1.35rem] font-semibold leading-tight text-[var(--color-text-primary)] lg:text-[1.75rem]">{title}</h1>
              {subtitle && (
                <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text-muted)]">{subtitle}</p>
              )}
            </div>
            
            <div className="flex shrink-0 items-center gap-2">
              <div className={`hidden items-center gap-1.5 rounded-[var(--radius-button)] border px-2.5 py-2 text-xs font-bold sm:flex ${
                apiStatus === 'offline'
                  ? 'border-danger/30 bg-danger/10 text-danger'
                  : 'border-success/30 bg-success/10 text-success'
              }`}>
                {apiStatus === 'offline' ? <WifiOff size={15} /> : <Wifi size={15} />}
                {statusLabel}
              </div>
              <button
                onClick={toggleDarkMode}
                className="touch-target flex items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-band-1)]"
                title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {user && (
                <button 
                  onClick={logout} 
                  className="touch-target flex items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-red)] lg:hidden"
                  title="Keluar"
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
          {/* Scroll progress bar at bottom of sticky header */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--color-band-1)] via-[var(--color-accent-warm)] to-[var(--color-band-1)] origin-left"
            style={{ scaleX: shouldReduceMotion ? 1 : scaleX }}
          />
        </header>
      )}

      <motion.main
        id="main-content"
        variants={shouldReduceMotion ? undefined : pageVariants}
        initial={shouldReduceMotion ? false : 'hidden'}
        animate="show"
        exit={shouldReduceMotion ? undefined : 'exit'}
        className="mx-auto w-full max-w-[1320px] px-4 py-4 lg:px-8 lg:py-6"
      >
        {children}
      </motion.main>
    </div>
  );
}
