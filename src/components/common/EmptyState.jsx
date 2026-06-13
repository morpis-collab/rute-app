import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * EmptyState - Komponen reusable untuk area kosong dengan animasi satisfying.
 * 
 * Fitur animasi:
 * 1. Floating Coffee Beans/Leaves - melayang organik via Framer Motion loop
 * 2. Lava Lamp Blob - gradient blob organik bergerak di background
 * 3. Particle Dust - partikel kecil bergerak random via Canvas
 * 
 * @param {string} message - Teks yang ditampilkan
 * @param {React.ReactNode} icon - Ikon opsional (Lucide, dll)
 * @param {string} sub - Sub-teks opsional
 * @param {'sm' | 'md' | 'lg'} size - Ukuran container
 * @param {boolean} showBeans - Tampilkan floating beans (default: true)
 * @param {boolean} showBlob - Tampilkan lava blob (default: true)
 * @param {boolean} showParticles - Tampilkan particle dust (default: true)
 * @param {string} ctaLabel - Teks tombol aksi opsional
 * @param {function} onCtaClick - Event click tombol aksi opsional
 */
export default function EmptyState({
  message = 'Belum ada data.',
  icon,
  sub,
  size = 'md',
  showBeans = true,
  showBlob = true,
  showParticles = true,
  ctaLabel,
  onCtaClick,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Particle Dust Animation via Canvas
  useEffect(() => {
    if (!showParticles || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let particles = [];

    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    const createParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 3500);
      for (let i = 0; i < Math.min(count, 30); i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.2 - 0.1,
          opacity: Math.random() * 0.4 + 0.1,
          opacitySpeed: (Math.random() - 0.5) * 0.005,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.opacitySpeed;

        // Bounce opacity
        if (p.opacity <= 0.05 || p.opacity >= 0.5) {
          p.opacitySpeed *= -1;
        }

        // Wrap around
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
        if (p.y < -5) p.y = canvas.height + 5;
        if (p.y > canvas.height + 5) p.y = -5;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 150, 125, ${p.opacity})`;
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    resizeCanvas();
    createParticles();
    animate();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      createParticles();
    });
    resizeObserver.observe(canvas.parentElement);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
    };
  }, [showParticles]);

  const sizeClasses = {
    sm: 'py-5 min-h-[90px]',
    md: 'py-10 min-h-[140px]',
    lg: 'py-14 min-h-[180px]',
  };

  return (
    <div className={`empty-state-container relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-[var(--color-coffee-milk)] border border-dashed border-[var(--color-border)] ${sizeClasses[size]}`}>
      {/* Lava Lamp Blob Background */}
      {showBlob && (
        <div className="empty-state-blobs absolute inset-0 pointer-events-none z-0" aria-hidden="true">
          <div className="empty-blob empty-blob-1" />
          <div className="empty-blob empty-blob-2" />
          <div className="empty-blob empty-blob-3" />
        </div>
      )}

      {/* Particle Dust Canvas */}
      {showParticles && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
          style={{ zIndex: 1 }}
        />
      )}

      {/* Floating Coffee Beans (Framer Motion Loop) */}
      {showBeans && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true" style={{ zIndex: 2 }}>
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute"
            style={{ left: '12%', top: '20%' }}
          >
            <CoffeeBean />
          </motion.div>
          <motion.div
            animate={{ y: [0, -10, 0], rotate: [0, -12, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute"
            style={{ left: '80%', top: '25%' }}
          >
            <CoffeeBean />
          </motion.div>
          <motion.div
            animate={{ y: [0, -6, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute"
            style={{ left: '48%', top: '65%' }}
          >
            <CoffeeBean />
          </motion.div>
        </div>
      )}

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center gap-2.5 px-4 text-center z-10">
        {icon && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-[var(--color-band-3)] mb-1"
          >
            {icon}
          </motion.div>
        )}
        
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-xs text-[var(--color-text-muted)] italic font-bold max-w-xs leading-normal"
        >
          {message}
        </motion.p>
        
        {sub && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-[10px] text-[var(--color-text-muted)] font-semibold max-w-xs"
          >
            {sub}
          </motion.p>
        )}

        {ctaLabel && onCtaClick && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCtaClick}
            className="mt-2 min-h-[36px] rounded-lg bg-[var(--color-band-1)] text-white text-[11px] font-black px-4.5 py-1.5 shadow-sm hover:shadow transition-all"
          >
            {ctaLabel}
          </motion.button>
        )}
      </div>
    </div>
  );
}

/**
 * SVG Coffee Bean - bentuk biji kopi/daun minimalis
 */
function CoffeeBean() {
  return (
    <svg
      width="16"
      height="20"
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="8"
        cy="10"
        rx="6.5"
        ry="8.5"
        fill="var(--color-band-3)"
        opacity="0.25"
      />
      <path
        d="M8 2.5C6.5 5.5 6.5 14.5 8 17.5"
        stroke="var(--color-band-1)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.25"
      />
    </svg>
  );
}
