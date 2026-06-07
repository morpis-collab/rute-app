import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedNumber — Angka yang beranimasi counting saat value berubah.
 * 
 * Fitur:
 * - Roll up/down animation saat value berubah
 * - Smooth easing (ease-out cubic)
 * - Format otomatis sebagai Rupiah
 * - Configurable duration
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
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(0);
  const currentValueRef = useRef(value);

  useEffect(() => {
    const targetValue = Number(value) || 0;
    const startValue = currentValueRef.current;

    // Jangan animate kalau nilainya sama
    if (startValue === targetValue) {
      setDisplayValue(targetValue);
      return;
    }

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
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration]);

  return (
    <span className={`animated-number ${className}`}>
      {formatter(displayValue)}
    </span>
  );
}

function defaultFormatter(val) {
  if (val == null) return 'Rp 0';
  const num = Number(val);
  if (isNaN(num)) return 'Rp 0';
  const prefix = num < 0 ? '-' : '';
  return prefix + 'Rp ' + Math.abs(num).toLocaleString('id-ID');
}
