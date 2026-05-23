import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Receipt, Package,
  Wallet, BookOpen, ShieldCheck, BarChart3, Bot, Settings, Camera, Clock, Briefcase
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const ownerMenu = [
  { to: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/owner/live-sales', icon: TrendingUp, label: 'Live Penjualan' },
  { to: '/owner/expenses', icon: Receipt, label: 'Pengeluaran' },
  { to: '/owner/receipt', icon: Camera, label: 'Upload Resi' },
  { to: '/owner/stock', icon: Package, label: 'Stok' },
  { to: '/owner/cash', icon: Wallet, label: 'Kas Usaha' },
  { to: '/owner/opening-capital', icon: Briefcase, label: 'Modal Awal' },
  { to: '/owner/menu-hpp', icon: BookOpen, label: 'Menu & HPP' },
  { to: '/owner/approval', icon: ShieldCheck, label: 'Approval' },
  { to: '/owner/reports', icon: BarChart3, label: 'Laporan' },
  { to: '/owner/activity', icon: Clock, label: 'Activity Log' },
  { to: '/owner/ai', icon: Bot, label: 'AI Copilot' },
  { to: '/owner/settings', icon: Settings, label: 'Pengaturan' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  if (user?.role !== 'owner') return null;

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen text-white fixed left-0 top-0 z-40" style={{ background: 'linear-gradient(180deg, var(--color-band-1) 0%, var(--color-band-2) 100%)', boxShadow: '4px 0 20px rgba(90, 78, 58, 0.15)' }}>
      {/* Logo */}
      <div className="px-4 py-6 border-b border-white/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden p-1">
            <img src="/rute-logo.png" alt="RUTE Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>RUTE <span className="font-light text-[var(--color-band-4)]">Coffee</span></h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {ownerMenu.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-medium transition-all duration-250 ${
                isActive
                  ? 'bg-[var(--color-band-4)] text-[var(--color-band-1)] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.1)]'
                  : 'text-white/75 hover:bg-white/10 hover:text-white hover:translate-x-1'
              }`
            }
          >
            <Icon size={18} strokeWidth={2.5} className="w-5 text-center" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-white/15">
        <div className="flex items-center gap-2.5 p-2.5 rounded-[14px] bg-white/10">
          <div className="w-9 h-9 rounded-full bg-[var(--color-band-4)] flex items-center justify-center text-[var(--color-band-1)] font-bold text-sm">
            {user?.name?.charAt(0) || 'O'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate text-white">{user?.name}</p>
            <p className="text-[11px] text-white/50 truncate capitalize">{user?.role} - RUTE Coffee</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-center mt-2 text-xs font-medium text-white/50 hover:text-white transition-colors py-1"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
