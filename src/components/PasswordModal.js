// src/components/PasswordModal.jsx
import React, { useState } from 'react';
import Modal from './General/Modal';
import Input from './General/Input';
import Button, { ButtonGroup } from './General/Button';
import { FiAlertCircle } from 'react-icons/fi';

export default function PasswordModal({ open, onClose, onSubmit, submitting, error }) {
  const [password, setPassword] = useState('');

  // Resetear password cuando se cierra
  React.useEffect(() => {
    if (!open) {
      setPassword('');
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Clave Jefe/a de Caja"
      size="sm"
      closeOnOverlayClick={!submitting}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            type="password"
            placeholder="Ingresar clave..."
            value={password}
            onChange={setPassword}
            disabled={submitting}
            autoFocus
            size="md"
            required
          />

          {error && (
            <div style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm, 8px)',
              background: 'var(--danger-bg, rgba(239, 68, 68, 0.08))',
              color: 'var(--danger, #ef4444)',
              fontSize: 'var(--font-size-sm, 12px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <FiAlertCircle size={14} /> {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-color, #E2E8F0)',
          }}>
            <ButtonGroup>
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={submitting || !password.trim()}
                loading={submitting}
              >
                {submitting ? 'Validando...' : 'Validar'}
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </form>
    </Modal>
  );
}