import React, { useState } from 'react';
import '../styles/PasswordModal.css'; // importa el CSS separado

export default function PasswordModal({ open, onClose, onSubmit, submitting, error }) {
  const [password, setPassword] = useState('');

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(password);
  }

  return (
    <div className="pw-modal-overlay">
      <form className="pw-modal-form" onSubmit={handleSubmit}>
        <div className="pw-title">Clave Jefe/a de Caja</div>
        <input
          autoFocus
          type="password"
          placeholder="Ingresar clave..."
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={submitting}
          className="pw-input"
        />
        {error && <div className="pw-error">{error}</div>}
        <div className="pw-actions">
          <button
            type="submit"
            disabled={submitting || !password}
            className="pw-btn pw-btn-green"
          >
            {submitting ? "Validando..." : "Validar"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="pw-btn pw-btn-cancel"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}