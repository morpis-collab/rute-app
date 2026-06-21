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
const OwnerLiveSales = lazy(() => import('./pages/owner/OwnerLiveSales'));
const OwnerExpenses = lazy(() => import('./pages/owner/OwnerExpenses'));
const OwnerStock = lazy(() => import('./pages/owner/OwnerStock'));
const OwnerRestockPlanner = lazy(() => import('./pages/owner/OwnerRestockPlanner'));
const OwnerCash = lazy(() => import('./pages/owner/OwnerCash'));
const OwnerMenuHPP = lazy(() => import('./pages/owner/OwnerMenuHPP'));
const OwnerApproval = lazy(() => import('./pages/owner/OwnerApproval'));
const OwnerReports = lazy(() => import('./pages/owner/OwnerReports'));
const OwnerPromotions = lazy(() => import('./pages/owner/OwnerPromotions'));
const OwnerSettings = lazy(() => import('./pages/owner/OwnerSettings'));
const OwnerOpeningCapital = lazy(() => import('./pages/owner/OwnerOpeningCapital'));
const OwnerRevenueAllocation = lazy(() => import('./pages/owner/OwnerRevenueAllocation'));
const OwnerCloseCash = lazy(() => import('./pages/owner/OwnerCloseCash'));

const ActivityLog = lazy(() => import('./pages/shared/ActivityLog'));

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
          <Route path="/owner/live-sales" element={<ProtectedRoute allowedRole="owner"><OwnerLiveSales /></ProtectedRoute>} />
          <Route path="/owner/close-cash" element={<ProtectedRoute allowedRole="owner"><OwnerCloseCash /></ProtectedRoute>} />
          <Route path="/owner/expenses" element={<ProtectedRoute allowedRole="owner"><OwnerExpenses /></ProtectedRoute>} />
          <Route path="/owner/receipt" element={<ProtectedRoute allowedRole="owner"><Navigate to="/owner/expenses" replace /></ProtectedRoute>} />
          <Route path="/owner/stock" element={<ProtectedRoute allowedRole="owner"><OwnerStock /></ProtectedRoute>} />
          <Route path="/owner/restock-planner" element={<ProtectedRoute allowedRole="owner"><OwnerRestockPlanner /></ProtectedRoute>} />
          <Route path="/owner/cash" element={<ProtectedRoute allowedRole="owner"><OwnerCash /></ProtectedRoute>} />
          <Route path="/owner/menu-hpp" element={<ProtectedRoute allowedRole="owner"><OwnerMenuHPP /></ProtectedRoute>} />
          <Route path="/owner/approval" element={<ProtectedRoute allowedRole="owner"><OwnerApproval /></ProtectedRoute>} />
          <Route path="/owner/reports" element={<ProtectedRoute allowedRole="owner"><OwnerReports /></ProtectedRoute>} />
          <Route path="/owner/promotions" element={<ProtectedRoute allowedRole="owner"><OwnerPromotions /></ProtectedRoute>} />
          <Route path="/owner/activity" element={<ProtectedRoute allowedRole="owner"><ActivityLog /></ProtectedRoute>} />
          <Route path="/owner/ai" element={<ProtectedRoute allowedRole="owner"><Navigate to="/owner/dashboard" replace /></ProtectedRoute>} />
          <Route path="/owner/settings" element={<ProtectedRoute allowedRole="owner"><OwnerSettings /></ProtectedRoute>} />
          <Route path="/owner/opening-capital" element={<ProtectedRoute allowedRole="owner"><OwnerOpeningCapital /></ProtectedRoute>} />
          <Route path="/owner/revenue-allocation" element={<ProtectedRoute allowedRole="owner"><OwnerRevenueAllocation /></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
