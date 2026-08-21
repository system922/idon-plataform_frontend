import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/admin_idon/AdminDashboard';
import './App.css';
import './styles/General/index.css';
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
import EmailTemplatesPage from './pages/admin_idon/EmailTemplatesPage';
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
import { ConfirmProvider } from './components/ConfirmContext';

// ========== NUEVO: Verificación de estado del negocio ==========
import { BusinessStatusGuard } from './components/BusinessStatusGuard';
import PaymentPendingPage from './pages/business/PaymentPendingPage';

// ========== Página de pedidos públicos ==========
import PublicOrderPage from './pages/public/PublicOrderPage';

// ========== NUEVO: fetchWithAuth ==========
import { fetchWithAuth } from './config/apiBase';

// ==================== FUNCIÓN PARA OBTENER RUTA INICIAL ====================
function getInitialRoute(user) {
  // Admin IDON
  if (user?.userType === 'admin_idon') {
    return '/admin/dashboard';
  }

  // Business owner o admin
  if (user?.userType === 'schema_owner' || user?.role === 'owner' || user?.role === 'admin') {
    return '/app/dashboard';
  }

  // Empleados: intentar obtener su primer módulo desde localStorage
  try {
    const navData = JSON.parse(localStorage.getItem('idonNavModules') || 'null');
    
    if (navData?.modules?.length) {
      const firstModule = navData.modules[0];
      
      // Si el módulo tiene páginas
      if (firstModule.pages?.length) {
        const firstPage = firstModule.pages[0];
        if (firstPage?.path) {
          // Asegurar que tenga /app
          return firstPage.path.startsWith('/app') 
            ? firstPage.path 
            : `/app${firstPage.path}`;
        }
      }
      
      // Si el módulo tiene un path directo
      if (firstModule.path) {
        return firstModule.path.startsWith('/app')
          ? firstModule.path
          : `/app${firstModule.path}`;
      }
    }
  } catch (error) {
    console.error('Error obteniendo ruta inicial:', error);
  }

  // Fallback
  return '/app/dashboard';
}

// =============================================
// WRAPPER PARA VERIFICAR ESTADO DEL NEGOCIO
// =============================================
function AppRoutesWrapper({ user, handleLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (location.pathname.includes('/app/payment-pending') || 
          location.pathname.includes('/app/suspended')) {
        setLoading(false);
        setStatusChecked(true);
        return;
      }

      try {
        const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          setStatusChecked(true);
          return;
        }

        const res = await fetchWithAuth('/api/business-status/my-status');
        
        if (res.ok) {
          const data = await res.json();
          
          if (data.status === 'suspended' || data.isSuspended === true) {
            setShowPaymentPage(true);
            if (!localStorage.getItem('pendingPaymentMessage')) {
              localStorage.setItem('pendingPaymentMessage', data.message || 'Tu negocio está suspendido. Por favor realiza el pago.');
            }
            if (!location.pathname.includes('/app/payment-pending')) {
              navigate('/app/payment-pending', { replace: true });
            }
          } else {
            setShowPaymentPage(false);
          }
        } else if (res.status === 401 || res.status === 403) {
          localStorage.clear();
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('Error verificando estado del negocio:', error);
      } finally {
        setLoading(false);
        setStatusChecked(true);
      }
    };

    checkStatus();
  }, [location.pathname, navigate]);

  if (loading) {
    return (
      <div className="spinner-overlay">
        <div className="spinner-brand">
          <div className="spinner-loader spinner-loader-lg spinner-primary" />
          <div className="brand-text">
            ID<span className="highlight">ON</span>
          </div>
        </div>
      </div>
    );
  }

  if (location.pathname.includes('/app/payment-pending')) {
    return <PaymentPendingPage onLogout={handleLogout} />;
  }

  if (showPaymentPage) {
    return <Navigate to="/app/payment-pending" replace />;
  }

  return (
    <BusinessStatusGuard>
      <BusinessLayout user={user} onLogout={handleLogout} />
    </BusinessStatusGuard>
  );
}

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
      {/* =====================================================
          🆕 RUTAS PÚBLICAS (SIN LOGIN) - DEBEN IR PRIMERO
          ===================================================== */}
      <Route path="/:slug/qr" element={<PublicOrderPage />} />
      <Route path="/:slug/menu" element={<PublicOrderPage />} />

      {/* Rutas públicas de autenticación */}
      <Route
        path="/login"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to={getInitialRoute(user)} replace /> 
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
            ? <Navigate to={getInitialRoute(user)} replace /> 
            : <RegisterPageWrapper setUser={setUser} />
        }
      />

      {/* Rutas legales */}
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

      {/* RUTA PRINCIPAL */}
      <Route
        path="/"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to={getInitialRoute(user)} replace /> 
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ADMIN ROUTES - SOLO PARA ADMIN_IDON */}
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
              <Route path="email-templates" element={<EmailTemplatesPage />} />
              <Route path="profile" element={<ProfilePage user={user} />} />
            </Routes>
          </AdminLayout>
        } />
      )}

      {/* DASHBOARD ROUTE - REDIRECCIÓN */}
      <Route
        path="/dashboard"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to={getInitialRoute(user)} replace /> 
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* APP ROUTES - BUSINESS PANEL CON WRAPPER PARA VERIFICAR ESTADO */}
      <Route
        path="/app/*"
        element={
          user ? (
            user?.userType === 'admin_idon' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <AppRoutesWrapper user={user} handleLogout={handleLogout} />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        {/* Las rutas de negocio se renderizan dentro del wrapper */}
        {businessRoutes}
      </Route>

      {/* CATCH ALL */}
      <Route
        path="*"
        element={
          user ? (
            user?.userType === 'admin_idon'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to={getInitialRoute(user)} replace /> 
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
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

  // 🔥 LISTA DE RUTAS PÚBLICAS (NO REQUIEREN AUTENTICACIÓN)
  const isPublicRoute = location.pathname === '/' ||
                        location.pathname === '/login' ||
                        location.pathname === '/register' ||
                        location.pathname === '/terms-and-conditions' ||
                        location.pathname === '/privacy-policy' ||
                        location.pathname.startsWith('/pending-approval') ||
                        location.pathname.endsWith('/qr') ||
                        location.pathname.endsWith('/menu');

  useEffect(() => {
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    if (!token && user) {
      setUser(null);
      localStorage.removeItem('idonUser');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && !isPublicRoute) {
      localStorage.setItem('lastPath', location.pathname + location.search);
    }
  }, [location, user, isPublicRoute]);

  async function handleLogout() {
    setUser(null);
    localStorage.removeItem('idonUser');
    localStorage.removeItem('idonToken');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedBusiness');
    localStorage.removeItem('lastPath');
    localStorage.removeItem('pendingPaymentMessage');
    localStorage.removeItem('pendingPaymentEmail');
    navigate('/login', { replace: true });
  }

  if (loading && !isPublicRoute && !user) {
    return (
      <div className="spinner-overlay">
        <div className="spinner-brand">
          <div className="spinner-loader spinner-loader-lg spinner-primary" />
          <div className="brand-text">
            ID<span className="highlight">ON</span>
          </div>
        </div>
      </div>
    );
  }

  // 🔥 Si es una ruta pública, renderizar sin verificación de autenticación
  if (isPublicRoute) {
    return (
      <DrawerProvider>
        <AppRoutes user={user} setUser={setUser} handleLogout={handleLogout} />
        <GlobalExpenseBubble />
      </DrawerProvider>
    );
  }

  // 🔥 Si es una ruta protegida y no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
      <ConfirmProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ConfirmProvider>
    </BrowserRouter>
  );
}

export default App;