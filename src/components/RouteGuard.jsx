// src/components/RouteGuard.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useBusinessNavigation } from '../hooks/useBusinessNavigation';
import AccessDeniedPage from '../pages/business/AccessDeniedPage';
import LoadingOverlay from './General/LoadingOverlay';


/**
 * Componente que protege las rutas verificando si el usuario tiene acceso
 * al módulo/página que está intentando visitar.
 */
export default function RouteGuard({ children, moduleCode, pageCode }) {
  const { user, isAuthenticated, loading } = useSession();
  const location = useLocation();
  const { hasAccess, isLoading } = useBusinessNavigation();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading || isLoading) {
        setChecking(true);
        return;
      }

      if (!isAuthenticated) {
        setAuthorized(false);
        setChecking(false);
        return;
      }

      // Si es admin/owner, permitir acceso
      const role = user?.roleCode || user?.role || '';
      if (['admin', 'owner', 'manager'].includes(role.toLowerCase())) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // Si no se especifican módulo/página, permitir acceso
      if (!moduleCode && !pageCode) {
        setAuthorized(true);
        setChecking(false);
        return;
      }

      // Verificar acceso
      const hasAccessResult = hasAccess(moduleCode, pageCode);
      setAuthorized(hasAccessResult);
      setChecking(false);
    };

    checkAccess();
  }, [loading, isLoading, isAuthenticated, moduleCode, pageCode, hasAccess, user]);

  // Mostrar loading mientras se verifica
  if (loading || checking || isLoading) {
    return (
      <LoadingOverlay 
        message=""
        backgroundColor="var(--bg-secondary)"
        textColor="var(--text-primary)"
        mutedColor="var(--text-muted)"
        spinnerColor="#ff8c42"
      />
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Si no tiene acceso, mostrar página de Acceso Denegado (con auditoría)
  if (!authorized) {
    return (
      <AccessDeniedPage 
        moduleCode={moduleCode}
        pageCode={pageCode}
        attemptedPath={location.pathname}
      />
    );
  }

  return children;
}