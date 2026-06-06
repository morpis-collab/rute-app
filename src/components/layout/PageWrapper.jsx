import { LogOut, Sun, Moon } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useSettingsStore from '../../store/useSettingsStore';

export default function PageWrapper({ children, title, subtitle }) {
  const { user, logout } = useAuthStore();
  const isOwner = user?.role === 'owner';
  const { theme, updateSettings } = useSettingsStore();
  const isDarkMode = theme === 'dark';

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
    <div className={`min-h-screen bg-[var(--color-bg-primary)] ${isOwner ? 'lg:ml-60' : ''} pb-20 lg:pb-8`}>
      {/* Page Header */}
      {title && (
        <header className="sticky top-0 z-30 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)]">
          <div className="px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-band-1)] transition-colors p-2 rounded-md hover:bg-[var(--color-bg-secondary)] flex items-center justify-center"
                title={isDarkMode ? 'Mode Terang' : 'Mode Espresso'}
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {user && (
                <button 
                  onClick={logout} 
                  className={`text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] transition-colors p-2 -mr-2 rounded-md hover:bg-red-50 flex items-center gap-1 text-xs font-medium ${isOwner ? 'lg:hidden' : ''}`}
                  title="Keluar"
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Page Content */}
      <main className="px-4 lg:px-8 py-4 lg:py-6 fade-in max-w-5xl">
        {children}
      </main>
    </div>
  );
}
