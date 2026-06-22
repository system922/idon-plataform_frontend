import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchWithAuth } from '../config/apiBase';

export function BusinessStatusGuard({ children }) {
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkBusinessStatus = async () => {
      try {
        const userStr = localStorage.getItem('idonUser');
        if (!userStr) {
          setLoading(false);
          return;
        }

        const user = JSON.parse(userStr);
        // Si es admin_idon, no verificar
        if (user.userType === 'admin_idon') {
          setLoading(false);
          return;
        }

        // Verificar estado del negocio
        const res = await fetchWithAuth('/api/business/status');
        
        if (res.ok) {
          const data = await res.json();
          setStatusData(data);

          // Caso 1: Negocio suspendido
          if (data.status === 'suspended' || data.status === 'inactive') {
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
        } else if (res.status === 401 || res.status === 403) {
          // Token inválido
          localStorage.clear();
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('Error verificando estado del negocio:', error);
      } finally {
        setLoading(false);
      }
    };

    // Solo verificar en rutas /app/* que no sean las páginas de estado
    const isStatusPage = location.pathname.includes('/app/suspended') || 
                         location.pathname.includes('/app/payment-pending');
    
    if (location.pathname.startsWith('/app') && !isStatusPage) {
      checkBusinessStatus();
    } else {
      setLoading(false);
    }
  }, [location.pathname, navigate]);

  if (loading) {
    return (
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
  }

  return children;
}