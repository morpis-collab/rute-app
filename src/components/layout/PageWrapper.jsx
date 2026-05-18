import { LogOut } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

export default function PageWrapper({ children, title, subtitle }) {
  const { user, logout } = useAuthStore();
  const isOwner = user?.role === 'owner';

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
        </header>
      )}

      {/* Page Content */}
      <main className="px-4 lg:px-8 py-4 lg:py-6 fade-in max-w-5xl">
        {children}
      </main>
    </div>
  );
}
