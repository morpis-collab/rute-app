import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import useAuthStore from './store/useAuthStore';
import useAppStore from './store/useAppStore';

// Layout
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import ToastContainer from './components/common/ToastContainer';

const Login = lazy(() => import('./pages/Login'));
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard'));
const OwnerIncomes = lazy(() => import('./pages/owner/OwnerIncomes'));
const OwnerExpenses = lazy(() => import('./pages/owner/OwnerExpenses'));
const OwnerStock = lazy(() => import('./pages/owner/OwnerStock'));
const OwnerCash = lazy(() => import('./pages/owner/OwnerCash'));
const OwnerSettings = lazy(() => import('./pages/owner/OwnerSettings'));

function PageLoader() {
  return (
    <main id="main-content" className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-6 md:pl-72 md:pr-8 space-y-6">
      <div className="h-8 w-48 skeleton" />
      <div className="grid gap-4 md:grid-cols-4">
        <div className="h-24 rounded-[var(--radius-card)] skeleton" />
        <div className="h-24 rounded-[var(--radius-card)] skeleton" />
        <div className="h-24 rounded-[var(--radius-card)] skeleton" />
        <div className="h-24 rounded-[var(--radius-card)] skeleton" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-64 rounded-[var(--radius-card)] md:col-span-2 skeleton" />
        <div className="h-64 rounded-[var(--radius-card)] skeleton" />
      </div>
    </main>
  );
}

function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to="/owner/dashboard" replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const loadRemoteData = useAppStore((state) => state.loadRemoteData);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadRemoteData();
  }, [isAuthenticated, loadRemoteData]);

  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">Lewati ke konten utama</a>
      <ToastContainer />
      {isAuthenticated && <Sidebar />}
      {isAuthenticated && <BottomNav />}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            isAuthenticated
              ? <Navigate to="/owner/dashboard" replace />
              : <Navigate to="/login" replace />
          } />

          {/* Owner Routes */}
          <Route path="/owner/dashboard" element={<ProtectedRoute allowedRole="owner"><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/owner/incomes" element={<ProtectedRoute allowedRole="owner"><OwnerIncomes /></ProtectedRoute>} />
          <Route path="/owner/expenses" element={<ProtectedRoute allowedRole="owner"><OwnerExpenses /></ProtectedRoute>} />
          <Route path="/owner/cash" element={<ProtectedRoute allowedRole="owner"><OwnerCash /></ProtectedRoute>} />
          <Route path="/owner/stock" element={<ProtectedRoute allowedRole="owner"><OwnerStock /></ProtectedRoute>} />
          <Route path="/owner/settings" element={<ProtectedRoute allowedRole="owner"><OwnerSettings /></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/owner/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
