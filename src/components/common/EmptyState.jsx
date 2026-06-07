import { useEffect, useRef } from 'react';

/**
 * EmptyState — Komponen reusable untuk area kosong dengan animasi satisfying.
 * 
 * Fitur animasi:
 * 1. Floating Coffee Beans — biji kopi SVG melayang pelan
 * 2. Lava Lamp Blob — gradient blob organik bergerak di background
 * 3. Particle Dust — partikel kecil bergerak random
 * 
 * @param {string} message - Teks yang ditampilkan
 * @param {React.ReactNode} icon - Ikon opsional (Lucide, dll)
 * @param {string} sub - Sub-teks opsional
 * @param {'sm' | 'md' | 'lg'} size - Ukuran container
 * @param {boolean} showBeans - Tampilkan floating beans (default: true)
 * @param {boolean} showBlob - Tampilkan lava blob (default: true)
 * @param {boolean} showParticles - Tampilkan particle dust (default: true)
 */
export default function EmptyState({
  message = 'Belum ada data.',
  icon,
  sub,
  size = 'md',
  showBeans = true,
  showBlob = true,
  showParticles = true,
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
        ctx.fillStyle = `rgba(141, 166, 147, ${p.opacity})`;
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
    sm: 'py-4 min-h-[80px]',
    md: 'py-8 min-h-[120px]',
    lg: 'py-12 min-h-[160px]',
  };

  return (
    <div className={`empty-state-container relative overflow-hidden rounded-xl ${sizeClasses[size]}`}>
      {/* Lava Lamp Blob Background */}
      {showBlob && (
        <div className="empty-state-blobs" aria-hidden="true">
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

      {/* Floating Coffee Beans */}
      {showBeans && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true" style={{ zIndex: 2 }}>
          <CoffeeBean className="empty-bean empty-bean-1" style={{ left: '12%', top: '20%' }} />
          <CoffeeBean className="empty-bean empty-bean-2" style={{ left: '75%', top: '30%' }} />
          <CoffeeBean className="empty-bean empty-bean-3" style={{ left: '45%', top: '65%' }} />
        </div>
      )}

      {/* Content */}
      <div className="relative flex flex-col items-center justify-center gap-2 px-4" style={{ zIndex: 3 }}>
        {icon && (
          <div className="empty-state-icon text-[var(--color-band-3)] mb-1">
            {icon}
          </div>
        )}
        <p className="text-xs text-[var(--color-text-muted)] italic text-center leading-relaxed">
          {message}
        </p>
        {sub && (
          <p className="text-[10px] text-[var(--color-text-muted)] opacity-60 text-center">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * SVG Coffee Bean — bentuk biji kopi minimalis
 */
function CoffeeBean({ className = '', style = {} }) {
  return (
    <svg
      className={className}
      style={style}
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
        opacity="0.2"
      />
    </svg>
  );
}
