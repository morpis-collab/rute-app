import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/useAuthStore';
import useAppStore from './store/useAppStore';

// Layout
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import ToastContainer from './components/common/ToastContainer';

// Pages
import Login from './pages/Login';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerLiveSales from './pages/owner/OwnerLiveSales';
import OwnerExpenses from './pages/owner/OwnerExpenses';
import OwnerStock from './pages/owner/OwnerStock';
import OwnerCash from './pages/owner/OwnerCash';
import OwnerMenuHPP from './pages/owner/OwnerMenuHPP';
import OwnerApproval from './pages/owner/OwnerApproval';
import OwnerReports from './pages/owner/OwnerReports';
import OwnerSettings from './pages/owner/OwnerSettings';

import PartnerSales from './pages/partner/PartnerSales';
import PartnerReceipt from './pages/partner/PartnerReceipt';
import PartnerStock from './pages/partner/PartnerStock';
import PartnerExpenses from './pages/partner/PartnerExpenses';
import PartnerCloseCash from './pages/partner/PartnerCloseCash';
import PartnerNotes from './pages/partner/PartnerNotes';

import AIAssistant from './pages/shared/AIAssistant';
import ActivityLog from './pages/shared/ActivityLog';

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
    </BrowserRouter>
  );
}
