// components/Odontologia/Historias/HistoriaConfirmModal.jsx
import React from 'react';
import { FiX } from 'react-icons/fi';

export default function HistoriaConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar'
}) {
  if (!isOpen) return null;

  return (
    <div className="hc-modal-overlay">
      <div className="hc-modal">
        <div className="hc-modal-header">
          <h3 className="hc-modal-title">{title}</h3>
          <button className="hc-modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>
        <p className="hc-modal-message">{message}</p>
        <div className="hc-modal-actions">
          <button className="hc-modal-btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className="hc-modal-btn-delete" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}