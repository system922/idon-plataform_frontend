// components/Odontologia/EstadoCuenta/components/PrintModal.jsx

import React from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

const PrintModal = ({ isOpen, onPrint, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 20,
    }}>
      <div style={{
        background: '#13131f',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '32px 28px',
        maxWidth: 340,
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🧾</div>
        <h3 style={{ color: '#f1f5f9', margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
          ¿Imprimir comprobante?
        </h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>
          El pago fue registrado exitosamente.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => onPrint(true)}
            style={{
              background: 'linear-gradient(135deg,#10b981,#059669)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '11px 24px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FiCheck size={15} /> Sí, imprimir
          </button>
          <button
            onClick={() => onPrint(false)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '11px 24px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FiX size={15} /> No
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;