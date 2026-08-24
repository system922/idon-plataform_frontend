import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

// ========== COMPONENTES QUE SE CARGAN SÍNCRONAMENTE (SOLO LO ESENCIAL PARA LA LANDING) ==========
import LandingPage from './pages/LandingPage';
import PublicLayout from './admin/layout/PublicLayout';
import { SessionProvider, useSession } from './context/SessionContext';
import { api } from './config/api';
import { DrawerProvider } from './context/DrawerContext';
import GlobalExpenseBubble from './components/GlobalExpenseBubble';
import { ConfirmProvider } from './components/ConfirmContext';

// ========== ESTILOS GLOBALES (solo los necesarios para la landing) ==========
import './App.css';
import './styles/General/index.css';

// ========== RUTAS DE NEGOCIO (también lazy) ==========
// Importa businessRoutes dinámicamente o usa lazy para cada ruta, pero por ahora mantenlo como está
// pero asegura que los componentes dentro de businessRoutes estén definidos con lazy
import { businessRoutes } from './routes/businessRoutes';

// ========== LAZY LOADING PARA EL RESTO DE PÁGINAS ==========
const PreciosPage = lazy(() => import('./pages/PreciosPage'));
const ContactoPage = lazy(() => import('./pages/ContactoPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AdminDashboard = lazy(() => import('./pages/admin_idon/AdminDashboard'));
const AdminIdonNews = lazy(() => import('./pages/admin_idon/AdminIdonNews'));
const Features = lazy(() => import('./pages/admin_idon/Features'));
const Templates = lazy(() => import('./pages/admin_idon/Templates'));
const Plans = lazy(() => import('./pages/admin_idon/Plans'));
const Payments = lazy(() => import('./pages/admin_idon/Payments'));
const Roles = lazy(() => import('./pages/admin_idon/Roles'));
const Settings = lazy(() => import('./pages/admin_idon/Settings'));
const Audit = lazy(() => import('./pages/admin_idon/Audit'));
const Clientes = lazy(() => import('./pages/admin_idon/Clientes'));
const Modulos = lazy(() => import('./pages/admin_idon/Modulos'));
const Users = lazy(() => import('./pages/admin_idon/Users'));
const Requests = lazy(() => import('./pages/admin_idon/Requests'));
const BusinessTypes = lazy(() => import('./pages/admin_idon/BusinessTypes'));
const EmailTemplatesPage = lazy(() => import('./pages/admin_idon/EmailTemplatesPage'));
const ProfilePage = lazy(() => import('./pages/business/ProfilePage'));
const AdminLayout = lazy(() => import('./admin/layout/AdminLayout'));
const BusinessLayout = lazy(() => import('./admin/layout/BusinessLayout'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const PendingApprovalPage = lazy(() => import('./pages/PendingApprovalPage'));
const InactiveUserPage = lazy(() => import('./pages/InactiveUserPage'));
const PaymentPendingPage = lazy(() => import('./pages/business/PaymentPendingPage'));
const PublicOrderPage = lazy(() => import('./pages/public/PublicOrderPage'));
const NoAccessPage = lazy(() => import('./pages/NoAccessPage'));


// ==================== FUNCIÓN AUXILIAR ====================
const isAdminUser = (user) => {
  if (!user) return false;
  return user.userType === 'admin_idon' || 
         user.role === 'admin' || 
         user.role === 'superadmin' ||
         user.role === 'super_admin';
};

// ==================== GUARDAR RUTA ACTUAL ====================
function useRoutePersistence() {
  const location = useLocation();
  const { isAuthenticated, loading } = useSession();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      const currentPath = location.pathname + location.search;
      
      const excludeRoutes = [
        '/', '/login', '/register', '/precios', '/contacto', '/blog',
        '/pending-approval', '/app/inactive', '/app/no-access', '/app/payment-pending',
        '/terms-and-conditions', '/privacy-policy'
      ];
      
      const shouldExclude = excludeRoutes.some(route => currentPath.includes(route));
      
      if (!shouldExclude && currentPath !== '/') {
        sessionStorage.setItem('lastRoute', currentPath);
        sessionStorage.setItem('lastRouteTimestamp', Date.now().toString());
      }
    }
  }, [location, isAuthenticated, loading]);
}

// ==================== RESTAURAR RUTA GUARDADA ====================
function useRouteRestorer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useSession();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;

    const savedRoute = sessionStorage.getItem('lastRoute');
    const currentPath = location.pathname;
    
    if (savedRoute) {
      const shouldNotRestore = 
        currentPath.includes('/login') ||
        currentPath.includes('/register') ||
        currentPath.includes('/pending-approval') ||
        currentPath.includes('/app/inactive') ||
        currentPath.includes('/app/no-access') ||
        currentPath.includes('/app/payment-pending') ||
        currentPath === savedRoute ||
        currentPath === '/';

      if (!shouldNotRestore) {
        const excludeRoutes = [
          '/login', '/register', '/pending-approval',
          '/app/inactive', '/app/no-access', '/app/payment-pending'
        ];
        
        const isExcluded = excludeRoutes.some(route => savedRoute.includes(route));
        
        if (!isExcluded && savedRoute !== '/') {
          navigate(savedRoute, { replace: true });
        }
      }
    }
  }, [isAuthenticated, loading, location.pathname, navigate]);
}

