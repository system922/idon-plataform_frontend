// src/components/PanelEdicion.jsx
import React, { useState } from 'react';
import { CONDITION_MAP, SURFACE_OPTIONS } from '../Odontograma';

export default function PanelEdicion({ toothNumber, data, onUpdate, onClose }) {
  const [conditions, setConditions] = useState(data.conditions || []);
  const [surfaces, setSurfaces] = useState(data.surfaces || []);
  const [treatment, setTreatment] = useState(data.treatment || '');
  const [caras, setCaras] = useState(data.caras || {});

  const handleAddCondition = (cond) => {
    if (!conditions.includes(cond)) {
      setConditions([...conditions, cond]);
    }
  };

  const handleRemoveCondition = (cond) => {
    setConditions(conditions.filter(c => c !== cond));
  };

  const handleToggleSurface = (surf) => {
    setSurfaces(prev =>
      prev.includes(surf) ? prev.filter(s => s !== surf) : [...prev, surf]
    );
  };

  const handleSave = () => {
    onUpdate({ conditions, surfaces, treatment, caras });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: 320,
      backgroundColor: '#fff',
      boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
      padding: '24px',
      overflowY: 'auto',
      zIndex: 100,
    }}>
      <button onClick={onClose} style={{ float: 'right', border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
      <h3>Diente #{toothNumber}</h3>

      <div style={{ marginTop: 20 }}>
        <label style={{ fontWeight: 600 }}>Condiciones</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {Object.entries(CONDITION_MAP).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={() => conditions.includes(key) ? handleRemoveCondition(key) : handleAddCondition(key)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid #ccc',
                background: conditions.includes(key) ? color : '#f1f5f9',
                color: conditions.includes(key) ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <label style={{ fontWeight: 600 }}>Superficies afectadas</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {SURFACE_OPTIONS.map(surf => (
            <button
              key={surf}
              onClick={() => handleToggleSurface(surf)}
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                border: '1px solid #ccc',
                background: surfaces.includes(surf) ? '#3b82f6' : '#f1f5f9',
                color: surfaces.includes(surf) ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              {surf.charAt(0).toUpperCase() + surf.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <label style={{ fontWeight: 600 }}>Tratamiento</label>
        <input
          type="text"
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          style={{ width: '100%', marginTop: 6, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
          placeholder="Ej: Endodoncia, Obturación..."
        />
      </div>

      <button
        onClick={handleSave}
        style={{
          marginTop: 24,
          width: '100%',
          padding: '12px',
          background: '#0f172a',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Guardar cambios
      </button>
    </div>
  );
}