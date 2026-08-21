// src/components/Odontologia/Ortodoncia/OrtodonciaHeader.jsx
import React from 'react';
import { FiEdit3, FiRefreshCw, FiSave } from 'react-icons/fi';

export default function OrtodonciaHeader({ ortodonciaId, saving, onSave }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderBottom: '1px solid #e2e8f0',
      background: '#fafbfc',
      borderRadius: '8px 8px 0 0'
    }}>
      <div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#0f172a',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FiEdit3 size={20} style={{ color: '#6366f1' }} />
          Ortodoncia
          {ortodonciaId && (
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: '#64748b',
              background: '#f1f5f9',
              padding: '2px 10px',
              borderRadius: '12px',
              marginLeft: '8px'
            }}>
              ID: {ortodonciaId.slice(0, 8)}
            </span>
          )}
          {saving && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: '#3b82f6',
              marginLeft: '8px'
            }}>
              <FiRefreshCw className="spin" size={14} /> Guardando...
            </span>
          )}
        </h3>
      </div>
      <div>
        <button
          className="odonto-btn-primary"
          onClick={onSave}
          disabled={saving}
        >
          <FiSave size={16} />
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}