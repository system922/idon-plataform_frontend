import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { api } from '../config/api';
import { 
  FiClock, FiCheckCircle, FiMail, 
  FiLogOut, FiRefreshCw, FiCreditCard 
} from 'react-icons/fi';
import Footer from '../components/common/Footer';

export default function PendingApprovalPage({ onLogout }) {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useSession();
  const [checking, setChecking] = useState(false);
  const [requestStatus, setRequestStatus] = useState('pending'); // 'pending' | 'approved' | 'provisioned' | 'active'
  const [error, setError] = useState('');
  const errorTimerRef = useRef(null);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Redirigir si ya tiene suscripción activa
  useEffect(() => {
    if (requestStatus === 'active') {
      const timer = setTimeout(() => {
        navigate('/app/dashboard', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [requestStatus, navigate]);

  // Redirigir si está provisioned (pago pendiente)
  useEffect(() => {
    if (requestStatus === 'provisioned') {
      const timer = setTimeout(() => {
        navigate('/app/payment-pending', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [requestStatus, navigate]);

  // Chequea el estado de la solicitud
  async function checkStatus() {
    setChecking(true);
    setError('');
    
    try {
      const response = await api.get('/business-status/my-status');
      const result = response.data;

      if (!result.ok) {
        throw new Error(result.error || 'Error al verificar el estado');
      }

      const data = result.data;
      const status = data.status || 'pending';
            
      // Actualizar el estado según la respuesta
      setRequestStatus(status);
      
      // Si está activo, mostrar mensaje
      if (status === 'active') {
        setError('¡Tu negocio está activo! Redirigiendo al dashboard...');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      // Si está provisioned (aprobado y con suscripción creada pero pendiente de pago)
      if (status === 'provisioned') {
        setError('Tu suscripción está pendiente de pago. Redirigiendo a la página de pago...');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      // Si está approved (aprobado pero sin suscripción)
      if (status === 'approved') {
        setError('Tu negocio ha sido aprobado. El equipo IDON se pondrá en contacto para coordinar la suscripción.');
        setTimeout(() => setError(''), 5000);
        return;
      }
      
      // Si está pending (en revisión)
      if (status === 'pending') {
        setError('Tu solicitud aún está en revisión. Por favor espera la notificación.');
        setTimeout(() => setError(''), 5000);
        return;
      }
      
      // Si está rejected
      if (status === 'rejected') {
        setError('Tu solicitud ha sido rechazada. Por favor contacta a soporte.');
        setTimeout(() => setError(''), 5000);
        return;
      }
      
    } catch (err) {
      console.error('Error en checkStatus:', err);
      setError(err?.response?.data?.message || 'Error al verificar el estado');
      setTimeout(() => setError(''), 5000);
    } finally {
      setChecking(false);
    }
  }

  // Cerrar sesión
  function handleLogout() {
    logout();
    if (onLogout) onLogout();
    navigate('/login', { replace: true });
  }

  // Verificar estado automáticamente al montar
  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Datos del usuario
  const userData = user || {};
  const displayName = userData.firstName || userData.name || 'usuario';
  const userPhone = userData.phone || 'tu número registrado';

  // Definir pasos según el estado
  const getSteps = () => {
    const isApproved = requestStatus === 'approved' || requestStatus === 'provisioned' || requestStatus === 'active';
    const isProvisioned = requestStatus === 'provisioned' || requestStatus === 'active';
    const isActive = requestStatus === 'active';
    
    return [
      { 
        label: 'Solicitud Enviada', 
        done: true 
      },
      { 
        label: 'En revisión por Soporte', 
        done: isApproved || isActive,
        active: requestStatus === 'pending',
        description: requestStatus === 'pending' 
          ? 'Tiempo estimado: 1-2 horas (puede variar según la demanda actual)'
          : (isApproved ? 'Revisión completada' : '')
      },
      { 
        label: isActive ? '¡Negocio Activado!' : 'Pendiente de Suscripción', 
        done: isActive,
        active: requestStatus === 'approved' || requestStatus === 'provisioned',
        description: isActive 
          ? 'Tu negocio ya está activo. ¡Bienvenido a IDON!' 
          : requestStatus === 'provisioned'
            ? 'Suscripción creada. Pendiente de pago.'
            : 'El equipo de IDON se pondrá en contacto para coordinar el plan de suscripción.'
      },
    ];
  };

  const steps = getSteps();

  // Renderizar según el estado
  const renderContent = () => {
    switch (requestStatus) {
      case 'active':
        return (
          <>
            <h1 className="pending-title success">¡Negocio Activado! 🎉</h1>
            <p className="pending-subtitle">
              Tu negocio ya está completamente activo. Puedes comenzar a usar IDON ahora mismo.
            </p>
            <div className="pending-alert pending-alert-success">
              <FiCheckCircle size={16} className="pending-alert-icon" />
              <span>Redirigiendo al dashboard...</span>
            </div>
          </>
        );
      
      case 'provisioned':
        return (
          <>
            <h1 className="pending-title warning">Suscripción Creada</h1>
            <p className="pending-subtitle">
              <strong>{displayName}</strong>, tu negocio ha sido aprobado y la suscripción ha sido creada.
              El equipo IDON se pondrá en contacto para coordinar el pago y activar tu cuenta.
            </p>
            <div className="pending-alert pending-alert-warning">
              <FiCreditCard size={16} className="pending-alert-icon" />
              <span>
                Tu suscripción está pendiente de pago. Una vez confirmado el pago, tu negocio se activará automáticamente.
              </span>
            </div>
          </>
        );
      
      case 'approved':
        return (
          <>
            <h1 className="pending-title warning">¡Negocio Aprobado!</h1>
            <p className="pending-subtitle">
              <strong>{displayName}</strong>, tu negocio ha sido aprobado por el equipo de Soporte IDON.
              Ahora debes completar el proceso de suscripción para activarlo.
            </p>
            <div className="pending-alert pending-alert-warning">
              <FiCreditCard size={16} className="pending-alert-icon" />
              <span>
                El equipo de IDON se pondrá en contacto contigo para coordinar el plan de suscripción.
                Mientras tanto, puedes cerrar sesión y esperar el contacto.
              </span>
            </div>
          </>
        );
      
      case 'rejected':
        return (
          <>
            <h1 className="pending-title error">Solicitud Rechazada</h1>
            <p className="pending-subtitle">
              Lamentamos informarte que tu solicitud ha sido rechazada.
            </p>
            <div className="pending-alert pending-alert-error">
              <FiClock size={16} className="pending-alert-icon" />
              <span>
                Por favor contacta a soporte para más información sobre el rechazo.
              </span>
            </div>
          </>
        );
      
      case 'pending':
      default:
        return (
          <>
            <h1 className="pending-title">Solicitud en revisión</h1>
            <p className="pending-subtitle">
              Hola <strong>{displayName}</strong>, tu solicitud de registro
              está siendo revisada por el equipo de Soporte IDON.
              En breve se te notificará cuando haya sido aprobada.
            </p>
          </>
        );
    }
  };

  return (
    <div className="pending-approval-page">
      <div className="pending-card">
        {/* Icono circular */}
        <div className={`pending-icon-wrapper ${
          requestStatus === 'active' ? 'approved' : 
          requestStatus === 'approved' || requestStatus === 'provisioned' ? 'warning' : 
          requestStatus === 'rejected' ? 'error' : ''
        }`}>
          {requestStatus === 'active' ? (
            <FiCheckCircle size={36} className="pending-icon" />
          ) : requestStatus === 'approved' || requestStatus === 'provisioned' ? (
            <FiCreditCard size={32} className="pending-icon" />
          ) : requestStatus === 'rejected' ? (
            <FiClock size={28} className="pending-icon" />
          ) : (
            <FiClock size={28} className="pending-icon" />
          )}
        </div>

        {/* Contenido dinámico */}
        {renderContent()}

        {/* Mensaje de error/info */}
        {error && requestStatus !== 'active' && (
          <div className={`pending-alert ${
            requestStatus === 'approved' || requestStatus === 'provisioned' ? 'pending-alert-warning' :
            requestStatus === 'rejected' ? 'pending-alert-error' :
            'pending-alert-info'
          }`}>
            <span>{error}</span>
          </div>
        )}

        {/* Progress steps */}
        <div className="pending-steps">
          {steps.map((step, index) => {
            const statusClass = step.done ? 'done' : step.active ? 'active' : 'idle';
            return (
              <div key={index} className="step-item">
                <div className="step-indicator">
                  <div className={`step-circle ${statusClass}`}>
                    {step.done ? (
                      <FiCheckCircle size={16} className="step-icon" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`step-connector ${step.done ? 'done' : 'idle'}`} />
                  )}
                </div>
                <div className="step-content">
                  <div className={`step-label ${statusClass}`}>
                    {step.label}
                  </div>
                  {step.description && (
                    <div className={`step-description ${statusClass}`}>
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Email notification banner - solo en estado pending */}
        {requestStatus === 'pending' && (
          <div className="pending-email-banner">
            <FiMail size={18} className="email-icon" />
            <div>
              <div className="email-title">Notificación por correo electrónico</div>
              <div className="email-text">
                Recibirás un correo al email registrado cuando tu negocio sea aprobado.
              </div>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="pending-actions">
          {requestStatus !== 'active' && (
            <button
              onClick={checkStatus}
              disabled={checking}
              className="btn-check-status"
            >
              <FiRefreshCw
                size={15}
                className={checking ? 'spinner-icon' : ''}
              />
              {checking ? 'Verificando...' : 'Verificar estado'}
            </button>
          )}
          <button
            onClick={handleLogout}
            className="btn-logout"
          >
            <FiLogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pending-footer">
        <Footer />
      </div>
    </div>
  );
}