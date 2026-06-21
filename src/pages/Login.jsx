import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Delete, Loader2, ShieldCheck, Wifi } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import useToastStore from '../store/useToastStore';
import { postLogin } from '../services/apiClient';
import { softSpring, staggerContainer, staggerItem, tapPress } from '../utils/motion';

export default function Login() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  const { login } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const triggerError = (msg) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async (currentPin = pin) => {
    const normalizedPin = currentPin.trim();
    if (!normalizedPin) {
      triggerError('PIN owner harus diisi');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await postLogin({ pin: normalizedPin });
      login(response.user, response.token);
      addToast('Berhasil masuk sebagai Owner', 'success');
      navigate('/owner/dashboard');
    } catch (error) {
      triggerError(error.response?.data?.error || error.response?.data?.message || 'Login gagal, periksa PIN owner');
    } finally {
      setLoading(false);
    }
  };

  const handlePinKeyPress = (num) => {
    if (loading) return;
    setErrorMsg('');
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6) handleLogin(newPin);
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setErrorMsg('');
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    if (loading) return;
    setPin('');
    setErrorMsg('');
  };

  return (
    <main id="main-content" className="relative flex min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[var(--color-coffee-dark)] p-12 text-white md:flex">
        <div className="absolute inset-0 z-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/25 to-transparent" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 p-1.5 backdrop-blur-md">
            <img src="/rute-logo.png" alt="RUTE Logo" className="h-full w-full object-contain brightness-0 invert" />
          </div>
          <span className="brand-title text-lg font-semibold uppercase tracking-[0.08em]">RUTE Cash Tracer</span>
        </div>

        <div className="relative z-10 my-auto max-w-md space-y-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/55">brief operasional</p>
          <h2 className="font-display text-4xl font-semibold leading-[0.98] lg:text-5xl">
            Satu panel untuk closing dan brankas usaha
          </h2>
          <p className="max-w-sm text-sm font-medium leading-relaxed text-white/72">
            Owner menginput penjualan dari buku closing, mencocokkan uang laci, lalu membagi dana ke brankas bahan baku, operasional, dan keuntungan.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-bold text-white/70">
            <div className="border border-white/12 bg-white/[0.06] p-3">
              <span className="mb-2 flex h-8 w-8 items-center justify-center bg-white/10 text-white">
                <Wifi size={16} />
              </span>
              <span className="block text-lg font-semibold text-white">API aktif</span>
              <span>Fallback mock tersedia</span>
            </div>
            <div className="border border-white/12 bg-white/[0.06] p-3">
              <span className="mb-2 flex h-8 w-8 items-center justify-center bg-white/10 text-white">
                <ShieldCheck size={16} />
              </span>
              <span className="block text-lg font-semibold text-white">PIN owner</span>
              <span>Akses tunggal operasional</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs font-semibold text-white/50">
          {new Date().getFullYear()} - RUTE Coffee Operations
        </div>
      </div>

      <div className="flex min-w-0 w-full flex-col justify-center overflow-hidden px-4 py-8 md:w-1/2 lg:px-16">
        <motion.div
          animate={!shouldReduceMotion && shake ? { x: [0, -10, 10, -10, 10, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-0 w-full max-w-[21.5rem] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white/90 p-6 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:mx-auto sm:p-8 md:bg-white/78"
        >
          <div className="mb-8 text-center md:text-left">
            <div className="mx-auto mb-4 flex h-18 w-18 items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-2.5 shadow-sm md:mx-0">
              <img src="/rute-logo.png" alt="RUTE Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="font-display text-2xl font-semibold leading-tight text-[var(--color-text-primary)]">Masuk ke Cash Tracer</h1>
            <p className="mt-1 text-sm font-medium text-[var(--color-text-muted)]">Masukkan PIN owner untuk membuka panel operasional.</p>
          </div>

          <div className="space-y-6">
            <div className="text-center">
              <label className="mb-3 block text-sm font-bold text-[var(--color-text-secondary)]">
                PIN Akses Owner
              </label>
              <div className="flex justify-center gap-3 py-2">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`h-4.5 w-4.5 rounded-full border-2 transition-all ${
                      pin.length > idx
                        ? 'scale-110 border-[var(--color-band-1)] bg-[var(--color-band-1)] shadow-sm'
                        : 'border-[var(--color-border)] bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            {errorMsg && (
              <p className="slide-in text-center text-xs font-bold text-[var(--color-accent-red)]">
                {errorMsg}
              </p>
            )}

            <motion.div
              variants={shouldReduceMotion ? undefined : staggerContainer}
              initial={shouldReduceMotion ? false : 'hidden'}
              animate="show"
              className="grid grid-cols-3 gap-3"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <motion.button
                  key={num}
                  variants={shouldReduceMotion ? undefined : staggerItem}
                  whileTap={shouldReduceMotion ? undefined : tapPress}
                  transition={softSpring}
                  onClick={() => handlePinKeyPress(num)}
                  className="flex h-14 select-none items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white text-lg font-bold text-[var(--color-text-primary)] shadow-sm touch-manipulation hover:border-[var(--color-band-1)] hover:bg-[var(--color-band-4)] hover:text-[var(--color-band-1)] active:scale-[0.94]"
                >
                  {num}
                </motion.button>
              ))}
              <motion.button
                onClick={handleClear}
                variants={shouldReduceMotion ? undefined : staggerItem}
                whileTap={shouldReduceMotion ? undefined : tapPress}
                transition={softSpring}
                className="flex h-14 select-none items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white text-xs font-bold text-[var(--color-text-muted)] touch-manipulation hover:bg-[var(--color-coffee-milk)] active:scale-[0.94]"
              >
                Hapus
              </motion.button>
              <motion.button
                onClick={() => handlePinKeyPress(0)}
                variants={shouldReduceMotion ? undefined : staggerItem}
                whileTap={shouldReduceMotion ? undefined : tapPress}
                transition={softSpring}
                className="flex h-14 select-none items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white text-lg font-bold text-[var(--color-text-primary)] shadow-sm touch-manipulation hover:border-[var(--color-band-1)] hover:bg-[var(--color-band-4)] hover:text-[var(--color-band-1)] active:scale-[0.94]"
              >
                0
              </motion.button>
              <motion.button
                onClick={handleBackspace}
                variants={shouldReduceMotion ? undefined : staggerItem}
                whileTap={shouldReduceMotion ? undefined : tapPress}
                transition={softSpring}
                className="flex h-14 select-none items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] touch-manipulation hover:bg-[var(--color-coffee-milk)] active:scale-[0.94]"
                title="Backspace"
              >
                <Delete size={18} />
              </motion.button>
            </motion.div>

            <button
              onClick={() => handleLogin()}
              disabled={pin.length < 4 || loading}
              className={`flex w-full items-center justify-center gap-2 rounded-[var(--radius-button)] py-3.5 text-sm font-bold transition-all ${
                pin.length >= 4 && !loading
                  ? 'bg-gradient-to-r from-[var(--color-band-1)] to-[var(--color-band-2)] text-white shadow-md hover:shadow-lg'
                  : 'cursor-not-allowed bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                'Masuk Sekarang'
              )}
            </button>
          </div>

          <p className="mt-8 text-center text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            akses demo mengikuti koneksi backend aktif
          </p>
        </motion.div>
      </div>
    </main>
  );
}
