// components/Odontologia/Configuracion/HorariosConfig.jsx
import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiX, FiRefreshCw } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/api';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function HorariosConfig() {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedHorario, setSelectedHorario] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    dia: '',
    hora_inicio: '08:00',
    hora_fin: '17:00',
    is_active: true
  });

  // ============================================================
  // CARGAR HORARIOS DESDE API
  // ============================================================
  const loadHorarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/odontologia/horarios-trabajo');
      if (!res.ok) throw new Error('Error al cargar horarios');
      const data = await res.json();
      if (data.success) {
        setHorarios(data.data || []);
      }
    } catch (err) {
      setError('Error al cargar los horarios');
      console.error('Error loading horarios:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INICIALIZAR HORARIOS POR DEFECTO
  // ============================================================
  const initHorarios = async () => {
    if (!window.confirm('¿Inicializar horarios por defecto? Esto creará horarios para todos los días de la semana.')) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/odontologia/horarios-trabajo/init');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al inicializar');
      }
      const data = await res.json();
      if (data.success) {
        setHorarios(data.data || []);
        alert('Horarios inicializados correctamente');
      }
    } catch (err) {
      setError(err.message || 'Error al inicializar horarios');
      console.error('Error init horarios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHorarios();
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleOpenModal = (horario = null) => {
    if (horario) {
      setSelectedHorario(horario);
      setFormData({
        dia: horario.dia,
        hora_inicio: horario.hora_inicio || '08:00',
        hora_fin: horario.hora_fin || '17:00',
        is_active: horario.is_active !== undefined ? horario.is_active : true,
      });
    } else {
      setSelectedHorario(null);
      setFormData({
        dia: '',
        hora_inicio: '08:00',
        hora_fin: '17:00',
        is_active: true,
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedHorario(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = selectedHorario
        ? `/odontologia/horarios-trabajo/${selectedHorario.id}`
        : '/odontologia/horarios-trabajo';
      const method = selectedHorario ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }

      const data = await res.json();
      if (data.success) {
        await loadHorarios();
        handleCloseModal();
      }
    } catch (err) {
      setError(err.message || 'Error al guardar el horario');
      console.error('Error saving horario:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este horario?')) return;

    try {
      const res = await fetchWithAuth(`/odontologia/horarios-trabajo/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar');
      }

      const data = await res.json();
      if (data.success) {
        await loadHorarios();
      }
    } catch (err) {
      alert(err.message || 'Error al eliminar el horario');
      console.error('Error deleting horario:', err);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="odonto-config-section">
        <div className="odonto-loading">Cargando horarios...</div>
      </div>
    );
  }

  return (
    <div className="odonto-config-section">
      <div className="odonto-config-header">
        <div>
          <h3>Horarios de Trabajo</h3>
          <p>Configura los horarios de atención por día de la semana</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="odonto-btn-secondary" 
            onClick={loadHorarios}
            disabled={loading}
          >
            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="odonto-btn-secondary" onClick={initHorarios}>
            Inicializar
          </button>
          <button className="odonto-btn-primary" onClick={() => handleOpenModal()}>
            <FiPlus size={16} /> Nuevo Horario
          </button>
        </div>
      </div>

      {error && (
        <div className="odonto-alert error">
          <span>{error}</span>
        </div>
      )}

      <div className="odonto-table-container">
        <table className="odonto-table">
          <thead>
            <tr>
              <th>Día</th>
              <th>Hora de Inicio</th>
              <th>Hora de Fin</th>
              <th>Estado</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {horarios.length === 0 ? (
              <tr>
                <td colSpan="5" className="odonto-empty-state">
                  No hay horarios configurados. Haz clic en "Inicializar" para crear los horarios por defecto.
                </td>
              </tr>
            ) : (
              horarios.map(h => (
                <tr key={h.id}>
                  <td><span className="odonto-name">{h.dia}</span></td>
                  <td>{h.hora_inicio}</td>
                  <td>{h.hora_fin}</td>
                  <td>
                    <span className={`odonto-badge-status ${h.is_active ? 'active' : 'inactive'}`}>
                      {h.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="center">
                    <div className="odonto-actions">
                      <button className="odonto-btn-icon edit" onClick={() => handleOpenModal(h)}>
                        <FiEdit size={14} />
                      </button>
                      <button className="odonto-btn-icon delete" onClick={() => handleDelete(h.id)}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="odonto-modal-overlay" onClick={handleCloseModal}>
          <div className="odonto-modal" onClick={e => e.stopPropagation()}>
            <div className="odonto-modal-header blue">
              <div>
                <h3>{selectedHorario ? 'Editar Horario' : 'Nuevo Horario'}</h3>
                <p>{selectedHorario ? 'Modificar horario existente' : 'Agregar un nuevo horario'}</p>
              </div>
              <button className="odonto-modal-close" onClick={handleCloseModal}>
                <FiX size={24} />
              </button>
            </div>

            <div className="odonto-modal-body">
              {error && (
                <div className="odonto-alert error" style={{ marginBottom: 16 }}>
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSave}>
                <div className="odonto-form-group">
                  <label>Día *</label>
                  <select
                    name="dia"
                    value={formData.dia}
                    onChange={handleChange}
                    required
                    disabled={!!selectedHorario}
                  >
                    <option value="">Seleccionar día</option>
                    {DIAS_SEMANA.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {selectedHorario && (
                    <small className="odonto-form-help">El día no se puede modificar</small>
                  )}
                </div>

                <div className="odonto-form-row">
                  <div className="odonto-form-group">
                    <label>Hora de Inicio *</label>
                    <input
                      name="hora_inicio"
                      type="time"
                      value={formData.hora_inicio}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="odonto-form-group">
                    <label>Hora de Fin *</label>
                    <input
                      name="hora_fin"
                      type="time"
                      value={formData.hora_fin}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="odonto-checkbox-group">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    id="activo"
                  />
                  <label htmlFor="activo">Activo</label>
                </div>

                <div className="odonto-modal-footer">
                  <button type="button" className="odonto-btn-secondary" onClick={handleCloseModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="odonto-btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : selectedHorario ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}