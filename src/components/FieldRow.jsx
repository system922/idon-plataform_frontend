import React, { useState } from 'react';
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';

/**
 * Componente FieldRow para mostrar/editar un campo
 * 
 * @param {Object} props
 * @param {string} props.label - Etiqueta del campo
 * @param {React.ReactNode} props.icon - Icono (opcional)
 * @param {any} props.value - Valor actual
 * @param {string} props.type - Tipo de input: 'text', 'number', 'email', 'tel'
 * @param {Function} props.onSave - Función a ejecutar al guardar
 * @param {boolean} props.editable - Si el campo es editable
 * @param {string} props.placeholder - Placeholder del input
 * @param {string} props.unit - Unidad (ej: '$', '%', 'kg')
 */
const FieldRow = ({ 
  label, 
  icon, 
  value, 
  type = 'text', 
  onSave, 
  editable = true,
  placeholder = '',
  unit = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const formatDisplayValue = () => {
    if (value === undefined || value === null || value === '') return '—';
    if (unit === '$') return `$${Number(value).toFixed(2)}`;
    if (unit === '%') return `${value}%`;
    return value;
  };

  return (
    <div className="field-row">
      <div className="field-label">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>
      
      <div className="field-value">
        {isEditing ? (
          <input
            type={type}
            className="field-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />
        ) : (
          <span>{formatDisplayValue()}</span>
        )}
      </div>
      
      <div className="field-actions">
        {editable && (
          isEditing ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-icon-sm" onClick={handleSave} title="Guardar">
                <FiSave size={16} />
              </button>
              <button className="btn-icon-sm" onClick={handleCancel} title="Cancelar">
                <FiX size={16} />
              </button>
            </div>
          ) : (
            <button className="btn-icon-sm" onClick={() => setIsEditing(true)} title="Editar">
              <FiEdit2 size={16} />
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default FieldRow;