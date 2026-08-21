// components/Odontologia/Configuracion/MotivosConsultaConfig.jsx
import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiX, FiRefreshCw } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#14b8a6', '#f97316'];

export default function MotivosConsultaConfig() {
  const [motivos, setMotivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMotivo, setSelectedMotivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    duracion: 30,
    color: '#10b981',
    is_active: true
  });

  // ============================================================
  // CARGAR MOTIVOS DESDE API
  // ============================================================
  const loadMotivos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/odontologia/motivos-consulta');
      if (!res.ok) throw new Error('Error al cargar motivos');
      const data = await res.json();
      if (data.success) {
        setMotivos(data.data || []);
      }
    } catch (err) {
      setError('Error al cargar los motivos');
      console.error('Error loading motivos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMotivos();
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleOpenModal = (motivo = null) => {
    if (motivo) {
      setSelectedMotivo(motivo);
      setFormData({
        nombre: motivo.nombre,
        duracion: motivo.duracion || 30,
        color: motivo.color || '#10b981',
        is_active: motivo.is_active !== undefined ? motivo.is_active : true,
      });
    } else {
      setSelectedMotivo(null);
      setFormData({
        nombre: '',
        duracion: 30,
        color: '#10b981',
        is_active: true,
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedMotivo(null);
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
      const url = selectedMotivo
        ? `/api/odontologia/motivos-consulta/${selectedMotivo.id}`
        : '/api/odontologia/motivos-consulta';
      const method = selectedMotivo ? 'PUT' : 'POST';

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
        await loadMotivos();
        handleCloseModal();
      }
    } catch (err) {
      setError(err.message || 'Error al guardar el motivo');
      console.error('Error saving motivo:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este motivo?')) return;

    try {
      const res = await fetchWithAuth(`/api/odontologia/motivos-consulta/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar');
      }

      const data = await res.json();
      if (data.success) {
        await loadMotivos();
      }
    } catch (err) {
      alert(err.message || 'Error al eliminar el motivo');
      console.error('Error deleting motivo:', err);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="odonto-config-section">
        <div className="odonto-loading">Cargando motivos...</div>
      </div>
    );
  }

  return (
    <div className="odonto-config-section">
      <div className="odonto-config-header">
        <div>
          <h3>📋 Motivos de Consulta</h3>
          <p>Define los motivos de consulta para las citas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="odonto-btn-secondary" 
            onClick={loadMotivos}
            disabled={loading}
          >
            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="odonto-btn-primary" onClick={() => handleOpenModal()}>
            <FiPlus size={16} /> Nuevo Motivo
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
              <th>Color</th>
              <th>Nombre</th>
              <th>Duración (min)</th>
              <th>Estado</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {motivos.length === 0 ? (
              <tr>
                <td colSpan="5" className="odonto-empty-state">
                  No hay motivos registrados. Crea un nuevo motivo.
                </td>
              </tr>
            ) : (
              motivos.map(m => (
                <tr key={m.id}>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: m.color || '#10b981',
                      border: '2px solid #e2e8f0'
                    }} />
                  </td>
                  <td><span className="odonto-name">{m.nombre}</span></td>
                  <td>{m.duracion} min</td>
                  <td>
                    <span className={`odonto-badge-status ${m.is_active ? 'active' : 'inactive'}`}>
                      {m.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="center">
                    <div className="odonto-actions">
                      <button className="odonto-btn-icon edit" onClick={() => handleOpenModal(m)}>
                        <FiEdit size={14} />
                      </button>
                      <button className="odonto-btn-icon delete" onClick={() => handleDelete(m.id)}>
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
                <h3>{selectedMotivo ? 'Editar Motivo' : 'Nuevo Motivo'}</h3>
                <p>{selectedMotivo ? 'Modificar motivo existente' : 'Crear un nuevo motivo de consulta'}</p>
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
                  <label>Nombre *</label>
                  <input
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Consulta General"
                    required
                  />
                </div>

                <div className="odonto-form-group">
                  <label>Duración (minutos) *</label>
                  <input
                    name="duracion"
                    type="number"
                    value={formData.duracion}
                    onChange={handleChange}
                    min={5}
                    max={120}
                    step={5}
                    required
                  />
                  <small className="odonto-form-help">Entre 5 y 120 minutos</small>
                </div>

                <div className="odonto-form-group">
                  <label>Color</label>
                  <div className="odonto-color-picker">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`odonto-color-option ${formData.color === c ? 'selected' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setFormData({ ...formData, color: c })}
                      />
                    ))}
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
                    {saving ? 'Guardando...' : selectedMotivo ? 'Actualizar' : 'Guardar'}
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