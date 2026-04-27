import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import AdminDashboard from './pages/admin_idon/AdminDashboard';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import AdminLayout  from './admin/layout/AdminLayout';
import Features     from './pages/admin_idon/Features';
import Templates    from './pages/admin_idon/Templates';
import Plans        from './pages/admin_idon/Plans';
import Payments     from './pages/admin_idon/Payments';
import Roles        from './pages/admin_idon/Roles';
import Settings     from './pages/admin_idon/Settings';
import Audit        from './pages/admin_idon/Audit';
import Clientes     from './pages/admin_idon/Clientes';
import Modulos      from './pages/admin_idon/Modulos';
import Users        from './pages/admin_idon/Users';
import Requests                from './pages/admin_idon/Requests';
import WhatsAppNotifications  from './pages/admin_idon/WhatsAppNotifications';
import WhatsAppConnect        from './pages/admin_idon/WhatsAppConnect';
import ProfilePage             from './pages/ProfilePage';

// ── Business panel ──────────────────────────────────────────
import BusinessLayout       from './admin/layout/BusinessLayout';
import { businessRoutes }   from './routes/businessRoutes';
import PendingApprovalPage  from './pages/PendingApprovalPage';

/* Páginas Legales */
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';

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
      {/* ── Rutas públicas ── */}
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

      {/* Rutas públicas: Políticas y términos */}
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      {/* ── Negocio pendiente de aprobación ── */}
      <Route
        path="/pending-approval"
        element={
          user
            ? <PendingApprovalPage onLogout={handleLogout} />
            : <Navigate to="/login" replace />
        }
      />

      {/* ── Raíz ── */}
      <Route
        path="/"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : (user?.userType === 'schema_employee' && user?.businessId)
                ? <Navigate to="/app/dashboard" replace />
              : (user?.userType === 'business_user' || !user?.businessId)
                ? <Navigate to="/pending-approval" replace />
                : <Navigate to="/app/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ── Panel SUPER ADMIN ── */}
      {user?.userType === 'admin_idon' && (
        <Route path="/admin/*" element={
          <AdminLayout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="dashboard"  element={<AdminDashboard user={user} onLogout={handleLogout} />} />
              <Route path="businesses" element={<Clientes />} />
              <Route path="modules"    element={<Modulos />} />
              <Route path="features"   element={<Features />} />
              <Route path="templates"  element={<Templates />} />
              <Route path="plans"      element={<Plans />} />
              <Route path="payments"   element={<Payments />} />
              <Route path="users"      element={<Users />} />
              <Route path="roles"      element={<Roles />} />
              <Route path="settings"                element={<Settings />} />
              <Route path="whatsapp-notifications" element={<WhatsAppNotifications />} />
              <Route path="whatsapp-connect"      element={<WhatsAppConnect />} />
              <Route path="audit"                  element={<Audit />} />
              <Route path="requests"   element={<Requests />} />
              <Route path="profile"    element={<ProfilePage user={user} />} />
            </Routes>
          </AdminLayout>
        } />
      )}

      {/* ── Redirección legacy /dashboard ── */}
      <Route
        path="/dashboard"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : (user?.userType === 'schema_employee' && user?.businessId)
                ? <Navigate to="/app/dashboard" replace />
              : (user?.userType === 'business_user' || !user?.businessId)
                ? <Navigate to="/pending-approval" replace />
                : <Navigate to="/app/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ── Panel del negocio (aprobado) ── */}
      <Route
        path="/app/*"
        element={
          !!user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : (user?.userType === 'schema_employee' && user?.businessId)
                ? <BusinessLayout user={user} onLogout={handleLogout} />
              : (user?.userType === 'business_user' || !user?.businessId)
                ? <Navigate to="/pending-approval" replace />
              : (
                <BusinessLayout user={user} onLogout={handleLogout} />
              )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        {businessRoutes}
      </Route>

      {/* ── Catch all ── */}
      <Route
        path="*"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : (user?.userType === 'schema_employee' && user?.businessId)
                ? <Navigate to="/app/dashboard" replace />
              : (user?.userType === 'business_user' || !user?.businessId)
                ? <Navigate to="/pending-approval" replace />
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
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('idonUser')) || null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const location  = useLocation();
  const navigate  = useNavigate();

  useEffect(() => {
    if (user) localStorage.setItem('lastPath', location.pathname + location.search);
  }, [location, user]);

  const PUBLIC_PATHS = ['/terms-and-conditions', '/privacy-policy', '/login', '/register'];

  useEffect(() => {
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    if (!token) {
      setUser(null);
      localStorage.removeItem('idonUser');
    } else if (!PUBLIC_PATHS.includes(location.pathname)) {
      const lastPath = localStorage.getItem('lastPath');
      if (lastPath && lastPath !== location.pathname) {
        navigate(lastPath, { replace: true });
      }
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    setUser(null);
    localStorage.removeItem('idonUser');
    localStorage.removeItem('idonToken');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedBusiness');
    navigate('/login', { replace: true });
  }

  if (loading) return <p style={{ padding: '20px' }}>Cargando...</p>;

  return <AppRoutes user={user} setUser={setUser} handleLogout={handleLogout} />;
}

// Intercepta rutas legales antes de cualquier lógica de auth
function AppShell() {
  const location = useLocation();
  if (location.pathname === '/terms-and-conditions') return <TermsAndConditions />;
  if (location.pathname === '/privacy-policy')       return <PrivacyPolicy />;
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
