// components/Odontologia/Configuracion/GruposConfig.jsx
import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiX, FiRefreshCw } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/api';

export default function GruposConfig() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    is_active: true
  });

  // ============================================================
  // CARGAR GRUPOS DESDE API
  // ============================================================
  const loadGrupos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/odontologia/grupos-agendas');
      if (!res.ok) throw new Error('Error al cargar grupos');
      const data = await res.json();
      if (data.success) {
        setGrupos(data.data || []);
      }
    } catch (err) {
      setError('Error al cargar los grupos');
      console.error('Error loading grupos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrupos();
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleOpenModal = (grupo = null) => {
    if (grupo) {
      setSelectedGrupo(grupo);
      setFormData({
        nombre: grupo.nombre,
        descripcion: grupo.descripcion || '',
        is_active: grupo.is_active !== undefined ? grupo.is_active : true,
      });
    } else {
      setSelectedGrupo(null);
      setFormData({
        nombre: '',
        descripcion: '',
        is_active: true,
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedGrupo(null);
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
      const url = selectedGrupo
        ? `/odontologia/grupos-agendas/${selectedGrupo.id}`
        : '/odontologia/grupos-agendas';
      const method = selectedGrupo ? 'PUT' : 'POST';

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
        await loadGrupos();
        handleCloseModal();
      }
    } catch (err) {
      setError(err.message || 'Error al guardar el grupo');
      console.error('Error saving grupo:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este grupo?')) return;

    try {
      const res = await fetchWithAuth(`/odontologia/grupos-agendas/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar');
      }

      const data = await res.json();
      if (data.success) {
        await loadGrupos();
      }
    } catch (err) {
      alert(err.message || 'Error al eliminar el grupo');
      console.error('Error deleting grupo:', err);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="odonto-config-section">
        <div className="odonto-loading">Cargando grupos...</div>
      </div>
    );
  }

  return (
    <div className="odonto-config-section">
      <div className="odonto-config-header">
        <div>
          <h3>Grupos de Agendas</h3>
          <p>Organiza las agendas en grupos para mejor gestión</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="odonto-btn-secondary" 
            onClick={loadGrupos}
            disabled={loading}
          >
            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="odonto-btn-primary" onClick={() => handleOpenModal()}>
            <FiPlus size={16} /> Nuevo Grupo
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
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Agendas</th>
              <th>Estado</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 ? (
              <tr>
                <td colSpan="5" className="odonto-empty-state">
                  No hay grupos registrados. Crea un nuevo grupo.
                </td>
              </tr>
            ) : (
              grupos.map(g => (
                <tr key={g.id}>
                  <td><span className="odonto-name">{g.nombre}</span></td>
                  <td>{g.descripcion || '—'}</td>
                  <td>{g.total_agendas || 0}</td>
                  <td>
                    <span className={`odonto-badge-status ${g.is_active ? 'active' : 'inactive'}`}>
                      {g.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="center">
                    <div className="odonto-actions">
                      <button className="odonto-btn-icon edit" onClick={() => handleOpenModal(g)}>
                        <FiEdit size={14} />
                      </button>
                      <button className="odonto-btn-icon delete" onClick={() => handleDelete(g.id)}>
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
                <h3>{selectedGrupo ? 'Editar Grupo' : 'Nuevo Grupo'}</h3>
                <p>{selectedGrupo ? 'Modificar grupo existente' : 'Crear un nuevo grupo de agendas'}</p>
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
                    placeholder="Ej: Grupo Odontología General"
                    required
                  />
                </div>

                <div className="odonto-form-group">
                  <label>Descripción</label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    placeholder="Descripción del grupo..."
                    rows={2}
                  />
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
                    {saving ? 'Guardando...' : selectedGrupo ? 'Actualizar' : 'Guardar'}
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