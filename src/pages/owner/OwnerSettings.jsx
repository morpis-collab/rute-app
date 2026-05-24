import PageWrapper from '../../components/layout/PageWrapper';
import useAuthStore from '../../store/useAuthStore';

export default function OwnerSettings() {
  const { user, logout } = useAuthStore();
  return (
    <PageWrapper title="Pengaturan" subtitle="Manajemen akun dan sistem">
      <div className="space-y-3">
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-3">Informasi Akun</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Nama</span><span>{user?.name}</span></div>
            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Email</span><span>{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Role</span><span className="capitalize">{user?.role}</span></div>
          </div>
        </div>
        <div className="kpi-card">
          <h3 className="text-sm font-semibold mb-3">Info Usaha</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Nama Usaha</span><span>Ruang Tengah Coffee</span></div>
            <div className="flex justify-between"><span className="text-[var(--color-text-muted)]">Lokasi</span><span>Kaltara</span></div>
          </div>
        </div>
        <button onClick={logout} className="w-full btn btn-danger">Keluar dari Akun</button>
      </div>
    </PageWrapper>
  );
}
