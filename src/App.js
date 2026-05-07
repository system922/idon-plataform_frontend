import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/admin_idon/AdminDashboard';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './admin/layout/AdminLayout';
import Features from './pages/admin_idon/Features';
import Templates from './pages/admin_idon/Templates';
import Plans from './pages/admin_idon/Plans';
import Payments from './pages/admin_idon/Payments';
import Roles from './pages/admin_idon/Roles';
import Settings from './pages/admin_idon/Settings';
import Audit from './pages/admin_idon/Audit';
import Clientes from './pages/admin_idon/Clientes';
import Modulos from './pages/admin_idon/Modulos';
import Users from './pages/admin_idon/Users';
import Requests from './pages/admin_idon/Requests';
import BusinessTypes from './pages/admin_idon/BusinessTypes';
import ProfilePage from './pages/ProfilePage';
import PublicLayout from './admin/layout/PublicLayout';

// ── Business panel ──────────────────────────────────────────
import BusinessLayout from './admin/layout/BusinessLayout';
import { businessRoutes } from './routes/businessRoutes';
import PendingApprovalPage from './pages/PendingApprovalPage';

/* Páginas Legales */
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';

// ========== NUEVO: Contexto global para gastos pendientes ==========
import { DrawerProvider } from './context/DrawerContext';
import GlobalExpenseBubble from './components/GlobalExpenseBubble';

function RegisterPageWrapper({ setUser }) {
  const navigate = useNavigate();
  return (
    <RegisterPage
      onRegisterSuccess={(userData) => {
        setUser(userData);
        localStorage.setItem('idonUser', JSON.stringify(userData));
      }}
      onNavigateToLogin={() => navigate('/login')}
    />
  );
}

function AppRoutes({ user, setUser, handleLogout }) {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to="/app/dashboard" replace />
          ) : (
            <LoginPage
              onLogin={(userData) => {
                setUser(userData);
                localStorage.setItem('idonUser', JSON.stringify(userData));
              }}
              onNavigateToRegister={() => {}}
            />
          )
        }
      />

      <Route
        path="/register"
        element={
          user
            ? <Navigate to="/app/dashboard" replace />
            : <RegisterPageWrapper setUser={setUser} />
        }
      />

      <Route path="/terms-and-conditions" element={<PublicLayout><TermsAndConditions /></PublicLayout>} />
      <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicy /></PublicLayout>} />

      <Route
        path="/pending-approval"
        element={
          user
            ? <PendingApprovalPage onLogout={handleLogout} />
            : <Navigate to="/login" replace />
        }
      />

      {/* RUTA PRINCIPAL - SIMPLIFICADA */}
      <Route
        path="/"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to="/app/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ADMIN ROUTES */}
      {user?.userType === 'admin_idon' && (
        <Route path="/admin/*" element={
          <AdminLayout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
              <Route path="businesses" element={<Clientes />} />
              <Route path="modules" element={<Modulos />} />
              <Route path="features" element={<Features />} />
              <Route path="templates" element={<Templates />} />
              <Route path="plans" element={<Plans />} />
              <Route path="payments" element={<Payments />} />
              <Route path="users" element={<Users />} />
              <Route path="roles" element={<Roles />} />
              <Route path="settings" element={<Settings />} />
              <Route path="audit" element={<Audit />} />
              <Route path="requests" element={<Requests />} />
              <Route path="business-types" element={<BusinessTypes />} />
              <Route path="profile" element={<ProfilePage user={user} />} />
            </Routes>
          </AdminLayout>
        } />
      )}

      {/* DASHBOARD ROUTE - SIMPLIFICADA */}
      <Route
        path="/dashboard"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to="/app/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* APP ROUTES - BUSINESS PANEL */}
      <Route
        path="/app/*"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : <BusinessLayout user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        {businessRoutes}
      </Route>

      {/* CATCH ALL */}
      <Route
        path="*"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to="/app/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function AppContent() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('idonUser')) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const PUBLIC_PATHS = ['/terms-and-conditions', '/privacy-policy', '/login', '/register'];

  useEffect(() => {
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    if (!token && user) {
      setUser(null);
      localStorage.removeItem('idonUser');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && !PUBLIC_PATHS.includes(location.pathname)) {
      localStorage.setItem('lastPath', location.pathname + location.search);
    }
  }, [location, user]);

  async function handleLogout() {
    setUser(null);
    localStorage.removeItem('idonUser');
    localStorage.removeItem('idonToken');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedBusiness');
    localStorage.removeItem('lastPath');
    navigate('/login', { replace: true });
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#080810',
      color: '#fff'
    }}>
      <div className="spinner"></div>
    </div>
  );

  return (
    <DrawerProvider>
      <AppRoutes user={user} setUser={setUser} handleLogout={handleLogout} />
      <GlobalExpenseBubble />
    </DrawerProvider>
  );
}

function AppShell() {
  const location = useLocation();
  if (location.pathname === '/terms-and-conditions') return <TermsAndConditions />;
  if (location.pathname === '/privacy-policy') return <PrivacyPolicy />;
  return <AppContent />;
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;