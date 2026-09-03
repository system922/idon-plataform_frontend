// ========== src/App.js ==========
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import PreciosPage from './pages/PreciosPage';
import ContactoPage from './pages/ContactoPage';
import BlogPage from './pages/BlogPage';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

import AdminDashboard from './pages/admin_idon/AdminDashboard';
import './App.css';
import { SessionProvider, useSession } from './context/SessionContext';
import { api } from './config/api';
import AdminLayout from './admin/layout/AdminLayout';


import BusinessStats from './pages/admin_idon/BusinessStats';
import VersionsManager from './pages/admin_idon/VersionsManager';
import UpdatesManager from './pages/admin_idon/UpdatesManager';
import PendingPayments from './pages/admin_idon/PendingPayments';
import ActivityLogs from './pages/admin_idon/ActivityLogs';
import BackupsManager from './pages/admin_idon/BackupsManager';
import ReportsGenerator from './pages/admin_idon/ReportsGenerator';

import AdminIdonNews from './pages/admin_idon/AdminIdonNews';
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
import ProfilePage from './pages/business/ProfilePage';
import PublicLayout from './admin/layout/PublicLayout';

// ── Business panel ──────────────────────────────────────────
import BusinessLayout from './admin/layout/BusinessLayout';
import PendingApprovalPage from './pages/PendingApprovalPage';
import InactiveUserPage from './pages/InactiveUserPage';

/* Páginas Legales */
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';

// ========== Contextos y componentes ==========
import { DrawerProvider } from './context/DrawerContext';
import GlobalExpenseBubble from './components/GlobalExpenseBubble';
import { ConfirmProvider } from './components/ConfirmContext';
import PaymentPendingPage from './pages/business/PaymentPendingPage';
import PublicOrderPage from './pages/public/PublicOrderPage';
import NoAccessPage from './pages/NoAccessPage';
import LoadingOverlay from './components/General/LoadingOverlay';
import { businessRoutes } from './routes/businessRoutes';


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
        '/', 
        '/login', 
        '/register', 
        '/precios', 
        '/contacto', 
        '/blog',
        '/pending-approval', 
        '/app/inactive', 
        '/app/no-access', 
        '/app/payment-pending',
        '/terms-and-conditions', 
        '/privacy-policy', 
        '/forgot-password', 
        '/reset-password'
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
      const publicRoutes = [
        '/login', 
        '/register', 
        '/terms-and-conditions', 
        '/privacy-policy', 
        '/forgot-password', 
        '/reset-password'];
      
      if (publicRoutes.some(route => location.pathname.includes(route))) {
        setLoading(false);
        setChecked(true);
        return;
      }

      // Páginas de estado - no verificar
      if (location.pathname.includes('/pending-approval') ||
          location.pathname.includes('/app/payment-pending') ||
          location.pathname.includes('/app/inactive') ||
          location.pathname.includes('/app/no-access') ||
          location.pathname.includes('/app/suspended')) {
        setLoading(false);
        setChecked(true);
        return;
      }

      // Si es admin, no verificar estado de negocio
      if (location.pathname.includes('/admin') || isAdminUser(user)) {
        setLoading(false);
        setChecked(true);
        // Si está en rutas de estado de negocio, redirigir al dashboard
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
    return (<LoadingOverlay 
      message=""
      backgroundColor="var(--bg-secondary)"
    />);
  }

  if (redirectTo) {
    return (<LoadingOverlay 
      message=""
      backgroundColor="var(--bg-secondary)"
    />);
  }

  // Páginas de estado
  if (location.pathname.includes('/pending-approval')) {
    return <PendingApprovalPage onLogout={logout} />;
  }

  if (location.pathname.includes('/app/payment-pending')) {
    return <PaymentPendingPage onLogout={logout} />;
  }

  if (location.pathname.includes('/app/inactive')) {
    return <InactiveUserPage onLogout={logout} />;
  }

  if (location.pathname.includes('/app/no-access')) {
    return <NoAccessPage onLogout={logout} />;
  }

  // Business Layout
  const realRole = user?.role || user?.userType || 'user';
  return <BusinessLayout userRole={realRole} />;
}

