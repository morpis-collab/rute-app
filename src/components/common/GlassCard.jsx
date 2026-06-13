import { motion } from 'framer-motion';

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
      whileHover={hoverEffect ? { y: -2, boxShadow: 'var(--shadow-md)', borderColor: 'var(--color-accent-primary)' } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`rounded-2xl border p-5 transition-colors ${getVariantStyles()} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
