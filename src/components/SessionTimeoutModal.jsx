import React from 'react';

export default function SessionTimeoutModal({ onExtend, onLogout, secondsLeft }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>Sesión a punto de expirar</h2>
        <p style={{ margin: '18px 0', fontSize: 16 }}>
          Tu sesión expirará en <b>{secondsLeft}</b> segundos.<br />¿Deseas extender el tiempo?
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
          <button onClick={onLogout} style={{ background: '#ff6b6b', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Cerrar sesión</button>
          <button onClick={onExtend} style={{ background: '#00c853', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Extender</button>
        </div>
      </div>
    </div>
  );
}
