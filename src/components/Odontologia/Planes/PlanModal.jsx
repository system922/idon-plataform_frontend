// components/Odontologia/Planes/PlanModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiDollarSign, FiUser } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';

export default function PlanModal({ 
  isOpen, 
  onClose, 
  plan, 
  onSave, 
  loading 
}) {
  const [form, setForm] = useState({
    patient_id: '',
    name: '',
    description: '',
    fase: 'inicial',
    total_cost: 0,
    status: 'draft',
    items: [],
    odontograma_data: {}
  });

  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);

  // Cargar pacientes para el select
  useEffect(() => {
    const loadPacientes = async () => {
      if (!isOpen) return;
      setLoadingPacientes(true);
      try {
        const res = await fetchWithAuth('/api/odontologia/pacientes');
        const data = await res.json();
        if (data.success && data.data) {
          setPacientes(data.data);
        }
      } catch (error) {
        console.error('Error al cargar pacientes:', error);
      } finally {
        setLoadingPacientes(false);
      }
    };
    loadPacientes();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (plan) {
        setForm({
          patient_id: plan.patient_id || '',
          name: plan.name || '',
          description: plan.description || '',
          fase: plan.fase || 'inicial',
          total_cost: plan.total_cost || 0,
          status: plan.status || 'draft',
          items: plan.items || [],
          odontograma_data: plan.odontograma_data || {}
        });
      } else {
        setForm({
          patient_id: '',
          name: '',
          description: '',
          fase: 'inicial',
          total_cost: 0,
          status: 'draft',
          items: [],
          odontograma_data: {}
        });
      }
    }
  }, [isOpen, plan]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm({ 
      ...form, 
      [name]: type === 'number' ? parseFloat(value) || 0 : value 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.patient_id) {
      alert('Selecciona un paciente');
      return;
    }
    if (!form.name.trim()) {
      alert('El nombre del plan es obligatorio');
      return;
    }

    const result = await onSave(form);
    if (result?.success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="odonto-modal-overlay" onClick={onClose}>
      <div className="odonto-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="odonto-modal-header blue">
          <div>
            <h3>{plan ? 'Editar Plan' : 'Nuevo Plan'}</h3>
            <p>{plan ? 'Modificar plan de tratamiento' : 'Crear un nuevo plan de tratamiento'}</p>
          </div>
          <button className="odonto-modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className="odonto-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="odonto-form-group">
              <label>Paciente *</label>
              <select
                name="patient_id"
                value={form.patient_id}
                onChange={handleChange}
                required
                disabled={loadingPacientes}
              >
                <option value="">Seleccionar paciente</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} - {p.document_number || ''}
                  </option>
                ))}
              </select>
              {loadingPacientes && (
                <small className="odonto-form-help">Cargando pacientes...</small>
              )}
            </div>

            <div className="odonto-form-group">
              <label>Nombre del Plan *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ej: Plan de Ortodoncia"
                required
              />
            </div>

            <div className="odonto-form-group">
              <label>Descripción</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Descripción detallada del plan..."
                rows={2}
              />
            </div>

            <div className="odonto-form-row">
              <div className="odonto-form-group">
                <label>Fase</label>
                <select
                  name="fase"
                  value={form.fase}
                  onChange={handleChange}
                >
                  <option value="inicial">Inicial</option>
                  <option value="evolucion">Evolución</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              <div className="odonto-form-group">
                <label>Estado</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="draft">Borrador</option>
                  <option value="active">Activo</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>

            <div className="odonto-form-group">
              <label>
                <FiDollarSign size={14} style={{ marginRight: 4 }} />
                Costo Total
              </label>
              <input
                name="total_cost"
                type="number"
                step="0.01"
                value={form.total_cost}
                onChange={handleChange}
                min={0}
                placeholder="0.00"
              />
            </div>

            <div className="odonto-modal-footer">
              <button type="button" className="odonto-btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="odonto-btn-primary" disabled={loading}>
                <FiSave size={16} /> {loading ? 'Guardando...' : plan ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}