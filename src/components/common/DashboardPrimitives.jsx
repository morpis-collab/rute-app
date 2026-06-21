import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getProductVisual } from '../../utils/productVisuals';
import { formatRupiah } from '../../utils/formatters';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { hoverLift, softSpring, tapPress } from '../../utils/motion';

export function SectionHeader({ title, subtitle, action, children }) {
  return (
    <div className="section-header">
      <div>
        <h2 className="text-[var(--color-text-primary)] font-extrabold">{title}</h2>
        {subtitle && <p className="text-[var(--color-text-muted)] text-[11px] font-semibold">{subtitle}</p>}
      </div>
      <div className="section-header__actions">
        {children}
        {action}
      </div>
    </div>
  );
}

export function KpiTile({ icon: Icon, label, value, helper, tone = 'caramel', compact = false }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : hoverLift}
      whileTap={shouldReduceMotion ? undefined : tapPress}
      transition={softSpring}
      className={`metric-tile metric-tile--${tone} ${compact ? 'metric-tile--compact' : ''} relative overflow-hidden`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-band-1)] opacity-70`} />
      
      {Icon && (
        <div className="metric-tile__icon shrink-0">
          <Icon size={compact ? 17 : 20} />
        </div>
      )}
      <div className="min-w-0 flex-1 pl-1">
        <p className="metric-tile__label text-[9px] font-extrabold uppercase tracking-[0.04em] text-[var(--color-text-muted)]">{label}</p>
        <p className="metric-tile__value mt-1 font-mono text-lg font-black leading-none text-[var(--color-text-primary)]">{value}</p>
        {helper && <p className="metric-tile__helper text-[10px] font-semibold text-[var(--color-text-muted)] mt-1.5">{helper}</p>}
      </div>
    </motion.div>
  );
}

export function StatusAlert({ level = 'info', title, message, actionLabel, onClick }) {
  const Icon = level === 'success' ? CheckCircle2 : AlertTriangle;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      whileHover={shouldReduceMotion ? undefined : { y: -1 }}
      whileTap={shouldReduceMotion ? undefined : tapPress}
      transition={softSpring}
      type="button"
      onClick={onClick}
      className={`status-alert status-alert--${level} w-full flex items-center text-left transition-all p-3.5`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <strong className="text-xs font-bold leading-tight block">{title}</strong>
        {message && <small className="text-[11px] text-[var(--color-text-muted)] block mt-0.5">{message}</small>}
      </span>
      {actionLabel && (
        <span className="status-alert__action text-xs font-black flex items-center gap-1 text-[var(--color-band-1)] shrink-0 ml-2">
          {actionLabel}
          <ArrowRight size={13} />
        </span>
      )}
    </motion.button>
  );
}

export function ProductThumb({ product, size = 'md', className = '' }) {
  const visual = getProductVisual(product);
  return (
    <div className={`product-thumb product-thumb--${size} ${className}`} style={{ '--product-tone': visual.tone, '--product-accent': visual.accent }}>
      <img src={visual.image} alt={`Visual ${product?.name || 'produk'}`} loading="lazy" />
    </div>
  );
}

export function ProductTile({ product, qty = 0, onClick, promotionMatch }) {
  const visual = getProductVisual(product);
  const promoPrice = promotionMatch?.pricing?.promoPrice;
  const hasPromoPrice = Number(promotionMatch?.pricing?.discountAmount || 0) > 0;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.button
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
      transition={softSpring}
      type="button"
      onClick={onClick}
      className={`product-tile relative flex flex-col items-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-3 shadow-sm ${qty > 0 ? 'is-selected' : ''}`}
      style={{ '--product-tone': visual.tone, '--product-accent': visual.accent }}
    >
      <span className="product-tile__add shrink-0">+</span>
      {promotionMatch && (
        <span className="absolute left-2 top-2 max-w-[calc(100%-3rem)] truncate rounded-md bg-[#fff1d9] px-1.5 py-1 text-[8px] font-black uppercase text-[#9a5d1b]">
          Promo
        </span>
      )}
      
      <AnimatePresence>
        {qty > 0 && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={softSpring}
            key={qty}
            className="product-tile__qty"
          >
            {qty}
          </motion.span>
        )}
      </AnimatePresence>

      <ProductThumb product={product} size="lg" className="mb-2" />
      <span className="product-tile__name text-[11px] font-bold text-[var(--color-text-primary)] text-center line-clamp-2 min-h-[2.4em] leading-snug w-full">
        {product.name}
      </span>
      <span className="product-tile__price text-xs font-black font-mono text-[var(--color-band-1)] mt-1">
        {formatRupiah(hasPromoPrice ? promoPrice : product.sellingPrice || product.price || 0)}
      </span>
      {hasPromoPrice && (
        <span className="font-mono text-[9px] font-bold text-[var(--color-text-muted)] line-through">
          {formatRupiah(product.sellingPrice || product.price || 0)}
        </span>
      )}
    </motion.button>
  );
}

export function PaymentSegmented({ value, options, onChange }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="payment-segmented relative flex overflow-hidden rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-1">
      {options.map(({ id, label, icon: Icon }) => {
        const isActive = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`relative flex items-center justify-center gap-1.5 flex-1 min-h-[44px] text-[11px] font-extrabold rounded-lg transition-colors z-10 ${
              isActive ? 'text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeSegment"
                className="absolute inset-0 bg-gradient-to-r from-[var(--color-band-1)] to-[var(--color-band-2)] rounded-lg -z-10 shadow-sm"
                transition={shouldReduceMotion ? { duration: 0 } : softSpring}
              />
            )}
            {Icon && <Icon size={16} className="shrink-0" />}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
