import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiLock, FiArrowLeft, FiInfo, FiUser, FiGlobe, FiMonitor } from 'react-icons/fi';
import { useSession } from '../../context/SessionContext';
import { useAudit } from '../../Helper/useAudit';

export default function AccessDeniedPage({ moduleCode, pageCode, attemptedPath }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const { logCustom } = useAudit();
  const [userIP, setUserIP] = useState('Obteniendo IP...');
  const [userAgent, setUserAgent] = useState('');
  const [browserInfo, setBrowserInfo] = useState({});

  // ─── OBTENER INFORMACIÓN DEL NAVEGADOR ──────────────────────────────
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    setUserAgent(ua);
    
    let browserName = 'Desconocido';
    let osName = 'Desconocido';
    let deviceType = 'Desktop';
    
    // Detectar navegador
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) browserName = 'Chrome';
    else if (ua.indexOf('Firefox') > -1) browserName = 'Firefox';
    else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browserName = 'Safari';
    else if (ua.indexOf('Edg') > -1) browserName = 'Edge';
    else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) browserName = 'Opera';
    else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) browserName = 'Internet Explorer';
    
    // Detectar sistema operativo
    if (ua.indexOf('Windows') > -1) osName = 'Windows';
    else if (ua.indexOf('Mac OS') > -1) osName = 'macOS';
    else if (ua.indexOf('Linux') > -1) osName = 'Linux';
    else if (ua.indexOf('Android') > -1) osName = 'Android';
    else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) osName = 'iOS';
    
    // Detectar dispositivo
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      deviceType = 'Tablet';
    } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
      deviceType = 'Mobile';
    }
    
    setBrowserInfo({ browserName, osName, deviceType });
  };

  // ─── OBTENER IP PÚBLICA ──────────────────────────────────────────────
  const getPublicIP = async () => {
    try {
      // Usar múltiples servicios como fallback
      const services = [
        'https://api.ipify.org?format=json',
        'https://api.myip.com',
        'https://ipapi.co/json/'
      ];
      
      for (const service of services) {
        try {
          const response = await fetch(service);
          if (response.ok) {
            const data = await response.json();
            const ip = data.ip || data.ip_address || null;
            if (ip) {
              setUserIP(ip);
              return;
            }
          }
        } catch (e) {
          // Continuar con el siguiente servicio
        }
      }
      setUserIP('No disponible');
    } catch (error) {
      console.warn('No se pudo obtener la IP pública:', error);
      setUserIP('No disponible');
    }
  };

  // ─── INICIALIZAR ──────────────────────────────────────────────────────
  useEffect(() => {
    getBrowserInfo();
    getPublicIP();
  }, []);

  // ─── REGISTRAR AUDITORÍA DE ACCESO DENEGADO ──────────────────────────
  useEffect(() => {
    const logAccessDenied = async () => {
      try {
        // Esperar a tener la IP
        let ip = userIP;
        if (ip === 'Obteniendo IP...') {
          await new Promise(resolve => setTimeout(resolve, 1500));
          ip = userIP;
        }

        await logCustom(
          'security',
          'ACCESS_DENIED',
          {
            newValues: {
              // Información del usuario
              user_id: user?.id || 'unknown',
              user_email: user?.email || 'unknown',
              user_name: user?.firstName || user?.first_name || user?.name || 'Usuario',
              user_lastname: user?.lastName || user?.last_name || '',
              user_role: user?.roleCode || user?.role || user?.roleName || 'unknown',
              user_phone: user?.phone || user?.telefono || '',
              
              // Información del intento
              module: moduleCode || 'unknown',
              page: pageCode || 'unknown',
              attempted_path: attemptedPath || window.location.pathname,
              full_url: window.location.href,
              
              // Información técnica
              timestamp: new Date().toISOString(),
              ip_address: ip || 'unknown',
              user_agent: userAgent || navigator.userAgent,
              browser: browserInfo.browserName || 'Desconocido',
              os: browserInfo.osName || 'Desconocido',
              device: browserInfo.deviceType || 'Desconocido',
              screen_resolution: `${window.screen.width}x${window.screen.height}`,
              language: navigator.language || 'unknown',
              
              // Información de sesión
              session_id: sessionStorage.getItem('session_id') || 'unknown',
              referrer: document.referrer || 'direct',
              timestamp_local: new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })
            },
            description: `ACCESO DENEGADO: ${user?.email || 'Usuario'} intentó acceder a ${moduleCode}/${pageCode || attemptedPath} desde IP ${ip}`,
            reason: 'Acceso denegado - Usuario sin permisos suficientes para el módulo/página solicitada'
          }
        );
      } catch (error) {
        console.error('Error registrando auditoría de acceso denegado:', error);
      }
    };

    // Ejecutar después de tener la IP
    if (userIP !== 'Obteniendo IP...') {
      logAccessDenied();
    } else {
      // Esperar un poco para que se obtenga la IP
      const timeout = setTimeout(() => {
        logAccessDenied();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [moduleCode, pageCode, attemptedPath, user, logCustom, userIP, userAgent, browserInfo]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoDashboard = () => {
    navigate('/app/core/dashboard');
  };

  return (
    <div className="access-denied-page">
      <div className="access-denied-container">
        <div className="access-denied-icon">
          <FiLock size={64} color="#ef4444" />
        </div>
        
        <h1 className="access-denied-title">Acceso Denegado</h1>
        
        <p className="access-denied-message">
          No tienes permisos suficientes para acceder a esta página.
        </p>
        
        <div className="access-denied-details">
          <div className="access-denied-detail-item">
            <span className="access-denied-detail-label">
              <FiUser size={14} /> Usuario
            </span>
            <span className="access-denied-detail-value">
              {user?.firstName || user?.first_name || 'Usuario'} {user?.lastName || user?.last_name || ''}
            </span>
          </div>
          <div className="access-denied-detail-item">
            <span className="access-denied-detail-label">Email</span>
            <span className="access-denied-detail-value">{user?.email || 'No autenticado'}</span>
          </div>
          <div className="access-denied-detail-item">
            <span className="access-denied-detail-label">
              <FiGlobe size={14} /> IP
            </span>
            <span className="access-denied-detail-value">{userIP}</span>
          </div>
          <div className="access-denied-detail-item">
            <span className="access-denied-detail-label">
              <FiMonitor size={14} /> Navegador
            </span>
            <span className="access-denied-detail-value">
              {browserInfo.browserName} / {browserInfo.osName}
            </span>
          </div>
          <div className="access-denied-detail-item">
            <span className="access-denied-detail-label">
              <FiInfo size={14} /> Dispositivo
            </span>
            <span className="access-denied-detail-value">{browserInfo.deviceType}</span>
          </div>
          <div className="access-denied-detail-item">
            <span className="access-denied-detail-label">Módulo</span>
            <span className="access-denied-detail-value">{moduleCode || 'Desconocido'}</span>
          </div>
          <div className="access-denied-detail-item">
            <span className="access-denied-detail-label">Página</span>
            <span className="access-denied-detail-value">{pageCode || 'Desconocida'}</span>
          </div>
        </div>
        <div className="access-denied-audit-note">
          <FiAlertCircle size={14} />
          <span>Este intento de acceso ha sido registrado en la auditoría del sistema.</span>
        </div>
      </div>
    </div>
  );
}