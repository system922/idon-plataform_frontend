// src/components/ToothEditor.jsx
import React, { useState, useEffect } from 'react';
import { FiSave, FiTrash, FiX } from 'react-icons/fi';
import { CONDITION_MAP, SURFACE_OPTIONS } from '../Odontograma';

export default function ToothEditor({
  toothNumber,
  toothData,
  onSave,
  onClear,
  onClose,
  tratamientos = [],
}) {
  // Estado local
  const [form, setForm] = useState({
    treatment: '',
    surface: '',        // <-- ahora es un string (una sola superficie)
    condition: '',      // <-- ahora es un string (una sola condición)
    observations: '',
  });

  // Sincronizar con datos externos
  useEffect(() => {
    if (toothData) {
      setForm({
        treatment: toothData.treatment || '',
        surface: toothData.surface || '',        // superficie seleccionada
        condition: toothData.condition || '',    // condición seleccionada
        observations: toothData.observations || '',
      });
    } else {
      setForm({
        treatment: '',
        surface: '',
        condition: '',
        observations: '',
      });
    }
  }, [toothData]);

  const handleSave = () => {
    onSave(toothNumber, form);
  };

  const handleClear = () => {
    onClear(toothNumber);
  };

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ margin: 0, color: '#fff', fontSize: 18 }}>Diente #{toothNumber}</h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="odont-btn-icon delete" onClick={handleClear} title="Limpiar todo">
            <FiTrash size={16} />
          </button>
          <button className="odont-btn-icon edit" onClick={onClose}>
            <FiX size={16} />
          </button>
        </div>
      </div>

      {/* Tratamiento (select) */}
      <div className="form-group">
        <label>Tratamiento</label>
        <select
          value={form.treatment}
          onChange={(e) => setForm({ ...form, treatment: e.target.value })}
        >
          <option value="">Seleccionar</option>
          {tratamientos.map((t) => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Superficie (select) */}
      <div className="form-group">
        <label>Superficie</label>
        <select
          value={form.surface}
          onChange={(e) => setForm({ ...form, surface: e.target.value })}
        >
          <option value="">Seleccionar</option>
          {SURFACE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Condición (select) */}
      <div className="form-group">
        <label>Condición</label>
        <select
          value={form.condition}
          onChange={(e) => setForm({ ...form, condition: e.target.value })}
        >
          <option value="">Seleccionar</option>
          {Object.entries(CONDITION_MAP).map(([key, val]) => (
            <option key={key} value={key}>
              {val.icon} {val.label}
            </option>
          ))}
        </select>
      </div>

      {/* Observaciones */}
      <div className="form-group">
        <label>Observaciones</label>
        <textarea
          value={form.observations}
          onChange={(e) => setForm({ ...form, observations: e.target.value })}
          rows={2}
          placeholder="Detalles adicionales..."
        />
      </div>

      <button className="odont-btn-primary" onClick={handleSave} style={{ width: '100%', marginTop: 4 }}>
        <FiSave /> Guardar pieza
      </button>
    </div>
  );
}