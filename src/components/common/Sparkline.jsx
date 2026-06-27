import { motion } from 'framer-motion';

/**
 * Sparkline - Tiny inline chart (SVG) with mount animations for KPI tiles.
 * 
 * @param {number[]} data - Array of values to display
 * @param {number} width - SVG width (default: 80)
 * @param {number} height - SVG height (default: 26)
 * @param {string} color - Line stroke color (default: 'var(--color-band-1)')
 */
export default function Sparkline({
  data = [],
  width = 80,
  height = 26,
  color = 'var(--color-accent-secondary)'
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  
  // Padding so points don't clip at top/bottom border
  const padding = 2;
  const graphHeight = height - padding * 2;

  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * width;
    // Invert y because SVG 0 is at top
    const y = padding + (graphHeight - ((val - min) / range) * graphHeight);
    return { x, y };
  });

  const pathLine = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const pathArea = `${pathLine} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible pointer-events-none select-none">
      <defs>
        <linearGradient id={`sparklineGrad-${min}-${max}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.16} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      
      {/* Area Fill */}
      <motion.path
        d={pathArea}
        fill={`url(#sparklineGrad-${min}-${max})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />

      {/* Line Path */}
      <motion.path
        d={pathLine}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  );
}
