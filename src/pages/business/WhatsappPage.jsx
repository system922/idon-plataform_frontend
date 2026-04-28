import { useState, useEffect, useRef } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { RefreshCw, CheckCircle, XCircle, Smartphone, AlertCircle, LogOut, Loader } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';

const STATUS_INFO = {
  ready:        { color: '#15803d', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.3)',   icon: <CheckCircle size={22} color="#22c55e" />, label: 'Conectado' },
  qr:           { color: '#b45309', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.3)',   icon: <Smartphone  size={22} color="#d97706" />, label: 'Esperando escaneo' },
  loading:      { color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.3)',  icon: <Loader      size={22} color="#818cf8" />, label: 'Iniciando…' },
  disconnected: { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)',   border: 'rgba(225,29,72,0.25)',  icon: <XCircle     size={22} color="#e11d48" />, label: 'Desconectado' },
  auth_failure: { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', icon: <AlertCircle size={22} color="#6b7280" />, label: 'Error de autenticación' },
};

export default function WhatsappPage() {
  const [rawStatus,  setRawStatus]  = useState('disconnected');
  const [qr,         setQr]         = useState(null);
  const [actionLoad, setActionLoad] = useState(false);
  const [msg,        setMsg]        = useState('');
  const [msgType,    setMsgType]    = useState('info');
  const [attempts,   setAttempts]   = useState(0);
  const [waitingQr,  setWaitingQr]  = useState(false); // true tras pulsar Conectar
  const waitingRef = useRef(false);
  const pollRef    = useRef(null);

  // Estado visible: si acabamos de reiniciar y aún no llega QR → mostrar 'loading'
  const status = (waitingQr && rawStatus === 'disconnected') ? 'loading' : rawStatus;

  const poll = async () => {
    try {
      const res  = await fetchWithAuth('/api/whatsapp/status');
      const data = await res.json();
      const s    = data.status || 'disconnected';
      setRawStatus(s);
      setQr(data.qr || null);
      setAttempts(data.reconnectAttempts || 0);

      // Si ya llegó QR o está listo → dejar de esperar
      if (s === 'qr' || s === 'ready') {
        setWaitingQr(false);
        waitingRef.current = false;
      }

      // Si inicializando en el backend → mantener loading
      if (data.initializing) {
        setWaitingQr(true);
        waitingRef.current = true;
      }
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  const notify = (text, type = 'info') => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  };

  const handleConnect = async () => {
    setActionLoad(true);
    setWaitingQr(true);
    waitingRef.current = true;
    setQr(null);
    setRawStatus('disconnected');
    try {
      await fetchWithAuth('/api/whatsapp/restart', { method: 'POST' });
      notify('Chrome iniciando — el QR aparece en ~20 segundos...');
    } catch {
      notify('Error al conectar con el servidor', 'error');
      setWaitingQr(false);
      waitingRef.current = false;
    } finally {
      setActionLoad(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Cerrar sesión de WhatsApp? Tendrás que escanear el QR de nuevo.')) return;
    setActionLoad(true);
    try {
      await fetchWithAuth('/api/whatsapp/logout', { method: 'POST' });
      notify('Sesión cerrada. Pulsa "Conectar" para vincular un número nuevo.');
      setRawStatus('disconnected');
      setQr(null);
      setWaitingQr(false);
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
              disabled={actionLoad || status === 'loading'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 6, cursor: (actionLoad || status === 'loading') ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: (actionLoad || status === 'loading') ? 0.7 : 1 }}
            >
              <RefreshCw size={14} style={{ animation: (actionLoad || status === 'loading') ? 'spin 1s linear infinite' : 'none' }} />
              {status === 'loading' ? 'Iniciando…' : status === 'qr' ? 'Regenerar QR' : 'Conectar'}
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
        <div style={{ animation: status === 'loading' ? 'spin 1.2s linear infinite' : 'none', display: 'flex' }}>
          {info.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: info.color }}>{info.label}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {status === 'ready'        && 'Las facturas autorizadas se envían automáticamente al número del cliente.'}
            {status === 'loading'      && 'Chrome está arrancando y cargando WhatsApp Web. El QR aparece en ~20–30 seg…'}
            {status === 'qr'           && 'Abre WhatsApp → ⋮ → Dispositivos vinculados → Vincular un dispositivo → escanea el QR de abajo.'}
            {status === 'disconnected' && !waitingQr && 'Pulsa "Conectar" para generar el código QR o reconectar la sesión guardada.'}
            {status === 'auth_failure' && 'La sesión expiró o fue cerrada desde el celular. Pulsa "Conectar" para escanear un nuevo QR.'}
          </div>
          {attempts > 0 && status !== 'ready' && (
            <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
              ⚠ Intentos de reconexión: {attempts}
              {attempts >= 3 && ' — Verifica que el backend esté activo y Chrome instalado.'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: status === 'ready' ? '#22c55e' : status === 'loading' ? '#818cf8' : '#94a3b8', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          En vivo
        </div>
      </div>

      {/* Spinner de espera mientras carga */}
      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '30px 20px', background: 'rgba(99,102,241,0.05)', border: '1.5px solid rgba(99,102,241,0.2)', borderRadius: 14, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, border: '4px solid rgba(99,102,241,0.2)', borderTop: '4px solid #818cf8', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <div style={{ fontSize: 14, color: '#818cf8', fontWeight: 600 }}>Iniciando Chrome y WhatsApp Web…</div>
          <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', maxWidth: 340 }}>
            La primera vez puede tomar hasta 30 segundos. El código QR aparecerá automáticamente.
          </div>
        </div>
      )}

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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </PageTemplate>
  );
}
