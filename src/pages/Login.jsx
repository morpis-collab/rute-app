import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, Loader2, ArrowLeft, Delete } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useToastStore from '../store/useToastStore';
import { postLogin } from '../services/apiClient';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);
  
  const { login } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const handleLogin = async (currentPin = pin) => {
    if (!selectedRole) return;
    const normalizedPin = currentPin.trim();
    if (!normalizedPin) {
      triggerError('PIN harus diisi');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await postLogin({ role: selectedRole, pin: normalizedPin });
      login(response.user, response.token);
      addToast(`Berhasil masuk sebagai ${response.user.role === 'owner' ? 'Owner' : 'Partner'}`, 'success');
      navigate(selectedRole === 'owner' ? '/owner/dashboard' : '/partner/sales');
    } catch (error) {
      triggerError(error.response?.data?.error || error.response?.data?.message || 'Login gagal, periksa PIN Anda');
    } finally {
      setLoading(false);
    }
  };

  const triggerError = (msg) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handlePinKeyPress = (num) => {
    if (loading) return;
    setErrorMsg('');
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6) {
        // Automatically submit when 6 digits are typed
        handleLogin(newPin);
      }
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
    <div className="relative flex min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* LEFT SIDE: Branding Area (Desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--color-band-1)] to-[var(--color-band-2)] p-12 text-white md:flex">
        {/* Floating background shapes */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-black/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 p-1.5 backdrop-blur-md">
            <img src="/rute-logo.png" alt="RUTE Logo" className="h-full w-full object-contain brightness-0 invert" />
          </div>
          <span className="text-lg font-black tracking-wider uppercase">RUTE Coffee</span>
        </div>

        <div className="relative z-10 my-auto max-w-md space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
            Command Center <br />
            & Operasional Usaha
          </h2>
          <p className="text-white/80 text-sm font-medium leading-relaxed">
            Menghubungkan partner/operator outlet dengan owner secara real-time. Kelola transaksi, stok gudang, dan keuangan dengan ringkas dalam satu aplikasi.
          </p>
          <div className="flex items-center gap-6 pt-4 text-xs font-bold text-white/60">
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-white">100%</span>
              <span>Real-Time Sync</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-white">AI-Powered</span>
              <span>Scan Resi Pintar</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs font-semibold text-white/50">
          &copy; {new Date().getFullYear()} RUTE Coffee. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: Login Widget Panel */}
      <div className="flex w-full flex-col justify-center px-4 py-8 md:w-1/2 lg:px-16">
        <motion.div
          animate={shake ? { x: [0, -10, 10, -10, 10, -5, 5, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-sm rounded-[24px] border border-[var(--color-border)] bg-white/90 p-8 shadow-[var(--shadow-lg)] backdrop-blur-xl md:border-0 md:bg-transparent md:shadow-none"
        >
          {/* Header Mobile Logo */}
          <div className="mb-8 text-center md:text-left">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-2.5 shadow-sm md:mx-0">
              <img src="/rute-logo.png" alt="RUTE Logo" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Selamat Datang</h1>
            <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">RUTE Coffee Management System</p>
          </div>

          <AnimatePresence mode="wait">
            {!selectedRole ? (
              /* Role Selection View */
              <motion.div
                key="role-select"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  PILIH HAK AKSES
                </p>

                {/* Owner Card */}
                <button
                  onClick={() => setSelectedRole('owner')}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-4 text-left shadow-sm transition-all duration-300 hover:border-[var(--color-band-1)] hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-band-4)] text-[var(--color-band-1)] transition-colors group-hover:bg-[var(--color-band-1)] group-hover:text-white">
                    <User size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--color-text-primary)]">Owner</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">Dasbor lengkap, laporan HPP, & approval</p>
                  </div>
                </button>

                {/* Partner Card */}
                <button
                  onClick={() => setSelectedRole('partner')}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-4 text-left shadow-sm transition-all duration-300 hover:border-[var(--color-band-1)] hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-band-4)] text-[var(--color-band-1)] transition-colors group-hover:bg-[var(--color-band-1)] group-hover:text-white">
                    <Users size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--color-text-primary)]">Partner / Kasir</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">Penjualan cepat, stok harian, & input resi</p>
                  </div>
                </button>
              </motion.div>
            ) : (
              /* PIN Input & PIN Pad View */
              <motion.div
                key="pin-entry"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedRole(null); setPin(''); setErrorMsg(''); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Masuk Sebagai: <span className="text-[var(--color-band-1)]">{selectedRole === 'owner' ? 'Owner' : 'Partner'}</span>
                  </span>
                </div>

                <div className="text-center">
                  <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-3">
                    Masukkan PIN Akses
                  </label>
                  {/* Interactive Dot Display */}
                  <div className="flex justify-center gap-3 py-2">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <div
                        key={idx}
                        className={`h-4.5 w-4.5 rounded-full border-2 transition-all ${
                          pin.length > idx
                            ? 'bg-[var(--color-band-1)] border-[var(--color-band-1)] scale-110 shadow-sm'
                            : 'border-[var(--color-border)] bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-center text-xs font-bold text-[var(--color-accent-red)] slide-in">
                    {errorMsg}
                  </p>
                )}

                {/* Custom PIN Pad */}
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handlePinKeyPress(num)}
                      className="flex h-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white text-lg font-bold text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-band-1)] hover:bg-[var(--color-band-4)] hover:text-[var(--color-band-1)] active:scale-90 select-none touch-manipulation"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handleClear}
                    className="flex h-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white text-xs font-bold text-[var(--color-text-muted)] hover:bg-gray-50 active:scale-90 select-none touch-manipulation"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={() => handlePinKeyPress(0)}
                    className="flex h-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white text-lg font-bold text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-band-1)] hover:bg-[var(--color-band-4)] hover:text-[var(--color-band-1)] active:scale-90 select-none touch-manipulation"
                  >
                    0
                  </button>
                  <button
                    onClick={handleBackspace}
                    className="flex h-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-gray-50 active:scale-90 select-none touch-manipulation"
                    title="Backspace"
                  >
                    <Delete size={18} />
                  </button>
                </div>

                {/* Standard submit button in case pad fails or auto-submit is not enough */}
                <button
                  onClick={() => handleLogin()}
                  disabled={pin.length < 4 || loading}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    pin.length >= 4 && !loading
                      ? 'bg-gradient-to-r from-[var(--color-band-1)] to-[var(--color-band-2)] text-white shadow-md hover:shadow-lg'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed'
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
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-[10px] font-bold text-[var(--color-text-muted)] mt-8 uppercase tracking-widest">
            SISTEM KEAMANAN TERVERIFIKASI
          </p>
        </motion.div>
      </div>
    </div>
  );
}
