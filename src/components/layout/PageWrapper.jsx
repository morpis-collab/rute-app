import { CalendarDays, LogOut, Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useSettingsStore from '../../store/useSettingsStore';
import useAppStore from '../../store/useAppStore';
import { getBusinessDate } from '../../utils/businessDate';
import { motion, useScroll, useSpring } from 'framer-motion';

export default function PageWrapper({ children, title, subtitle }) {
  const { user, logout } = useAuthStore();
  const isOwner = user?.role === 'owner';
  const { theme, updateSettings, sidebarCollapsed } = useSettingsStore();
  const isDarkMode = theme === 'dark';
  const apiStatus = useAppStore((state) => state.apiStatus);
  const businessDate = getBusinessDate();
  const statusLabel = apiStatus === 'connected' ? 'Sinkron' : apiStatus === 'loading' ? 'Memuat' : apiStatus === 'offline' ? 'Offline' : 'Lokal';

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
    <div className={`min-h-screen bg-[var(--color-bg-primary)] transition-all duration-300 ${isOwner ? (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64') : ''} pb-24 lg:pb-8`}>
      {title && (
        <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)]/92 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-8 lg:py-4">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                <CalendarDays size={13} />
                <span>{businessDate}</span>
                <span className="hidden sm:inline">/</span>
                <span className="hidden sm:inline">{user?.role === 'owner' ? 'Owner' : 'Partner'} RUTE</span>
              </div>
              <h1 className="truncate text-xl font-extrabold tracking-tight text-[var(--color-text-primary)] lg:text-2xl">{title}</h1>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs font-medium text-[var(--color-text-muted)]">{subtitle}</p>
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
                  className={`touch-target flex items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent-red)] ${isOwner ? 'lg:hidden' : ''}`}
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
            style={{ scaleX }}
          />
        </header>
      )}

      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-[1320px] px-4 py-4 lg:px-8 lg:py-6"
      >
        {children}
      </motion.main>
    </div>
  );
}
