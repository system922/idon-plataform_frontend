// src/pages/cashier/components/PrintModal.jsx
import React from 'react';
import { MdOutlineReceiptLong } from 'react-icons/md';
import { FiCheck, FiX } from 'react-icons/fi';

const PrintModal = ({ isOpen, onPrint, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.6)', 
      zIndex: 9999, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ 
        background: '#1e293b', 
        borderRadius: 14, 
        padding: '32px 28px', 
        maxWidth: 340, 
        width: '90%', 
        textAlign: 'center', 
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)' 
      }}>
        <MdOutlineReceiptLong size={44} style={{ color: '#a78bfa', marginBottom: 12 }} />
        <h3 style={{ color: '#f1f5f9', margin: '0 0 8px', fontSize: 18 }}>¿Imprimir comprobante?</h3>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 24px' }}>
          El pago fue registrado exitosamente.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button 
            onClick={() => onPrint(true)} 
            style={{ 
              background: '#7c3aed', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 8, 
              padding: '10px 22px', 
              cursor: 'pointer', 
              fontWeight: 700, 
              fontSize: 15, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6 
            }}
          >
            <FiCheck size={16} /> Sí, imprimir
          </button>
          <button 
            onClick={() => onPrint(false)} 
            style={{ 
              background: '#334155', 
              color: '#e2e8f0', 
              border: 'none', 
              borderRadius: 8, 
              padding: '10px 22px', 
              cursor: 'pointer', 
              fontWeight: 700, 
              fontSize: 15, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6 
            }}
          >
            <FiX size={16} /> No
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;