// =============================================
// COMPONENTE PARA RUTAS /app/*
// =============================================
function AppRouter() {
  const { user, isAuthenticated } = useSession();
  
  // Si es admin, redirigir al dashboard
  if (isAuthenticated && isAdminUser(user)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Usuario de negocio
  return <AppRoutesWrapper />;
}

function RegisterPageWrapper() {
  const navigate = useNavigate();
  return (
    <RegisterPage
      onRegisterSuccess={() => {}}
      onNavigateToLogin={() => navigate('/login')}
    />
  );
}

// =============================================
// COMPONENTE DE RUTAS CON PERSISTENCIA
// =============================================
function AppRoutes() {
  const { user, logout, isAuthenticated, requiresBusinessSelection } = useSession();
  const location = useLocation();

  // NO redirigir en estas páginas de autenticación
  const isAuthPage = location.pathname === '/login' || 
                     location.pathname === '/register' ||
                     location.pathname === '/forgot-password' ||
                     location.pathname === '/reset-password';
  
  const shouldRedirectFromAuthPage = isAuthenticated && !requiresBusinessSelection && !isAuthPage;
  
  
  const getRedirectPath = () => {
    if (isAdminUser(user)) {
      return '/admin/dashboard';
    }
    return '/app';
  };

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/:slug/qr" element={<PublicOrderPage />} />
      <Route path="/:slug/menu" element={<PublicOrderPage />} />

      {/* Login */}
      <Route
        path="/login"
        element={
          shouldRedirectFromAuthPage ? (
            <Navigate to={getRedirectPath()} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route 
        path="/forgot-password" 
        element={<ForgotPasswordPage />

        } 
      />
      
      <Route 
        path="/reset-password" 
        element={<ResetPasswordPage />

        } 
      />

      {/* Register */}
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
      <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
      <Route path="/precios" element={<PublicLayout><PreciosPage /></PublicLayout>} />
      <Route path="/contacto" element={<PublicLayout><ContactoPage /></PublicLayout>} />
      <Route path="/blog" element={<PublicLayout><BlogPage /></PublicLayout>} />
      <Route path="/terms-and-conditions" element={<PublicLayout><TermsAndConditions /></PublicLayout>} />
      <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicy /></PublicLayout>} />

      {/* Páginas de estado */}
      <Route
        path="/pending-approval"
        element={
          isAuthenticated ? <PendingApprovalPage onLogout={logout} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/app/inactive"
        element={
          isAuthenticated ? <InactiveUserPage onLogout={logout} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/app/no-access"
        element={
          isAuthenticated ? <NoAccessPage onLogout={logout} /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/app/payment-pending"
        element={
          isAuthenticated ? <PaymentPendingPage onLogout={logout} /> : <Navigate to="/login" replace />
        }
      />

      {/* Ruta raíz */}
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

      {/* Admin IDON */}
      {isAdminUser(user) && (
        <Route path="/admin/*" element={
          <AdminLayout user={user} onLogout={logout}>
            <Routes>
              {/* ===== DASHBOARD ===== */}
              <Route path="dashboard" element={<AdminDashboard user={user} onLogout={logout} />} />

              {/* ===== NEGOCIOS ===== */}
              <Route path="requests" element={<Requests />} />
              <Route path="businesses" element={<Clientes />} />
              <Route path="business-types" element={<BusinessTypes />} />
              <Route path="business-stats" element={<BusinessStats />} />

              {/* ===== SISTEMA ===== */}
              <Route path="modules" element={<Modulos />} />
              <Route path="features" element={<Features />} />
              <Route path="versions" element={<VersionsManager />} />
              <Route path="updates" element={<UpdatesManager />} />

              {/* ===== COMERCIAL ===== */}
              <Route path="plans" element={<Plans />} />
              <Route path="payments" element={<Payments />} />
              <Route path="pending-payments" element={<PendingPayments />} />
              <Route path="email-templates" element={<EmailTemplatesPage />} />
              <Route path="idon_news" element={<AdminIdonNews />} />

              {/* ===== USUARIOS ===== */}
              <Route path="users" element={<Users />} />
              <Route path="roles" element={<Roles />} />
              <Route path="activity-logs" element={<ActivityLogs />} />

              {/* ===== GLOBAL ===== */}
              <Route path="settings" element={<Settings />} />
              <Route path="audit" element={<Audit />} />
              <Route path="backups" element={<BackupsManager />} />
              <Route path="reports" element={<ReportsGenerator />} />

              {/* ===== PERFIL ===== */}
              <Route path="profile" element={<ProfilePage user={user} />} />

              {/* ===== REDIRECCIÓN ===== */}
              <Route path="" element={<Navigate to="dashboard" replace />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </AdminLayout>
        } />
      )}

      {/* App Business */}
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
                        location.pathname === '/forgot-password' ||
                        location.pathname === '/reset-password' ||
                        location.pathname === '/terms-and-conditions' ||
                        location.pathname === '/privacy-policy' ||
                        location.pathname.startsWith('/pending-approval') ||
                        location.pathname.startsWith('/app/inactive') ||
                        location.pathname.startsWith('/app/no-access') ||
                        location.pathname.endsWith('/qr') ||
                        location.pathname.endsWith('/menu');

  useEffect(() => {
    if (!isPublicRoute) {
      import('./styles/General/index.css');
    }
  }, [isPublicRoute]);

  if (loading && !isPublicRoute) {
    return <LoadingOverlay message="" />;
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