// =============================================
// HOOK PERSONALIZADO PARA VERIFICAR ESTADO DEL NEGOCIO
// =============================================
function useBusinessStatus() {
  const { user, isAuthenticated, logout } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [redirectTo, setRedirectTo] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const publicRoutes = ['/login', '/register', '/terms-and-conditions', '/privacy-policy'];
      
      if (publicRoutes.some(route => location.pathname.includes(route))) {
        setLoading(false);
        setChecked(true);
        return;
      }

      if (location.pathname.includes('/pending-approval') ||
          location.pathname.includes('/app/payment-pending') ||
          location.pathname.includes('/app/inactive') ||
          location.pathname.includes('/app/no-access') ||
          location.pathname.includes('/app/suspended')) {
        setLoading(false);
        setChecked(true);
        return;
      }

      if (location.pathname.includes('/admin') || isAdminUser(user)) {
        setLoading(false);
        setChecked(true);
        const statusRoutes = ['/app/no-access', '/app/inactive', '/pending-approval', '/app/payment-pending'];
        if (statusRoutes.some(route => location.pathname.includes(route))) {
          setRedirectTo('/admin/dashboard');
        }
        return;
      }

      if (!isAuthenticated || !user) {
        setLoading(false);
        setChecked(true);
        return;
      }

      try {
        const response = await api.get('/business-status/my-status');
        const result = response.data;

        let status = 'pending';
        let data = result;

        if (result.ok && result.data) {
          data = result.data;
          status = data.status || 'pending';
        } else if (result.status) {
          status = result.status;
        } else if (result.data?.status) {
          status = result.data.status;
        }

        setStatusData(data);

        let redirect = null;

        if (status === 'inactive' || status === 'user_not_found') {
          redirect = '/app/inactive';
        } else if (status === 'no_business' || status === 'no_request' || status === 'error') {
          redirect = '/app/no-access';
        } else if (status === 'active') {
          redirect = null;
        } else if (status === 'provisioned' || status === 'suspended') {
          redirect = '/app/payment-pending';
        } else if (status === 'pending' || status === 'approved' || status === 'rejected') {
          redirect = '/pending-approval';
        } else {
          redirect = '/app/no-access';
        }

        setRedirectTo(redirect);
        setChecked(true);
        setLoading(false);

      } catch (error) {
        console.error('Error verificando estado:', error);
        
        if (error.response?.status === 401 || error.response?.status === 403) {
          await logout();
          navigate('/login', { replace: true });
          return;
        }
        setLoading(false);
        setChecked(true);
      }
    };

    checkStatus();
  }, [location.pathname, navigate, isAuthenticated, user, logout]);

  useEffect(() => {
    if (redirectTo && !loading && checked) {
      navigate(redirectTo, { replace: true });
    }
  }, [redirectTo, loading, checked, navigate]);

  return { loading, redirectTo, statusData, checked };
}

