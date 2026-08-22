import React from 'react';
import Modal from './General/Modal';
import { IconTextButton, ButtonGroup } from './General/Button';
import { X, CheckCircle, Trash2 } from 'react-feather';
import { useState } from 'react';

// ─── HOOK useConfirm ─────────────────────────────────────────────
export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    danger: false,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: null,
    onCancel: null,
  });

  const open = (newConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const confirm = () => {
    config.onConfirm?.();
    close();
  };

  return { isOpen, open, close, confirm, config };
}

// ─── COMPONENTE ConfirmModal ─────────────────────────────────────
const ConfirmModal = ({
  isOpen,
  title = 'Confirmar',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
    >
      <div style={{ padding: '8px 0' }}>
        {/* Mensaje */}
        <p style={{
          fontSize: 'var(--font-size-base, 14px)',
          color: 'var(--text-primary, #1A202C)',
          marginBottom: '24px',
          lineHeight: 1.6,
        }}>
          {message}
        </p>

        {/* Botones */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          borderTop: '1px solid var(--border-color, #E2E8F0)',
          paddingTop: '16px',
        }}>
          {cancelText && (
            <ButtonGroup>
              <IconTextButton
                variant=""
                size="md"
                icon={<X size={14} />}
                onClick={onCancel}
                style={{
                  color: 'var(--text-secondary, #4A5568)',
                  background: 'var(--bg-tertiary, #f8fafc)',
                  border: '1px solid var(--border-color, #E2E8F0)',
                }}
              >
                {cancelText}
              </IconTextButton>
            </ButtonGroup>
          )}
          <IconTextButton
            variant={danger ? 'danger' : 'primary'}
            size="md"
            icon={danger ? <Trash2 size={14} /> : <CheckCircle size={14} />}
            onClick={onConfirm}
          >
            {confirmText}
          </IconTextButton>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;