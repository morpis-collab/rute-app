import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, Lock, Loader2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import useToastStore from '../store/useToastStore';
import { postLogin } from '../services/apiClient';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { login } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!selectedRole) return;
    const normalizedPin = pin.trim();
    if (!normalizedPin) {
      setErrorMsg('PIN harus diisi');
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
      setErrorMsg(error.response?.data?.error || error.response?.data?.message || 'Login gagal, periksa PIN Anda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-bg-primary)] via-[var(--color-accent-light)]/30 to-[var(--color-bg-secondary)] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="w-full max-w-sm relative z-20">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-white flex items-center justify-center shadow-lg p-2 overflow-hidden">
            <img src="/rute-logo.png" alt="RUTE Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">RUTE Coffee</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Sistem Manajemen Usaha Kopi</p>
        </div>

        {/* Role Selection */}
        <div className="space-y-3 mb-8">
          <p className="text-sm font-medium text-[var(--color-text-secondary)] text-center mb-4">
            Pilih role untuk masuk
          </p>

          {/* Owner Card */}
          <button
            onClick={() => setSelectedRole('owner')}
            className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center gap-4 ${
              selectedRole === 'owner'
                ? 'border-[var(--color-accent-primary)] bg-gradient-to-r from-[var(--color-accent-light)]/50 to-white shadow-md'
                : 'border-[var(--color-border)] bg-white hover:border-[var(--color-accent-warm)] hover:shadow-sm'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              selectedRole === 'owner'
                ? 'bg-[var(--color-accent-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
            }`}>
              <User size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">Owner</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Dashboard lengkap</p>
            </div>
          </button>

          {/* Partner Card */}
          <button
            onClick={() => setSelectedRole('partner')}
            className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-center gap-4 ${
              selectedRole === 'partner'
                ? 'border-[var(--color-accent-primary)] bg-gradient-to-r from-[var(--color-accent-light)]/50 to-white shadow-md'
                : 'border-[var(--color-border)] bg-white hover:border-[var(--color-accent-warm)] hover:shadow-sm'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              selectedRole === 'partner'
                ? 'bg-[var(--color-accent-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
            }`}>
              <Users size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--color-text-primary)]">Partner</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Input operasional</p>
            </div>
          </button>
        </div>

        {/* PIN Input (Shows after selecting role) */}
        {selectedRole && (
          <div className="mb-6 fade-in">
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Masukkan PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                <Lock size={18} />
              </div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="PIN 6 digit"
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 border-[var(--color-border)] bg-white text-lg tracking-[0.3em] font-bold focus:border-[var(--color-accent-primary)] focus:ring-0 outline-none transition-all placeholder:font-normal placeholder:tracking-normal"
              />
            </div>
            {errorMsg && (
              <p className="mt-2 text-sm text-[var(--color-accent-red)] flex items-center gap-1 slide-in">
                <span>!</span> {errorMsg}
              </p>
            )}
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={!selectedRole || loading}
          className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            selectedRole && !loading
              ? 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Memverifikasi...
            </>
          ) : (
            `Masuk sebagai ${selectedRole === 'owner' ? 'Owner' : selectedRole === 'partner' ? 'Partner' : '...'}`
          )}
        </button>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          RUTE Coffee System · Authenticated
        </p>
      </div>
    </div>
  );
}
