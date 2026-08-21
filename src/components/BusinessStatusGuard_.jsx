import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { api } from '../config/api';

export function BusinessStatusGuard({ children }) {
  const { user, isAuthenticated, logout } = useSession();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkBusinessStatus = async () => {
      try {
        // Si no está autenticado, no verificar
        if (!isAuthenticated || !user) {
          setLoading(false);
          return;
        }

        // Si es admin_idon, no verificar
        if (user.userType === 'admin_idon') {
          setLoading(false);
          return;
        }

        // Verificar estado del negocio
        const response = await api.get('/business-status/my-status');
        
        if (response.data) {
          const data = response.data;
          setStatusData(data);

          // Caso 1: Negocio suspendido
          if (data.status === 'suspended' || data.status === 'inactive' || data.isSuspended === true) {
            navigate('/app/suspended', { replace: true });
            return;
          }

          // Caso 2: Pago pendiente
          if (data.hasPendingPayment || data.status === 'payment_pending') {
            navigate('/app/payment-pending', { replace: true });
            return;
          }

          // Caso 3: Negocio en estado 'pending' (pendiente de aprobación)
          if (data.status === 'pending') {
            navigate('/pending-approval', { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error('Error verificando estado del negocio:', error);
        
        // Si es 401 o 403, hacer logout
        if (error.response?.status === 401 || error.response?.status === 403) {
          await logout();
          navigate('/login', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    // Solo verificar en rutas /app/* que no sean las páginas de estado
    const isStatusPage = location.pathname.includes('/app/suspended') || 
                         location.pathname.includes('/app/payment-pending') ||
                         location.pathname.includes('/pending-approval');
    
    if (location.pathname.startsWith('/app') && !isStatusPage) {
      checkBusinessStatus();
    } else {
      setLoading(false);
    }
  }, [location.pathname, navigate, isAuthenticated, user, logout]);

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

  return children;
}