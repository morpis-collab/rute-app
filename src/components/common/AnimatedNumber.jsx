import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

/**
 * AnimatedNumber - Angka yang beranimasi counting saat value berubah.
 * 
 * Fitur:
 * - Roll up/down animation saat value berubah
 * - Smooth easing (ease-out cubic)
 * - Format otomatis sebagai Rupiah
 * - Configurable duration
 * - Micro-interaction: scale pulse & color flash (hijau jika naik, merah jika turun)
 * 
 * @param {number} value - Nilai akhir yang ditampilkan
 * @param {function} formatter - Fungsi format (default: formatRupiah)
 * @param {number} duration - Durasi animasi dalam ms (default: 800)
 * @param {string} className - CSS class untuk styling
 */
export default function AnimatedNumber({
  value = 0,
  formatter = defaultFormatter,
  duration = 800,
  className = '',
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [trend, setTrend] = useState('stable'); // 'up' | 'down' | 'stable'
  
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(0);
  const currentValueRef = useRef(value);
  const prevValueRef = useRef(value);
  
  const controls = useAnimation();

  useEffect(() => {
    const targetValue = Number(value) || 0;
    const startValue = currentValueRef.current;

    // Jangan animate kalau nilainya sama
    if (startValue === targetValue) {
      setDisplayValue(targetValue);
      return;
    }

    // Determine trend for color flash
    const oldVal = prevValueRef.current;
    if (targetValue > oldVal) {
      setTrend('up');
    } else if (targetValue < oldVal) {
      setTrend('down');
    }
    prevValueRef.current = targetValue;

    // Trigger scale pulse animation
    controls.start({
      scale: [1, 1.05, 1],
      transition: { duration: 0.3, ease: 'easeOut' }
    });

    startValueRef.current = startValue;
    startTimeRef.current = null;

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = startValueRef.current + (targetValue - startValueRef.current) * eased;
      currentValueRef.current = current;
      setDisplayValue(Math.round(current));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentValueRef.current = targetValue;
        setDisplayValue(targetValue);
        // Reset trend after some delay so the color goes back to normal
        setTimeout(() => setTrend('stable'), 800);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration, controls]);

  const getColorClass = () => {
    if (trend === 'up') return 'text-success dark:text-success';
    if (trend === 'down') return 'text-red-500 dark:text-red-400';
    return '';
  };

  return (
    <motion.span
      animate={controls}
      className={`animated-number inline-block transition-colors duration-300 font-mono ${getColorClass()} ${className}`}
    >
      {formatter(displayValue)}
    </motion.span>
  );
}

function defaultFormatter(val) {
  if (val == null) return 'Rp 0';
  const num = Number(val);
  if (isNaN(num)) return 'Rp 0';
  const prefix = num < 0 ? '-' : '';
  return prefix + 'Rp ' + Math.abs(num).toLocaleString('id-ID');
}
