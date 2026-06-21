export const softSpring = {
  type: 'spring',
  stiffness: 320,
  damping: 28,
  mass: 0.8,
};

export const pageVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.18, ease: 'easeOut' },
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: softSpring,
  },
};

export const hoverLift = {
  y: -2,
  boxShadow: 'var(--shadow-md)',
};

export const tapPress = {
  scale: 0.98,
};

export const expandCollapse = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: 'auto',
    transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.16, ease: 'easeOut' },
  },
};

export const fadeScale = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.16, ease: 'easeOut' },
  },
};

export function disableMotion(shouldReduceMotion, value) {
  return shouldReduceMotion ? undefined : value;
}
