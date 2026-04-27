import { useState, useEffect, useRef } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { RefreshCw, CheckCircle, XCircle, Smartphone, AlertCircle, LogOut } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';

const STATUS_INFO = {
  ready:        { color: '#15803d', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.3)',   icon: <CheckCircle size={22} color="#22c55e" />, label: 'Conectado' },
  qr:           { color: '#b45309', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.3)',   icon: <Smartphone  size={22} color="#d97706" />, label: 'Esperando escaneo' },
  disconnected: { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)',   border: 'rgba(225,29,72,0.25)',  icon: <XCircle     size={22} color="#e11d48" />, label: 'Desconectado' },
  auth_failure: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', icon: <AlertCircle size={22} color="#6b7280" />, label: 'Error de autenticación' },
};

export default function WhatsappPage() {
  const [status,     setStatus]     = useState('disconnected');
  const [qr,         setQr]         = useState(null);
  const [actionLoad, setActionLoad] = useState(false);
  const [msg,        setMsg]        = useState('');
  const [msgType,    setMsgType]    = useState('info'); // 'info' | 'error'
  const pollRef = useRef(null);

  const poll = async () => {
    try {
      const res  = await fetchWithAuth('/api/whatsapp/status');
      const data = await res.json();
      setStatus(data.status || 'disconnected');
      setQr(data.qr || null);
    } catch {
      // silencioso — puede pasar si backend está reiniciando
    }
  };

  // Polling cada 3 s siempre (detecta desconexión desde el celular)
  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  const notify = (text, type = 'info') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleConnect = async () => {
    setActionLoad(true);
    try {
      await fetchWithAuth('/api/whatsapp/restart', { method: 'POST' });
      notify('Iniciando conexión — espera el código QR...');
      setStatus('disconnected');
      setQr(null);
      setTimeout(poll, 2000);
    } catch { notify('Error al iniciar', 'error'); }
    finally { setActionLoad(false); }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Cerrar sesión de WhatsApp? Tendrás que escanear el QR de nuevo.')) return;
    setActionLoad(true);
    try {
      await fetchWithAuth('/api/whatsapp/logout', { method: 'POST' });
      notify('Sesión cerrada. Pulsa "Conectar" para vincular un número nuevo.');
      setStatus('disconnected');
      setQr(null);
    } catch { notify('Error al cerrar sesión', 'error'); }
    finally { setActionLoad(false); }
  };

  const info = STATUS_INFO[status] || STATUS_INFO.disconnected;

  return (
    <PageTemplate
      title="WhatsApp"
      subtitle="Perfil Registrado para envíos automáticos a clientes"
      theme="business"
      headerAction={
        <div style={{ display: 'flex', gap: 8 }}>
          {status === 'ready' && (
            <button
              onClick={handleLogout}
              disabled={actionLoad}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              <LogOut size={14} /> Salir
            </button>
          )}
          {status !== 'ready' && (
            <button
              onClick={handleConnect}
              disabled={actionLoad}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              <RefreshCw size={14} style={{ animation: actionLoad ? 'spin 1s linear infinite' : 'none' }} />
              {status === 'qr' ? 'Regenerar QR' : 'Conectar'}
            </button>
          )}
        </div>
      }
    >
      {/* Mensaje de feedback */}
      {msg && (
        <div style={{
          background: msgType === 'error' ? '#fef2f2' : '#fff7ed',
          border: `1px solid ${msgType === 'error' ? '#fecaca' : '#fed7aa'}`,
          color: msgType === 'error' ? '#b91c1c' : '#b45309',
          borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13,
        }}>
          {msg}
        </div>
      )}

      {/* Tarjeta de estado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: info.bg, border: `1.5px solid ${info.border}`, borderRadius: 14, padding: '18px 22px', marginBottom: 20 }}>
        {info.icon}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: info.color }}>{info.label}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {status === 'ready'        && 'Las facturas autorizadas se envían automáticamente al número del cliente.'}
            {status === 'qr'           && 'Abre WhatsApp → ⋮ → Dispositivos vinculados → Vincular un dispositivo → escanea el QR de abajo.'}
            {status === 'disconnected' && 'Pulsa "Conectar" para generar el código QR o reconectar la sesión guardada.'}
            {status === 'auth_failure' && 'La sesión expiró o fue cerrada desde el celular. Pulsa "Conectar" para escanear un nuevo QR.'}
          </div>
        </div>
        {/* Indicador de polling en vivo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: status === 'ready' ? '#22c55e' : '#94a3b8', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          En vivo
        </div>
      </div>

      {/* QR para escanear */}
      {qr && status === 'qr' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: 28, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a202c' }}>Escanea con tu celular</div>
          <img
            src={qr}
            alt="QR WhatsApp"
            style={{ width: 240, height: 240, borderRadius: 10, border: '5px solid #25d366' }}
          />
          <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', maxWidth: 300 }}>
            <strong>WhatsApp</strong> → menú (⋮ o ···) → <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>El QR se actualiza automáticamente cada 20 seg si no es escaneado</div>
        </div>
      )}

      {/* Info cuando está listo */}
      {status === 'ready' && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 10, fontSize: 13 }}>¿Cómo funciona?</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#374151', fontSize: 13, lineHeight: 2 }}>
            <li>Al emitir una factura electrónica, el sistema envía el RIDE (PDF) al WhatsApp del cliente.</li>
            <li>Si el cliente no tiene número, el envío se omite sin afectar la factura.</li>
            <li>Si cierras sesión desde tu celular, esta página lo detecta en segundos y te pide reconectar.</li>
            <li>Para cambiar de número, pulsa <strong>Salir</strong> y escanea el QR con el número nuevo.</li>
          </ul>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </PageTemplate>
  );
}
