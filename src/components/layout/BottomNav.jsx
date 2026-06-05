import { NavLink } from 'react-router-dom';
import { ShoppingCart, Camera, Receipt, Wallet, Bot, Package } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const partnerMenu = [
  { to: '/partner/sales', icon: ShoppingCart, label: 'Jual' },
  { to: '/partner/expenses', icon: Receipt, label: 'Pengeluaran' },
  { to: '/partner/stock', icon: Package, label: 'Gudang' },
  { to: '/partner/close-cash', icon: Wallet, label: 'Kas' },
  { to: '/partner/ai', icon: Bot, label: 'Copilot' },
];

const ownerMobileMenu = [
  { to: '/owner/dashboard', icon: ShoppingCart, label: 'Dash' },
  { to: '/owner/receipt', icon: Camera, label: 'Resi' },
  { to: '/owner/reports', icon: Wallet, label: 'Report' },
  { to: '/owner/ai', icon: Bot, label: 'Copilot' },
];

export default function BottomNav() {
  const { user } = useAuthStore();

  if (!user) return null;

  const menu = user.role === 'partner' ? partnerMenu : ownerMobileMenu;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {menu.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 px-3 rounded text-[10px] font-medium transition-colors min-w-[56px] ${
                isActive
                  ? 'text-[var(--color-accent-primary)]'
                  : 'text-[var(--color-text-muted)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
