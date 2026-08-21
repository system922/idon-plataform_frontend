// components/Odontologia/Ortodoncia/OrtodonciaResumen.jsx
import React from 'react';

const styles = {
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border 0.2s',
  },
  select: {
    padding: '8px 32px 8px 12px',
    borderRadius: '6px',
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    fontFamily: 'inherit',
    appearance: 'none',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'vertical',
    width: '100%',
    boxSizing: 'border-box',
  },
};

export default function OrtodonciaResumen({ form, handleNestedChange }) {
  const r = form.resumen || {};

  const selectField = (name, label, options) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <select
        style={styles.select}
        value={r[name] || ''}
        onChange={(e) => handleNestedChange('resumen', name, e.target.value)}
      >
        {options.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </div>
  );

  const inputField = (name, label, type = 'text') => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        value={r[name] || ''}
        onChange={(e) => handleNestedChange('resumen', name, e.target.value)}
      />
    </div>
  );

  const textareaField = (name, label, rows = 3) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <textarea
        style={styles.textarea}
        value={r[name] || ''}
        onChange={(e) => handleNestedChange('resumen', name, e.target.value)}
        rows={rows}
      />
    </div>
  );

  return (
    <div style={styles.grid2}>
      {inputField('doctor', 'Doctor')}
      {inputField('seccion', 'Sección')}
      {inputField('fecha_inicial', 'Fecha inicial', 'date')}
      {inputField('fecha_final', 'Fecha final', 'date')}
      {inputField('tiempo_estimado', 'Tiempo estimado (meses)')}
      {selectField('tipo_brackets', 'Tipo de Brackets', ['Seleccionar', 'Metálicos', 'Cerámicos', 'Autoligado'])}
      {textareaField('diagnostico', 'Diagnóstico resumido', 3)}
      {selectField('anclaje_superior', 'Anclaje superior', ['Seleccionar', 'Fuerte', 'Moderado', 'Ligero'])}
      {selectField('anclaje_inferior', 'Anclaje inferior', ['Seleccionar', 'Fuerte', 'Moderado', 'Ligero'])}
      {textareaField('nota', 'Nota adicional', 3)}
    </div>
  );
}