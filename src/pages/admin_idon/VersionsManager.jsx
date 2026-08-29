// src/admin/pages/system/VersionsManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiTag, 
  FiCalendar, FiCheckCircle, FiXCircle, FiPackage 
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { adminApi } from '../../config/api';

export default function VersionsManager() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [versions, setVersions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);
  const [formData, setFormData] = useState({
    module_id: '',
    version: '',
    description: '',
    status: 'active',
    release_date: '',
  });

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/versions');
      setVersions(res.data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar versiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVersions();
    setRefreshing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVersion) {
        await adminApi.put(`/admin/versions/${editingVersion.id}`, formData);
      } else {
        await adminApi.post('/admin/versions', formData);
      }
      setShowModal(false);
      setEditingVersion(null);
      setFormData({ module_id: '', version: '', description: '', status: 'active', release_date: '' });
      fetchVersions();
    } catch (err) {
      setError(err.message || 'Error al guardar versión');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta versión?')) {
      try {
        await adminApi.delete(`/admin/versions/${id}`);
        fetchVersions();
      } catch (err) {
        setError(err.message || 'Error al eliminar versión');
      }
    }
  };

  const handleEdit = (version) => {
    setEditingVersion(version);
    setFormData({
      module_id: version.module_id,
      version: version.version,
      description: version.description,
      status: version.status,
      release_date: version.release_date?.split('T')[0] || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVersion(null);
    setFormData({ module_id: '', version: '', description: '', status: 'active', release_date: '' });
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: '#10b981', label: 'Activa', icon: FiCheckCircle },
      beta: { color: '#f59e0b', label: 'Beta', icon: FiTag },
      deprecated: { color: '#ef4444', label: 'Deprecated', icon: FiXCircle },
    };
    const badge = badges[status] || badges.active;
    const Icon = badge.icon;
    return (
      <span className="version-status-badge" style={{ background: `${badge.color}20`, color: badge.color }}>
        <Icon size={12} /> {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <PageTemplate title="VERSIONES" subtitle="Control de versiones de módulos" loading={true}>
        <div className="admin-loading">Cargando versiones...</div>
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate title="VERSIONES" subtitle="Control de versiones de módulos" error={error}>
        <div className="admin-error-content">
          <p>Error al cargar los datos: {error}</p>
          <button className="admin-retry-btn" onClick={fetchVersions}>
            <FiRefreshCw size={16} /> Reintentar
          </button>
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="VERSIONES"
      subtitle="Control de versiones de módulos"
      theme="admin"
      headerAction={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => { 
              setEditingVersion(null); 
              setFormData({ module_id: '', version: '', description: '', status: 'active', release_date: '' }); 
              setShowModal(true); 
            }} 
            className="admin-action-btn primary"
          >
            <FiPlus size={18} /> Nueva Versión
          </button>
          <button onClick={handleRefresh} className="dashboard-refresh-btn-header" disabled={refreshing}>
            <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
      }
    >
      <div className="versions-container">
        {versions.length === 0 ? (
          <div className="admin-empty-state">
            <FiTag size={48} color="#444" />
            <p>No hay versiones registradas</p>
            <button className="admin-action-btn primary" onClick={() => setShowModal(true)}>
              <FiPlus size={16} /> Crear primera versión
            </button>
          </div>
        ) : (
          <div className="versions-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Módulo</th>
                  <th>Versión</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Fecha Lanzamiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiPackage size={16} color="#888" />
                        <strong>{version.module_name}</strong>
                      </div>
                    </td>
                    <td><span className="version-tag">v{version.version}</span></td>
                    <td>{version.description}</td>
                    <td>{getStatusBadge(version.status)}</td>
                    <td>
                      {version.release_date ? new Date(version.release_date).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <div className="admin-actions-cell">
                        <button className="admin-action-icon" onClick={() => handleEdit(version)} title="Editar">
                          <FiEdit2 size={16} />
                        </button>
                        <button className="admin-action-icon danger" onClick={() => handleDelete(version.id)} title="Eliminar">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={handleCloseModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{editingVersion ? 'Editar Versión' : 'Nueva Versión'}</h3>
              <button className="admin-modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="admin-modal-form">
              <div className="admin-form-group">
                <label>Módulo</label>
                <select
                  value={formData.module_id}
                  onChange={(e) => setFormData({ ...formData, module_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar módulo</option>
                  <option value="1">Facturación Electrónica</option>
                  <option value="2">Contabilidad</option>
                  <option value="3">CRM Clientes</option>
                  <option value="4">Punto de Venta</option>
                  <option value="5">Inventario</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>Versión</label>
                <input
                  type="text"
                  placeholder="Ej: 2.1.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label>Descripción</label>
                <textarea
                  placeholder="Descripción de la versión"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Activa</option>
                    <option value="beta">Beta</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Fecha de Lanzamiento</label>
                  <input
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="admin-btn primary">
                  {editingVersion ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}