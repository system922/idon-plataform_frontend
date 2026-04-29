import { useState } from 'react';
import '../styles/UserPasswordModal.css';

export default function UserPasswordModal({ visible, onClose, onSuccess, schema }) {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const handleValidate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/pos/cash-register/validate-jefa-caja', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DB-Name': schema,
        },
        body: JSON.stringify({ email, clave }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        onSuccess({ userId: data.userId, email: data.email });
        setEmail('');
        setClave('');
        setError('');
        onClose();
      } else {
        setError(data.error || 'Usuario o clave incorrecta o no es Jefe/a de Caja');
      }
    } catch {
      setError('Error de validación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-bg">
      <div className="modal">
        <h2>Validar Jefe/a de Caja</h2>
        <input
          type="text"
          placeholder="Usuario (email)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="Clave"
          value={clave}
          onChange={e => setClave(e.target.value)}
        />
        {error && <div style={{ color: 'red', fontSize: 13 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={onClose} disabled={loading}>Cancelar</button>
          <button onClick={handleValidate} disabled={loading || !email || !clave}>Validar</button>
        </div>
      </div>
      <style>{`
        .modal-bg { position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.2);z-index:1000;}
        .modal { background:white;padding:24px 24px 16px;border-radius:8px;min-width:320px;box-shadow:0 2px 8px #0003 }
        input { width:100%;margin:6px 0;padding:8px; }
      `}</style>
    </div>
  );
}