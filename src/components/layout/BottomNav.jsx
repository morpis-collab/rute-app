import { NavLink } from 'react-router-dom';
import { ShoppingCart, Camera, Receipt, Wallet, Bot, Package, FileText, Percent } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import { motion } from 'framer-motion';

const partnerMenu = [
  { to: '/partner/sales', icon: ShoppingCart, label: 'Jual' },
  { to: '/partner/expenses', icon: Receipt, label: 'Pengeluaran' },
  { to: '/partner/stock', icon: Package, label: 'Gudang' },
  { to: '/partner/close-cash', icon: Wallet, label: 'Tutup' },
  { to: '/partner/notes', icon: FileText, label: 'Catatan' },
  { to: '/partner/ai', icon: Bot, label: 'Asisten' },
];

const ownerMobileMenu = [
  { to: '/owner/dashboard', icon: ShoppingCart, label: 'Dasbor' },
  { to: '/owner/receipt', icon: Camera, label: 'Resi' },
  { to: '/owner/promotions', icon: Percent, label: 'Promo' },
  { to: '/owner/reports', icon: Wallet, label: 'Laporan' },
  { to: '/owner/ai', icon: Bot, label: 'Asisten' },
];

export default function BottomNav() {
  const { user } = useAuthStore();

  if (!user) return null;

  const menu = user.role === 'partner' ? partnerMenu : ownerMobileMenu;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
      <nav className="mx-auto max-w-md rounded-2xl border border-[var(--color-border)] bg-white/90 px-2.5 py-1.5 shadow-[0_12px_30px_-5px_rgba(139,109,82,0.15)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          {menu.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 flex-1 rounded-xl text-[9px] font-extrabold transition-colors duration-200 ${
                  isActive
                    ? 'text-[var(--color-band-1)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Sliding active background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeBottomTab"
                      className="absolute inset-0 -z-10 bg-[var(--color-band-4)] rounded-xl"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  {/* Scaling active icon */}
                  <motion.div
                    animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="shrink-0"
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                  </motion.div>

                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