// =============================================
// WRAPPER PARA VERIFICAR ESTADO DEL NEGOCIO
// =============================================
function AppRoutesWrapper() {
  const { user, logout } = useSession();
  const location = useLocation();
  const { loading, redirectTo, statusData, checked } = useBusinessStatus();

  if (loading || !checked) {
    return <LoadingSpinner />;
  }

  if (redirectTo) {
    return <LoadingSpinner />;
  }

  // Páginas de estado (lazy)
  if (location.pathname.includes('/pending-approval')) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <PendingApprovalPage onLogout={logout} />
      </Suspense>
    );
  }

  if (location.pathname.includes('/app/payment-pending')) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <PaymentPendingPage onLogout={logout} />
      </Suspense>
    );
  }

  if (location.pathname.includes('/app/inactive')) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <InactiveUserPage onLogout={logout} />
      </Suspense>
    );
  }

  if (location.pathname.includes('/app/no-access')) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <NoAccessPage onLogout={logout} />
      </Suspense>
    );
  }

  // Business Layout (lazy)
  const realRole = user?.role || user?.userType || 'user';
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <BusinessLayout userRole={realRole} />
    </Suspense>
  );
}

// =============================================
// COMPONENTE PARA RUTAS /app/*
// =============================================
function AppRouter() {
  const { user, isAuthenticated } = useSession();
  
  if (isAuthenticated && isAdminUser(user)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <AppRoutesWrapper />;
}

function RegisterPageWrapper() {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <RegisterPage
        onRegisterSuccess={() => {}}
        onNavigateToLogin={() => navigate('/login')}
      />
    </Suspense>
  );
}

