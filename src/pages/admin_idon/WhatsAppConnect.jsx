import React, { useState, useEffect, useRef } from 'react';
import {
  FiCheckCircle, FiXCircle, FiSmartphone, FiAlertCircle,
  FiRefreshCw, FiLogOut, FiWifi,
} from 'react-icons/fi';
import apiService from '../../services/apiService';
import '../../styles/AdminPages.css';

const STATUS_INFO = {
  ready: {
    color: '#22c55e', bg: 'rgba(34,197,94,.08)', border: 'rgba(34,197,94,.25)',
    icon: <FiCheckCircle size={22} color="#22c55e" />,
    label: 'Conectado',
    hint: 'WhatsApp está activo. Las notificaciones se enviarán automáticamente.',
  },
  qr: {
    color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)',
    icon: <FiSmartphone size={22} color="#f59e0b" />,
    label: 'Esperando escaneo',
    hint: 'Abre WhatsApp → ⋮ → Dispositivos vinculados → Vincular un dispositivo → escanea el QR.',
  },
  disconnected: {
    color: '#ef4444', bg: 'rgba(239,68,68,.06)', border: 'rgba(239,68,68,.2)',
    icon: <FiXCircle size={22} color="#ef4444" />,
    label: 'Desconectado',
    hint: 'Pulsa "Conectar" para generar el código QR o reconectar la sesión guardada.',
  },
  auth_failure: {
    color: '#6b7280', bg: 'rgba(107,114,128,.08)', border: 'rgba(107,114,128,.25)',
    icon: <FiAlertCircle size={22} color="#6b7280" />,
    label: 'Error de autenticación',
    hint: 'La sesión expiró o fue cerrada desde el celular. Pulsa "Conectar" para escanear un nuevo QR.',
  },
};

