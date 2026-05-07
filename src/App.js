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
import PaymentRequiredPage from './pages/business/PaymentRequiredPage';

/* Páginas Legales */
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';

// ========== NUEVO: Contexto global para gastos pendientes ==========
import { DrawerProvider } from './context/DrawerContext';
import GlobalExpenseBubble from './components/GlobalExpenseBubble';
// ==================================================================

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
  // Debug: Verificar estado del usuario
  console.log('🔍 AppRoutes - user:', {
    id: user?.id,
    email: user?.email,
    userType: user?.userType,
    subscription_status: user?.subscription_status,
    business_status: user?.business_status,
    businessId: user?.businessId,
    status: user?.status
  });

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

      <Route
        path="/payment-required"
        element={
          user
            ? <PaymentRequiredPage onLogout={handleLogout} />
            : <Navigate to="/login" replace />
        }
      />

      {/* RUTA PRINCIPAL - CON PRIORIDAD AL ESTADO DE SUSCRIPCIÓN */}
      <Route
        path="/"
        element={
          user ? (
            // 1. Admin IDON
            user?.userType === 'admin_idon' || user?.type === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              // 2. 🔥 PRIORIDAD MÁXIMA: Suscripción suspendida o cancelada
              : (user?.subscription_status === 'suspended' || user?.subscription_status === 'cancelled')
                ? <Navigate to="/payment-required" replace />
                // 3. Negocio no aprobado
                : (user?.business_status !== 'approved' && user?.status !== 'approved')
                  ? <Navigate to="/pending-approval" replace />
                  // 4. Empleado con negocio aprobado
                  : (user?.userType === 'schema_employee' && user?.businessId)
                    ? <Navigate to="/app/dashboard" replace />
                    // 5. Usuario sin negocio
                    : (user?.userType === 'business_user' || !user?.businessId)
                      ? <Navigate to="/pending-approval" replace />
                      // 6. Dueño con negocio aprobado y suscripción activa
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

      {/* DASHBOARD ROUTE */}
      <Route
        path="/dashboard"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : (user?.subscription_status === 'suspended' || user?.subscription_status === 'cancelled')
                ? <Navigate to="/payment-required" replace />
                : (user?.business_status !== 'approved' && user?.status !== 'approved')
                  ? <Navigate to="/pending-approval" replace />
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

      {/* APP ROUTES - BUSINESS PANEL */}
      <Route
        path="/app/*"
        element={
          !!user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : (user?.subscription_status === 'suspended' || user?.subscription_status === 'cancelled')
                ? <Navigate to="/payment-required" replace />
                : (user?.business_status !== 'approved' && user?.status !== 'approved')
                  ? <Navigate to="/pending-approval" replace />
                  : (user?.userType === 'schema_employee' && user?.businessId)
                    ? <BusinessLayout user={user} onLogout={handleLogout} />
                    : (user?.userType === 'business_user' || !user?.businessId)
                      ? <Navigate to="/pending-approval" replace />
                      : <BusinessLayout user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        {businessRoutes}
      </Route>

      {/* CATCH ALL - 404 REDIRECT */}
      <Route
        path="*"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : (user?.subscription_status === 'suspended' || user?.subscription_status === 'cancelled')
                ? <Navigate to="/payment-required" replace />
                : (user?.business_status !== 'approved' && user?.status !== 'approved')
                  ? <Navigate to="/pending-approval" replace />
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
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('idonUser');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        console.log('📦 Usuario cargado de localStorage:', parsed);
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const PUBLIC_PATHS = ['/terms-and-conditions', '/privacy-policy', '/login', '/register', '/payment-required'];

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