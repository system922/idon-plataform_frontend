import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiCheckCircle, FiMail, FiLogOut, FiRefreshCw } from 'react-icons/fi';
import { fetchWithAuth } from '../config/apiBase';

const STEPS = [
  { label: 'Solicitud Enviada',         done: true },
  { label: 'En revisión por Soporte',   done: false, active: true },
  { label: 'Aprobación y Activación',   done: false },
];

export default function PendingApprovalPage({ onLogout }) {
  const navigate   = useNavigate();
  const [checking, setChecking] = useState(false);
  const [approved, setApproved] = useState(false);

  // Datos del usuario guardado
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('idonUser') || '{}'); } catch { return {}; }
  })();

  // Chequea si el negocio ya fue aprobado
  async function checkStatus() {
    setChecking(true);
    try {
      const res = await fetchWithAuth('/api/business-status');
      if (res.ok) {
        const data = await res.json();
        if (data?.businesses?.length > 0 || data?.is_active) {
          setApproved(true);
          setTimeout(() => navigate('/login', { replace: true }), 2000);
        }
      }
    } catch {}
    setChecking(false);
  }

  function handleLogout() {
    localStorage.clear();
    if (onLogout) onLogout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      padding: 5,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: '10px 20px',
        maxWidth: '100%',
        width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #f97316, #fb923c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 0 40px rgba(249,115,22,0.3)',
        }}>
          {approved
            ? <FiCheckCircle size={36} color="#fff" />
            : <FiClock size={25} color="#fff" />
          }
          
        </div>

        {/* Title */}
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 10px' }}>
          {approved ? '¡Negocio aprobado!' : 'Solicitud en revisión'}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, margin: '0 0 32px' }}>
          {approved
            ? 'Tu negocio fue aprobado. Redirigiendo al login...'
            : <>
                Hola <strong style={{ color: '#f97316' }}>{user.firstName || user.name || 'usuario'}</strong>, tu solicitud de registro
                está siendo revisada por el equipo de Soporte IDON.
                En breve se te notificará cuando haya sido aprobada exitosamente.
              </>
          }
        </p>

        {/* Progress steps */}
        {!approved && (
          <div style={{ margin: '0 0 36px', textAlign: 'left' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: i < STEPS.length - 1 ? 0 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: step.done
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                      : step.active
                        ? 'linear-gradient(135deg, #f97316, #fb923c)'
                        : 'rgba(255,255,255,0.08)',
                    border: step.active ? '2px solid #f97316' : step.done ? '2px solid #22c55e' : '2px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: step.active ? '0 0 16px rgba(249,115,22,0.4)' : 'none',
                  }}>
                    {step.done
                      ? <FiCheckCircle size={16} color="#fff" />
                      : <span style={{ color: step.active ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
                    }
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 2, height: 28, background: step.done ? '#22c55e' : 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 1 ? 28 : 0 }}>
                  <div style={{
                    color: step.done ? '#22c55e' : step.active ? '#f97316' : 'rgba(255,255,255,0.35)',
                    fontWeight: step.active ? 700 : 500,
                    fontSize: 14,
                  }}>
                    {step.label}
                  </div>
                  {step.active && (
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>
                      Tiempo estimado: 24–48 horas hábiles
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Phone hint */}
        {!approved && (
          <div style={{
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.2)',
            borderRadius: 10, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 28, textAlign: 'left',
          }}>
            <FiMail size={18} color="#f97316" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ color: '#f97316', fontSize: 13, fontWeight: 600 }}>Notificación por mensaje de Whatsapp</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>
                Recibirás un mensaje en <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{user.phone}</strong> cuando tu negocio sea aprobado.
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {!approved && (
            <button
              onClick={checkStatus}
              disabled={checking}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #f97316, #fb923c)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '11px 22px', fontWeight: 700, fontSize: 14,
                cursor: checking ? 'default' : 'pointer',
                opacity: checking ? 0.7 : 1,
              }}
            >
              <FiRefreshCw size={15} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
              {checking ? 'Verificando...' : 'Verificar estado'}
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, padding: '11px 22px',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            <FiLogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
