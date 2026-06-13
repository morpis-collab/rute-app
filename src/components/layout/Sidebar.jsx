import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Receipt, Package,
  Wallet, BookOpen, BarChart3, Bot, Settings, Camera, Clock, Briefcase,
  Percent, Users, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useSettingsStore from '../../store/useSettingsStore';
import { motion } from 'framer-motion';

const ownerMenu = [
  { to: '/owner/dashboard', icon: LayoutDashboard, label: 'Dasbor' },
  { to: '/owner/live-sales', icon: TrendingUp, label: 'Live Penjualan' },
  { to: '/owner/expenses', icon: Receipt, label: 'Pengeluaran' },
  { to: '/owner/receipt', icon: Camera, label: 'Upload Resi' },
  { to: '/owner/cash', icon: Wallet, label: 'Kas Usaha' },
  { to: '/owner/stock', icon: Package, label: 'Gudang Bahan' },
  { to: '/owner/opening-capital', icon: Briefcase, label: 'Modal Awal' },
  { to: '/owner/menu-hpp', icon: BookOpen, label: 'Menu & HPP' },
  { to: '/owner/promotions', icon: Percent, label: 'Promo' },
  { to: '/owner/reports', icon: BarChart3, label: 'Laporan' },
  { to: '/owner/revenue-allocation', icon: Percent, label: 'Bagi Omzet' },
  { to: '/owner/activity', icon: Clock, label: 'Riwayat Aktivitas' },
  { to: '/owner/ai', icon: Bot, label: 'Asisten AI' },
  { to: '/owner/settings', icon: Settings, label: 'Pengaturan' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, updateSettings } = useSettingsStore();

  if (user?.role !== 'owner') return null;

  const toggleCollapse = () => {
    updateSettings({ sidebarCollapsed: !sidebarCollapsed });
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-[var(--color-border)] bg-white/92 text-[var(--color-text-primary)] shadow-[var(--shadow-sm)] backdrop-blur-xl lg:flex"
    >
      {/* Sidebar Header */}
      <div className="relative border-b border-[var(--color-border)] px-4 py-5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-1.5 shadow-sm">
            <img src="/rute-logo.png" alt="RUTE Logo" className="h-full w-full object-contain" />
          </div>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="min-w-0"
            >
              <h1 className="text-lg font-black tracking-tight text-[var(--color-text-primary)]">RUTE Coffee</h1>
              <p className="truncate text-[11px] font-semibold text-[var(--color-text-muted)]">Owner Command Center</p>
            </motion.div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3.5 top-7 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] shadow-sm transition-colors hover:text-[var(--color-band-1)]"
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5 scrollbar-thin">
        {ownerMenu.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={sidebarCollapsed ? label : undefined}
            className={({ isActive }) =>
              `relative flex items-center rounded-[var(--radius-button)] py-2.5 text-sm font-bold transition-all duration-200 ${
                sidebarCollapsed ? 'justify-center px-0' : 'px-3.5 gap-3'
              } ${
                isActive
                  ? 'bg-[var(--color-band-4)] text-[var(--color-band-1)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-coffee-milk)] hover:text-[var(--color-band-1)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active Indicator Glow Line */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/4 h-1/2 w-1.5 rounded-r-full bg-[var(--color-band-1)]"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={`shrink-0 ${isActive ? 'text-[var(--color-band-1)]' : 'text-[var(--color-text-secondary)]'}`} />
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="truncate"
                  >
                    {label}
                  </motion.span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-[var(--color-border)] p-3">
        {!sidebarCollapsed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-coffee-milk)] p-3"
          >
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
              <Users size={12} />
              Semua Cabang
            </div>
            <p className="text-xs font-bold text-[var(--color-text-secondary)]">Ruang Tengah Coffee</p>
          </motion.div>
        ) : (
          <div className="mb-2 flex justify-center text-[var(--color-text-muted)]" title="Semua Cabang">
            <Users size={18} />
          </div>
        )}

        <div className={`flex items-center border border-[var(--color-border)] bg-white p-2.5 ${sidebarCollapsed ? 'justify-center rounded-full w-12 h-12 mx-auto' : 'rounded-[var(--radius-card)] gap-2.5'}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-band-4)] text-sm font-bold text-[var(--color-band-1)]">
            {user?.name?.charAt(0) || 'O'}
          </div>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <p className="truncate text-[13px] font-bold text-[var(--color-text-primary)]">{user?.name}</p>
              <p className="truncate text-[11px] capitalize text-[var(--color-text-muted)]">{user?.role} - RUTE</p>
            </motion.div>
          )}
        </div>

        <button
          onClick={logout}
          className={`mt-2 flex w-full items-center justify-center rounded-[var(--radius-button)] py-2 text-xs font-bold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-coffee-milk)] hover:text-[var(--color-accent-red)] ${sidebarCollapsed ? 'px-0' : 'gap-2'}`}
          title="Keluar"
        >
          <LogOut size={16} />
          {!sidebarCollapsed && <span>Keluar</span>}
        </button>
      </div>
    </motion.aside>
  );
}
