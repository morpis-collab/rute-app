import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function Login() {
  const [selectedRole, setSelectedRole] = useState(null);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!selectedRole) return;
    login(selectedRole);
    navigate(selectedRole === 'owner' ? '/owner/dashboard' : '/partner/sales');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-bg-primary)] via-[var(--color-accent-light)]/30 to-[var(--color-bg-secondary)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
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
              <p className="text-xs text-[var(--color-text-muted)]">Dashboard lengkap · Tarakan</p>
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
              <p className="text-xs text-[var(--color-text-muted)]">Input operasional · Malinau</p>
            </div>
          </button>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={!selectedRole}
          className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 ${
            selectedRole
              ? 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed'
          }`}
        >
          Masuk sebagai {selectedRole === 'owner' ? 'Owner' : selectedRole === 'partner' ? 'Partner' : '...'}
        </button>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          Prototype v1.0 · Mock Authentication
        </p>
      </div>
    </div>
  );
}
