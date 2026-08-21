// components/Odontologia/Tratamientos/TratamientoModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX, FiClock, FiDollarSign } from 'react-icons/fi';

export default function TratamientoModal({ 
  isOpen, 
  onClose, 
  tratamiento, 
  onSave, 
  loading 
}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    price: 0,
    is_active: true
  });

  useEffect(() => {
    if (isOpen) {
      if (tratamiento) {
        setForm({
          name: tratamiento.name || '',
          description: tratamiento.description || '',
          duration_minutes: tratamiento.duration_minutes || 30,
          price: tratamiento.price || 0,
          is_active: tratamiento.is_active !== undefined ? tratamiento.is_active : true
        });
      } else {
        setForm({
          name: '',
          description: '',
          duration_minutes: 30,
          price: 0,
          is_active: true
        });
      }
    }
  }, [isOpen, tratamiento]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    let processedValue = value;
    
    if (type === 'number') {
      if (value === '' || value === '-') {
        processedValue = 0;
      } else {
        const num = parseFloat(value);
        processedValue = isNaN(num) ? 0 : num;
      }
    }
    
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : processedValue
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="odonto-modal-overlay" onClick={onClose}>
      <div className="odonto-modal" onClick={e => e.stopPropagation()}>
        <div className="odonto-modal-header primary">
          <div>
            <h3>{tratamiento ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}</h3>
            <p>{tratamiento ? 'Modificar información del tratamiento' : 'Registrar un nuevo tratamiento'}</p>
          </div>
          <button className="odonto-modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className="odonto-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="odonto-form-group">
              <label>Nombre del Tratamiento *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ej: Limpieza dental"
                required
              />
            </div>

            <div className="odonto-form-group">
              <label>Descripción</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Descripción detallada del tratamiento..."
                rows={3}
              />
            </div>

            <div className="odonto-form-row">
              <div className="odonto-form-group">
                <label>
                  <FiClock size={14} style={{ marginRight: '4px' }} />
                  Duración (minutos)
                </label>
                <input
                  name="duration_minutes"
                  type="number"
                  step="any"
                  value={form.duration_minutes}
                  onChange={handleChange}
                  min={1}
                  placeholder="30"
                />
              </div>

              <div className="odonto-form-group">
                <label>
                  <FiDollarSign size={14} style={{ marginRight: '4px' }} />
                  Precio
                </label>
                <input
                  name="price"
                  type="number"
                  step="any"
                  value={form.price}
                  onChange={handleChange}
                  min={0}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="odonto-form-group">
              <div className="odonto-checkbox-group">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleChange}
                  id="is_active"
                />
                <label htmlFor="is_active">Activo</label>
                <small className="odonto-form-help">Los tratamientos inactivos no aparecerán en el catálogo</small>
              </div>
            </div>

            <div className="odonto-modal-footer">
              <button type="button" className="odonto-btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="odonto-btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : tratamiento ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}