// =============================================
// COMPONENTE DE RUTAS CON PERSISTENCIA
// =============================================
function AppRoutes() {
  const { user, logout, isAuthenticated, requiresBusinessSelection } = useSession();
  const location = useLocation();
  
  const shouldRedirectFromAuthPage = isAuthenticated && !requiresBusinessSelection;
  
  const getRedirectPath = () => {
    if (isAdminUser(user)) {
      return '/admin/dashboard';
    }
    return '/app';
  };

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/:slug/qr" element={
        <Suspense fallback={<LoadingSpinner />}>
          <PublicOrderPage />
        </Suspense>
      } />
      <Route path="/:slug/menu" element={
        <Suspense fallback={<LoadingSpinner />}>
          <PublicOrderPage />
        </Suspense>
      } />

      {/* Login (lazy) */}
      <Route
        path="/login"
        element={
          shouldRedirectFromAuthPage ? (
            <Navigate to={getRedirectPath()} replace />
          ) : (
            <Suspense fallback={<LoadingSpinner />}>
              <LoginPage />
            </Suspense>
          )
        }
      />

      {/* Register (lazy) */}
      <Route
        path="/register"
        element={
          shouldRedirectFromAuthPage ? (
            <Navigate to={getRedirectPath()} replace />
          ) : (
            <RegisterPageWrapper />
          )
        }
      />

      {/* Páginas públicas con PublicLayout (LandingPage es síncrona, el resto lazy) */}
      <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
      <Route path="/precios" element={
        <Suspense fallback={<LoadingSpinner />}>
          <PublicLayout><PreciosPage /></PublicLayout>
        </Suspense>
      } />
      <Route path="/contacto" element={
        <Suspense fallback={<LoadingSpinner />}>
          <PublicLayout><ContactoPage /></PublicLayout>
        </Suspense>
      } />
      <Route path="/blog" element={
        <Suspense fallback={<LoadingSpinner />}>
          <PublicLayout><BlogPage /></PublicLayout>
        </Suspense>
      } />
      <Route path="/terms-and-conditions" element={
        <Suspense fallback={<LoadingSpinner />}>
          <PublicLayout><TermsAndConditions /></PublicLayout>
        </Suspense>
      } />
      <Route path="/privacy-policy" element={
        <Suspense fallback={<LoadingSpinner />}>
          <PublicLayout><PrivacyPolicy /></PublicLayout>
        </Suspense>
      } />

      {/* Páginas de estado (lazy) */}
      <Route
        path="/pending-approval"
        element={
          isAuthenticated ? (
            <Suspense fallback={<LoadingSpinner />}>
              <PendingApprovalPage onLogout={logout} />
            </Suspense>
          ) : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/app/inactive"
        element={
          isAuthenticated ? (
            <Suspense fallback={<LoadingSpinner />}>
              <InactiveUserPage onLogout={logout} />
            </Suspense>
          ) : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/app/no-access"
        element={
          isAuthenticated ? (
            <Suspense fallback={<LoadingSpinner />}>
              <NoAccessPage onLogout={logout} />
            </Suspense>
          ) : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/app/payment-pending"
        element={
          isAuthenticated ? (
            <Suspense fallback={<LoadingSpinner />}>
              <PaymentPendingPage onLogout={logout} />
            </Suspense>
          ) : <Navigate to="/login" replace />
        }
      />

      {/* Ruta raíz (redirige) */}
      <Route
        path="/"
        element={
          shouldRedirectFromAuthPage ? (
            <Navigate to={getRedirectPath()} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Dashboard genérico */}
      <Route
        path="/dashboard"
        element={
          shouldRedirectFromAuthPage ? (
            <Navigate to="/app" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Admin IDON (lazy) */}
      {isAdminUser(user) && (
        <Route path="/admin/*" element={
          <Suspense fallback={<LoadingSpinner />}>
            <AdminLayout user={user} onLogout={logout}>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard user={user} onLogout={logout} />} />
                <Route path="businesses" element={<Clientes />} />
                <Route path="modules" element={<Modulos />} />
                <Route path="idon_news" element={<AdminIdonNews />} />
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
          </Suspense>
        } />
      )}

      {/* App Business (lazy) */}
      <Route path="/app/*" element={<AppRouter />}>
        {businessRoutes}
      </Route>

      {/* 404 */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to={getRedirectPath()} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

// =============================================
// COMPONENTE CONTENT CON PERSISTENCIA
// =============================================
function AppContent() {
  const { loading, isAuthenticated, user } = useSession();
  const location = useLocation();

  useRoutePersistence();
  useRouteRestorer();

  const isPublicRoute = location.pathname === '/' ||
                        location.pathname === '/login' ||
                        location.pathname === '/register' ||
                        location.pathname === '/terms-and-conditions' ||
                        location.pathname === '/privacy-policy' ||
                        location.pathname.startsWith('/pending-approval') ||
                        location.pathname.startsWith('/app/inactive') ||
                        location.pathname.startsWith('/app/no-access') ||
                        location.pathname.endsWith('/qr') ||
                        location.pathname.endsWith('/menu');

  if (loading && !isPublicRoute) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <DrawerProvider>
        <AppRoutes />
        <GlobalExpenseBubble />
      </DrawerProvider>
    </>
  );
}

// ========== COMPONENTE DE LOADING ==========
function LoadingSpinner() {
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

// =============================================
// APP SHELL
// =============================================
function AppShell() {
  const location = useLocation();
  if (location.pathname === '/terms-and-conditions') return <TermsAndConditions />;
  if (location.pathname === '/privacy-policy') return <PrivacyPolicy />;
  return <AppContent />;
}

// =============================================
// APP PRINCIPAL
// =============================================
function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ConfirmProvider>
        <SessionProvider> 
          <AppShell />
        </SessionProvider>
      </ConfirmProvider>
    </BrowserRouter>
  );
}

export default App;