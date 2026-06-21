import { motion, useReducedMotion } from 'framer-motion';
import { hoverLift, softSpring } from '../../utils/motion';

/**
 * GlassCard - Reusable card with modern glassmorphism and subtle border glow.
 * 
 * @param {React.ReactNode} children - Card content
 * @param {string} className - Additional CSS classes
 * @param {'subtle' | 'prominent' | 'accent'} variant - Border/background styling style
 * @param {boolean} hoverEffect - Toggle elevation & scale on hover (default: true)
 * @param {object} props - Additional motion div props
 */
export default function GlassCard({
  children,
  className = '',
  variant = 'subtle',
  hoverEffect = true,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();

  const getVariantStyles = () => {
    switch (variant) {
      case 'prominent':
        return 'bg-white/80 border-white/50 shadow-md backdrop-blur-xl';
      case 'accent':
        return 'bg-white/65 border-[var(--color-band-3)]/30 shadow-md backdrop-blur-lg';
      case 'subtle':
      default:
        return 'bg-white/65 border-[var(--color-border)] shadow-sm backdrop-blur-lg';
    }
  };

  return (
    <motion.div
      whileHover={!shouldReduceMotion && hoverEffect ? { ...hoverLift, borderColor: 'var(--color-accent-primary)' } : undefined}
      transition={softSpring}
      className={`rounded-[var(--radius-card)] border p-5 transition-colors ${getVariantStyles()} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
