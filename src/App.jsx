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
const OwnerCash = lazy(() => import('./pages/owner/OwnerCash'));
const OwnerMenuHPP = lazy(() => import('./pages/owner/OwnerMenuHPP'));
const OwnerApproval = lazy(() => import('./pages/owner/OwnerApproval'));
const OwnerReports = lazy(() => import('./pages/owner/OwnerReports'));
const OwnerSettings = lazy(() => import('./pages/owner/OwnerSettings'));

const PartnerSales = lazy(() => import('./pages/partner/PartnerSales'));
const PartnerReceipt = lazy(() => import('./pages/partner/PartnerReceipt'));
const PartnerStock = lazy(() => import('./pages/partner/PartnerStock'));
const PartnerExpenses = lazy(() => import('./pages/partner/PartnerExpenses'));
const PartnerCloseCash = lazy(() => import('./pages/partner/PartnerCloseCash'));
const PartnerNotes = lazy(() => import('./pages/partner/PartnerNotes'));

const AIAssistant = lazy(() => import('./pages/shared/AIAssistant'));
const ActivityLog = lazy(() => import('./pages/shared/ActivityLog'));

function PageLoader() {
  return (
    <main className="min-h-screen bg-[#faf6ef] px-4 py-6 md:pl-72 md:pr-8">
      <div className="h-3 w-32 rounded-full bg-stone-200" />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-lg bg-white shadow-sm" />
        <div className="h-28 rounded-lg bg-white shadow-sm" />
        <div className="h-28 rounded-lg bg-white shadow-sm" />
      </div>
    </main>
  );
}

function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === 'owner' ? '/owner/dashboard' : '/partner/sales'} replace />;
  }
  return children;
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore();
  const loadRemoteData = useAppStore((state) => state.loadRemoteData);

  useEffect(() => {
    loadRemoteData();
  }, [loadRemoteData]);

  return (
    <BrowserRouter>
      <ToastContainer />
      {isAuthenticated && <Sidebar />}
      {isAuthenticated && <BottomNav />}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            isAuthenticated
              ? <Navigate to={user?.role === 'owner' ? '/owner/dashboard' : '/partner/sales'} replace />
              : <Navigate to="/login" replace />
          } />

          {/* Owner Routes */}
          <Route path="/owner/dashboard" element={<ProtectedRoute allowedRole="owner"><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/owner/live-sales" element={<ProtectedRoute allowedRole="owner"><OwnerLiveSales /></ProtectedRoute>} />
          <Route path="/owner/expenses" element={<ProtectedRoute allowedRole="owner"><OwnerExpenses /></ProtectedRoute>} />
          <Route path="/owner/receipt" element={<ProtectedRoute allowedRole="owner"><PartnerReceipt /></ProtectedRoute>} />
          <Route path="/owner/stock" element={<ProtectedRoute allowedRole="owner"><OwnerStock /></ProtectedRoute>} />
          <Route path="/owner/cash" element={<ProtectedRoute allowedRole="owner"><OwnerCash /></ProtectedRoute>} />
          <Route path="/owner/menu-hpp" element={<ProtectedRoute allowedRole="owner"><OwnerMenuHPP /></ProtectedRoute>} />
          <Route path="/owner/approval" element={<ProtectedRoute allowedRole="owner"><OwnerApproval /></ProtectedRoute>} />
          <Route path="/owner/reports" element={<ProtectedRoute allowedRole="owner"><OwnerReports /></ProtectedRoute>} />
          <Route path="/owner/activity" element={<ProtectedRoute allowedRole="owner"><ActivityLog /></ProtectedRoute>} />
          <Route path="/owner/ai" element={<ProtectedRoute allowedRole="owner"><AIAssistant /></ProtectedRoute>} />
          <Route path="/owner/settings" element={<ProtectedRoute allowedRole="owner"><OwnerSettings /></ProtectedRoute>} />

          {/* Partner Routes */}
          <Route path="/partner/sales" element={<ProtectedRoute allowedRole="partner"><PartnerSales /></ProtectedRoute>} />
          <Route path="/partner/receipt" element={<ProtectedRoute allowedRole="partner"><PartnerReceipt /></ProtectedRoute>} />
          <Route path="/partner/stock" element={<ProtectedRoute allowedRole="partner"><PartnerStock /></ProtectedRoute>} />
          <Route path="/partner/expenses" element={<ProtectedRoute allowedRole="partner"><PartnerExpenses /></ProtectedRoute>} />
          <Route path="/partner/close-cash" element={<ProtectedRoute allowedRole="partner"><PartnerCloseCash /></ProtectedRoute>} />
          <Route path="/partner/notes" element={<ProtectedRoute allowedRole="partner"><PartnerNotes /></ProtectedRoute>} />
          <Route path="/partner/ai" element={<ProtectedRoute allowedRole="partner"><AIAssistant /></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