export default function WhatsAppConnect() {
  const [status,      setStatus]      = useState('disconnected');
  const [qr,          setQr]          = useState(null);
  const [attempts,    setAttempts]    = useState(0);
  const [queue,       setQueue]       = useState({ pending: 0, items: [] });
  const [actionLoad,  setActionLoad]  = useState(false);
  const [msg,         setMsg]         = useState(null);
  const pollRef = useRef(null);

  const poll = async () => {
    try {
      const data = await apiService.get('/admin/whatsapp/status');
      setStatus(data.status || 'disconnected');
      setQr(data.qr || null);
      setAttempts(data.reconnectAttempts ?? 0);
      setQueue(data.queue || { pending: 0, items: [] });
    } catch {
      // silencioso — backend puede estar reiniciando
    }
  };

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleFlushQueue = async () => {
    setActionLoad(true);
    try {
      await apiService.post('/admin/whatsapp/flush-queue', {});
      flash('Cola vaciada — mensajes pendientes enviados');
      poll();
    } catch (e) { flash('Error: ' + e.message, false); }
    finally { setActionLoad(false); }
  };

  const handleConnect = async () => {
    setActionLoad(true);
    try {
      await apiService.post('/admin/whatsapp/restart', {});
      flash('Iniciando conexión — espera el código QR...');
      setStatus('disconnected');
      setQr(null);
      setTimeout(poll, 2000);
    } catch (e) { flash('Error al iniciar: ' + e.message, false); }
    finally { setActionLoad(false); }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Cerrar sesión de WhatsApp? Tendrás que escanear el QR de nuevo.')) return;
    setActionLoad(true);
    try {
      await apiService.post('/admin/whatsapp/logout', {});
      flash('Sesión cerrada. Pulsa "Conectar" para vincular de nuevo.');
      setStatus('disconnected');
      setQr(null);
    } catch (e) { flash('Error al cerrar sesión: ' + e.message, false); }
    finally { setActionLoad(false); }
  };

  const info = STATUS_INFO[status] || STATUS_INFO.disconnected;

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">WhatsApp IDON</h1>
        <p className="admin-page-subtitle">Vincula el número de soporte IDON para envío de notificaciones automáticas</p>
      </div>

      {/* Feedback */}
      {msg && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: msg.ok ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
          border: `1px solid ${msg.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
          color: msg.ok ? '#22c55e' : '#ef4444',
        }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: qr ? '1fr 1fr' : '1fr', gap: 20 }}>

        {/* Tarjeta de estado */}
        <div className="admin-card">
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiWifi size={16} style={{ color: '#25D366' }} />
            <h2 style={{ margin: 0 }}>Estado de conexión</h2>
            {/* Indicador en vivo */}
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280' }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
                background: status === 'ready' ? '#22c55e' : '#94a3b8',
                animation: 'wa-pulse 2s infinite',
              }} />
              En vivo
            </span>
          </div>
          <div className="admin-card-body">
            {/* Badge de estado */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: info.bg, border: `1.5px solid ${info.border}`,
              borderRadius: 12, padding: '16px 20px', marginBottom: 20,
            }}>
              {info.icon}
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: info.color }}>{info.label}</div>
                <div style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginTop: 3 }}>{info.hint}</div>
              </div>
            </div>

            {/* Intentos de reconexión */}
            {attempts > 0 && status !== 'ready' && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 12,
                background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)',
                fontSize: 12, color: '#f59e0b',
              }}>
                ⟳ Intentos de reconexión automática: <strong>{attempts}</strong>
              </div>
            )}

            {/* Cola de mensajes pendientes */}
            {queue.pending > 0 && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.25)',
                fontSize: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 700 }}>
                    📥 {queue.pending} mensaje(s) en cola — se enviarán al conectar
                  </span>
                  {status === 'ready' && (
                    <button
                      onClick={handleFlushQueue} disabled={actionLoad}
                      style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: 'none',
                        background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Enviar ahora
                    </button>
                  )}
                </div>
                {queue.items.slice(0, 3).map((item, i) => (
                  <div key={i} style={{ marginTop: 4, color: '#6b7280', fontSize: 11 }}>
                    · {item.type} → {item.phone} (intento #{item.attempts})
                  </div>
                ))}
                {queue.items.length > 3 && (
                  <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
                    ... y {queue.items.length - 3} más
                  </div>
                )}
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 10 }}>
              {status !== 'ready' && (
                <button
                  className="admin-btn admin-btn-primary"
                  onClick={handleConnect}
                  disabled={actionLoad}
                  style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', border: 'none' }}
                >
                  <FiRefreshCw size={14} style={{ animation: actionLoad ? 'spin 1s linear infinite' : 'none' }} />
                  {status === 'qr' ? 'Regenerar QR' : 'Conectar WhatsApp'}
                </button>
              )}
              {status === 'ready' && (
                <button
                  className="admin-btn admin-btn-secondary"
                  onClick={handleLogout}
                  disabled={actionLoad}
                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,.3)' }}
                >
                  <FiLogOut size={14} /> Cerrar sesión
                </button>
              )}
            </div>

            {/* Guía cuando está listo */}
            {status === 'ready' && (
              <div style={{
                marginTop: 20, padding: '14px 16px', borderRadius: 10,
                background: 'rgba(37,211,102,.06)', border: '1px solid rgba(37,211,102,.15)',
              }}>
                <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#22c55e', fontSize: 13 }}>
                  ✓ Notificaciones activas
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--admin-text-secondary)', fontSize: 12, lineHeight: 2 }}>
                  <li>Registro de nuevo negocio → mensaje de bienvenida</li>
                  <li>Aprobación de negocio → confirmación al dueño</li>
                  <li>Suscripción creada → detalle del plan</li>
                  <li>Pago recibido → comprobante al dueño</li>
                  <li>Recordatorio → aviso de vencimiento próximo</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* QR para escanear */}
        {qr && status === 'qr' && (
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 style={{ margin: 0 }}>Escanea el código QR</h2>
            </div>
            <div className="admin-card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{
                padding: 12, borderRadius: 16,
                background: '#fff',
                border: '4px solid #25D366',
                boxShadow: '0 0 30px rgba(37,211,102,.25)',
              }}>
                <img src={qr} alt="QR WhatsApp" style={{ width: 220, height: 220, display: 'block' }} />
              </div>
              <div style={{ textAlign: 'center', maxWidth: 280 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--admin-text-primary)', margin: '0 0 6px' }}>
                  Abre WhatsApp en tu teléfono
                </p>
                <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', margin: 0, lineHeight: 1.6 }}>
                  Menú (⋮) → <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong>
                </p>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
                El QR se renueva automáticamente si no se escanea
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes wa-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
