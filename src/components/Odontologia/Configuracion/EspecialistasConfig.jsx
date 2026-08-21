// components/Odontologia/Configuracion/EspecialistasConfig.jsx
import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiX, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';

export default function EspecialistasConfig() {
  const [especialistas, setEspecialistas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedEspecialista, setSelectedEspecialista] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    especialidad: '',
    email: '',
    telefono: '',
    is_active: true
  });

  // ============================================================
  // CARGAR ESPECIALISTAS DESDE API
  // ============================================================
  const loadEspecialistas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/odontologia/especialistas');
      if (!res.ok) throw new Error('Error al cargar especialistas');
      const data = await res.json();
      if (data.success) {
        setEspecialistas(data.data || []);
      }
    } catch (err) {
      setError('Error al cargar los especialistas');
      console.error('Error loading especialistas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEspecialistas();
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleOpenModal = (especialista = null) => {
    if (especialista) {
      setSelectedEspecialista(especialista);
      setFormData({
        nombre: especialista.nombre,
        especialidad: especialista.especialidad,
        email: especialista.email || '',
        telefono: especialista.telefono || '',
        is_active: especialista.is_active !== undefined ? especialista.is_active : true,
      });
    } else {
      setSelectedEspecialista(null);
      setFormData({
        nombre: '',
        especialidad: '',
        email: '',
        telefono: '',
        is_active: true,
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEspecialista(null);
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
      const url = selectedEspecialista
        ? `/api/odontologia/especialistas/${selectedEspecialista.id}`
        : '/api/odontologia/especialistas';
      const method = selectedEspecialista ? 'PUT' : 'POST';

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
        await loadEspecialistas();
        handleCloseModal();
      }
    } catch (err) {
      setError(err.message || 'Error al guardar el especialista');
      console.error('Error saving especialista:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este especialista?')) return;

    try {
      const res = await fetchWithAuth(`/api/odontologia/especialistas/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar');
      }

      const data = await res.json();
      if (data.success) {
        await loadEspecialistas();
      }
    } catch (err) {
      alert(err.message || 'Error al eliminar el especialista');
      console.error('Error deleting especialista:', err);
    }
  };

  // ============================================================
  // FILTRAR
  // ============================================================
  const filteredEspecialistas = especialistas.filter(e =>
    e.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.especialidad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="odonto-config-section">
        <div className="odonto-loading">Cargando especialistas...</div>
      </div>
    );
  }

  return (
    <div className="odonto-config-section">
      <div className="odonto-config-header">
        <div>
          <h3>👨‍⚕️ Especialistas / Odontólogos</h3>
          <p>Gestiona los profesionales de la clínica odontológica</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="odonto-btn-secondary" 
            onClick={loadEspecialistas}
            disabled={loading}
          >
            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="odonto-btn-primary" onClick={() => handleOpenModal()}>
            <FiPlus size={16} /> Nuevo Especialista
          </button>
        </div>
      </div>

      {error && (
        <div className="odonto-alert error">
          <span>{error}</span>
        </div>
      )}

      {/* Búsqueda */}
      <div className="odonto-search-wrapper" style={{ marginBottom: 16 }}>
        <FiSearch className="odonto-search-icon" />
        <input
          type="text"
          className="odonto-search-input"
          placeholder="Buscar especialista..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="odonto-search-clear" onClick={() => setSearchTerm('')}>
            <FiX size={16} />
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="odonto-table-container">
        <table className="odonto-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Especialidad</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEspecialistas.length === 0 ? (
              <tr>
                <td colSpan="6" className="odonto-empty-state">
                  {searchTerm ? 'No se encontraron especialistas' : 'No hay especialistas registrados'}
                </td>
              </tr>
            ) : (
              filteredEspecialistas.map(e => (
                <tr key={e.id}>
                  <td><span className="odonto-name">{e.nombre}</span></td>
                  <td>{e.especialidad}</td>
                  <td>{e.email || '—'}</td>
                  <td>{e.telefono || '—'}</td>
                  <td>
                    <span className={`odonto-badge-status ${e.is_active ? 'active' : 'inactive'}`}>
                      {e.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="center">
                    <div className="odonto-actions">
                      <button className="odonto-btn-icon edit" onClick={() => handleOpenModal(e)}>
                        <FiEdit size={14} />
                      </button>
                      <button className="odonto-btn-icon delete" onClick={() => handleDelete(e.id)}>
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
                <h3>{selectedEspecialista ? 'Editar Especialista' : 'Nuevo Especialista'}</h3>
                <p>{selectedEspecialista ? 'Modificar datos del especialista' : 'Agregar un nuevo especialista'}</p>
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
                  <label>Nombre completo *</label>
                  <input
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Dr. Juan Pérez"
                    required
                  />
                </div>

                <div className="odonto-form-group">
                  <label>Especialidad *</label>
                  <input
                    name="especialidad"
                    value={formData.especialidad}
                    onChange={handleChange}
                    placeholder="Ej: Ortodoncia, Endodoncia..."
                    required
                  />
                </div>

                <div className="odonto-form-row">
                  <div className="odonto-form-group">
                    <label>Email</label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@clinica.com"
                    />
                  </div>

                  <div className="odonto-form-group">
                    <label>Teléfono</label>
                    <input
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      placeholder="0999123456"
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
                    {saving ? 'Guardando...' : selectedEspecialista ? 'Actualizar' : 'Guardar'}
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