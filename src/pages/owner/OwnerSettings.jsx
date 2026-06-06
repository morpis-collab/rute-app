import { useState } from 'react';
import { Palette, Receipt, User, Lock, Save, LogOut } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAuthStore from '../../store/useAuthStore';
import useSettingsStore from '../../store/useSettingsStore';
import useToastStore from '../../store/useToastStore';

export default function OwnerSettings() {
  const { user, token, login, logout } = useAuthStore();
  const { addToast } = useToastStore();
  const {
    receiptHeaderName,
    receiptAddress,
    receiptPhone,
    receiptFooter,
    receiptPaperSize,
    theme,
    updateSettings,
  } = useSettingsStore();

  // Receipt form states
  const [headerName, setHeaderName] = useState(receiptHeaderName || '');
  const [address, setAddress] = useState(receiptAddress || '');
  const [phone, setPhone] = useState(receiptPhone || '');
  const [footer, setFooter] = useState(receiptFooter || '');
  const [paperSize, setPaperSize] = useState(receiptPaperSize || '58mm');

  // Account form states
  const [profileName, setProfileName] = useState(user?.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveReceiptSettings = (e) => {
    e.preventDefault();
    if (!headerName.trim()) {
      addToast('Nama usaha di struk tidak boleh kosong!', 'error');
      return;
    }
    updateSettings({
      receiptHeaderName: headerName.trim(),
      receiptAddress: address.trim(),
      receiptPhone: phone.trim(),
      receiptFooter: footer,
      receiptPaperSize: paperSize,
    });
    addToast('Pengaturan struk kasir berhasil disimpan!', 'success');
  };

  const handleSaveAccountSettings = (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      addToast('Nama lengkap tidak boleh kosong!', 'error');
      return;
    }

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        addToast('Kata sandi baru minimal harus 6 karakter!', 'error');
        return;
      }
      if (newPassword !== confirmPassword) {
        addToast('Konfirmasi kata sandi tidak cocok!', 'error');
        return;
      }
    }

    // Update locally in auth store
    login({ ...user, name: profileName.trim() }, token);
    
    addToast('Profil & keamanan berhasil diperbarui!', 'success');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleThemeChange = (newTheme) => {
    updateSettings({ theme: newTheme });
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      addToast('Tema Espresso Aktif!', 'success');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      addToast('Tema Terang Aktif!', 'success');
    }
  };

  return (
    <PageWrapper title="Pengaturan" subtitle="Manajemen akun dan sistem">
      <div className="space-y-6 max-w-2xl">
        {/* System Theme Card */}
        <div className="kpi-card">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="text-[var(--color-band-1)]" size={18} />
            <h3 className="text-sm font-semibold">Tema Sistem</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleThemeChange('light')}
              className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                theme !== 'dark'
                  ? 'border-[var(--color-band-1)] bg-[var(--color-band-4)] text-[var(--color-band-1)] font-bold'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              Mode Terang
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-[var(--color-band-1)] bg-[var(--color-band-1)] text-white font-bold'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              Mode Espresso (Gelap)
            </button>
          </div>
        </div>

        {/* Receipt Settings Card */}
        <form onSubmit={handleSaveReceiptSettings} className="kpi-card space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
            <Receipt className="text-[var(--color-band-1)]" size={18} />
            <h3 className="text-sm font-semibold">Pengaturan Struk Kasir</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Nama Usaha (Header)</label>
              <input
                type="text"
                value={headerName}
                onChange={(e) => setHeaderName(e.target.value)}
                placeholder="Misal: ruang.tengah"
                className="form-input text-xs focus:border-[var(--color-band-1)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">No. Telepon Toko</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Misal: 0812-3456-7890"
                  className="form-input text-xs focus:border-[var(--color-band-1)]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Ukuran Kertas</label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="form-select text-xs p-2.5 focus:border-[var(--color-band-1)]"
                >
                  <option value="58mm">Thermal 58mm</option>
                  <option value="80mm">Thermal 80mm</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Alamat Toko</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat lengkap usaha"
                className="form-input text-xs focus:border-[var(--color-band-1)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Teks Kaki Struk (Footer)</label>
              <textarea
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                rows={2}
                placeholder="Kalimat penutup struk"
                className="form-input text-xs resize-none focus:border-[var(--color-band-1)]"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
            <Save size={14} /> Simpan Struk
          </button>
        </form>

        {/* Profile & Password Card */}
        <form onSubmit={handleSaveAccountSettings} className="kpi-card space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
            <User className="text-[var(--color-band-1)]" size={18} />
            <h3 className="text-sm font-semibold">Profil & Keamanan Akun</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="form-input text-xs focus:border-[var(--color-band-1)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Email Pengguna (Muted)</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="form-input text-xs bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed border-dashed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)] border-dashed">
              <div>
                <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Lock size={12} /> Sandi Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="form-input text-xs focus:border-[var(--color-band-1)]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider block mb-1">Konfirmasi Sandi</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang sandi"
                  className="form-input text-xs focus:border-[var(--color-band-1)]"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
            <Save size={14} /> Simpan Perubahan Akun
          </button>
        </form>

        {/* Log Out */}
        <button onClick={logout} className="w-full btn btn-danger py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
          <LogOut size={16} /> Keluar dari Akun
        </button>
      </div>
    </PageWrapper>
  );
}
