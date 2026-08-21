// components/Odontologia/Historias/HistoriaForm.jsx
import React from 'react';
import { FiSave } from 'react-icons/fi';

// Tipos de historias clínicas disponibles
const HISTORIA_TIPOS = {
  ODONTOGRAMA: 'odontograma',
  PERIODONTOGRAMA: 'periodontograma',
  EVALUACION_INICIAL: 'evaluacion_inicial',
  EVOLUCION: 'evolucion',
  INTERCONSULTA: 'interconsulta'
};

const TIPO_LABELS = {
  [HISTORIA_TIPOS.ODONTOGRAMA]: 'Odontograma',
  [HISTORIA_TIPOS.PERIODONTOGRAMA]: 'Periodontograma',
  [HISTORIA_TIPOS.EVALUACION_INICIAL]: 'Evaluación Inicial',
  [HISTORIA_TIPOS.EVOLUCION]: 'Evolución',
  [HISTORIA_TIPOS.INTERCONSULTA]: 'Interconsulta'
};

const TIPO_ICONS = {
  [HISTORIA_TIPOS.ODONTOGRAMA]: '🦷',
  [HISTORIA_TIPOS.PERIODONTOGRAMA]: '🫧',
  [HISTORIA_TIPOS.EVALUACION_INICIAL]: '📋',
  [HISTORIA_TIPOS.EVOLUCION]: '📊',
  [HISTORIA_TIPOS.INTERCONSULTA]: '👨‍⚕️'
};

export default function HistoriaForm({
  form,
  setForm,
  tipoSeleccionado,
  setTipoSeleccionado,
  selectedHistoria,
  onSave,
  onCancel,
  saving = false
}) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    if (name === 'tipo') {
      setTipoSeleccionado(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(form);
  };

  return (
    <form className="hc-form" onSubmit={handleSubmit}>
      <h4 className="hc-form-title">
        {selectedHistoria ? 'Editar Historia' : 'Nueva Historia'}
      </h4>

      <div className="hc-form-group">
        <label className="hc-form-label">Tipo de historia *</label>
        <select
          className="hc-form-select"
          name="tipo"
          value={form.tipo}
          onChange={handleChange}
          disabled={saving}
        >
          {Object.entries(TIPO_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {TIPO_ICONS[key]} {label}
            </option>
          ))}
        </select>
      </div>

      <div className="hc-form-group">
        <label className="hc-form-label">Título *</label>
        <input
          type="text"
          className="hc-form-input"
          name="titulo"
          value={form.titulo}
          onChange={handleChange}
          placeholder="Ej: Evaluación inicial, Control de caries..."
          disabled={saving}
          required
        />
      </div>

      <div className="hc-form-group">
        <label className="hc-form-label">Fecha</label>
        <input
          type="date"
          className="hc-form-input"
          name="fecha"
          value={form.fecha}
          onChange={handleChange}
          disabled={saving}
        />
      </div>

      <div className="hc-form-group">
        <label className="hc-form-label">Descripción</label>
        <textarea
          className="hc-form-textarea"
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          placeholder="Breve descripción de la historia"
          rows={2}
          disabled={saving}
        />
      </div>

      <div className="hc-form-group">
        <label className="hc-form-label">Datos (JSON)</label>
        <textarea
          className="hc-form-textarea hc-form-textarea-json"
          name="datos"
          value={form.datos}
          onChange={handleChange}
          placeholder='{"diagnostico": "...", "plan": "..."}'
          rows={4}
          disabled={saving}
        />
        <small className="hc-form-hint">
          Guarda información estructurada en formato JSON
        </small>
      </div>

      <div className="hc-form-group">
        <label className="hc-form-label">Observaciones</label>
        <textarea
          className="hc-form-textarea"
          name="observaciones"
          value={form.observaciones}
          onChange={handleChange}
          placeholder="Observaciones adicionales"
          rows={3}
          disabled={saving}
        />
      </div>

      <div className="hc-form-group">
        <label className="hc-form-label">Notas</label>
        <textarea
          className="hc-form-textarea"
          name="notas"
          value={form.notas}
          onChange={handleChange}
          placeholder="Notas internas"
          rows={2}
          disabled={saving}
        />
      </div>

      <div className="hc-form-actions">
        <button 
          type="button"
          className="hc-btn-cancel" 
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button 
          type="submit"
          className="hc-btn-save" 
          disabled={saving}
        >
          <FiSave size={16} /> 
          {saving ? 'Guardando...' : (selectedHistoria ? 'Actualizar' : 'Guardar')}
        </button>
      </div>
    </form>
  );
}