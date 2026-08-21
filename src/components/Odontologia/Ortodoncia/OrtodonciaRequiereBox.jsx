// src/components/Odontologia/Ortodoncia/OrtodonciaRequiereBox.jsx
import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

export default function OrtodonciaRequiereBox({ requiere, motivo, onRequiereChange, onMotivoChange }) {
  return (
    <div style={{
      padding: '16px 20px',
      background: '#f0fdf4',
      borderRadius: '8px',
      margin: '16px 20px',
      border: '1px solid #bbf7d0'
    }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '15px',
        fontWeight: 600,
        color: '#065f46',
        cursor: 'pointer'
      }}>
        <input
          type="checkbox"
          checked={requiere}
          onChange={(e) => onRequiereChange(e.target.checked)}
          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
        />
        <span>Requiere tratamiento de ortodoncia</span>
      </label>
      {!requiere && (
        <div style={{ marginTop: '10px' }}>
          <label style={{ fontWeight: 500, fontSize: '13px', color: '#475569' }}>
            Motivo de no requerir tratamiento
          </label>
          <textarea
            value={motivo}
            onChange={(e) => onMotivoChange(e.target.value)}
            placeholder="Ej: Paciente sin alteraciones oclusales que requieran tratamiento ortodóntico."
            rows={2}
            style={{
              width: '100%',
              marginTop: '4px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
              fontFamily: 'inherit',
              background: '#ffffff',
              transition: 'border 0.2s'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#10b981'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
          />
        </div>
      )}
    </div>
  );
}