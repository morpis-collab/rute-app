import { NavLink } from 'react-router-dom';
import { BarChart3, Clock, LayoutDashboard, TrendingUp, Wallet } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import { motion, useReducedMotion } from 'framer-motion';
import { softSpring } from '../../utils/motion';

const ownerMobileMenu = [
  { to: '/owner/dashboard', icon: LayoutDashboard, label: 'Dasbor' },
  { to: '/owner/live-sales', icon: TrendingUp, label: 'Rekap' },
  { to: '/owner/close-cash', icon: Clock, label: 'Tutup' },
  { to: '/owner/cash', icon: Wallet, label: 'Kas' },
  { to: '/owner/reports', icon: BarChart3, label: 'Laporan' },
];

export default function BottomNav() {
  const { user } = useAuthStore();
  const shouldReduceMotion = useReducedMotion();

  if (!user) return null;

  const menu = ownerMobileMenu;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
      <nav className="mx-auto max-w-md rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white/90 px-2.5 py-1.5 shadow-[var(--shadow-lg)] backdrop-blur-xl">
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
                      transition={shouldReduceMotion ? { duration: 0 } : softSpring}
                    />
                  )}
                  
                  {/* Scaling active icon */}
                  <motion.div
                    animate={shouldReduceMotion ? undefined : { scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                    transition={softSpring}
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
