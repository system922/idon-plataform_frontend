// src/admin/pages/system/UpdatesManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiRefreshCw, FiDownload, FiCheckCircle, FiClock, 
  FiAlertCircle, FiPackage, FiCalendar, FiInfo,
  FiArrowUp, FiArrowDown
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { adminApi } from '../../config/api';

export default function UpdatesManager() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/updates');
      setUpdates(res.data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar actualizaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUpdates();
    setRefreshing(false);
  };

  const handleApplyUpdate = async (id) => {
    if (window.confirm('¿Aplicar esta actualización?')) {
      try {
        await adminApi.post(`/admin/updates/${id}/apply`);
        fetchUpdates();
      } catch (err) {
        setError(err.message || 'Error al aplicar actualización');
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      available: { color: '#3b82f6', label: 'Disponible', icon: FiDownload },
      in_progress: { color: '#f59e0b', label: 'En progreso', icon: FiClock },
      completed: { color: '#10b981', label: 'Completada', icon: FiCheckCircle },
      failed: { color: '#ef4444', label: 'Fallida', icon: FiAlertCircle },
    };
    const badge = badges[status] || badges.available;
    const Icon = badge.icon;
    return (
      <span className="update-status-badge" style={{ background: `${badge.color}20`, color: badge.color }}>
        <Icon size={12} /> {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorities = {
      critical: { color: '#ef4444', label: 'Crítica' },
      high: { color: '#f59e0b', label: 'Alta' },
      medium: { color: '#3b82f6', label: 'Media' },
      low: { color: '#10b981', label: 'Baja' },
    };
    const p = priorities[priority] || priorities.medium;
    return (
      <span className="update-priority-badge" style={{ background: `${p.color}20`, color: p.color }}>
        {p.label}
      </span>
    );
  };

  if (loading) {
    return (
      <PageTemplate title="ACTUALIZACIONES" subtitle="Gestión de actualizaciones del sistema" loading={true}>
        <div className="admin-loading">Cargando actualizaciones...</div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="ACTUALIZACIONES"
      subtitle="Gestión de actualizaciones del sistema"
      theme="admin"
      headerAction={
        <button onClick={handleRefresh} className="dashboard-refresh-btn-header" disabled={refreshing}>
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Buscando...' : 'Buscar actualizaciones'}</span>
        </button>
      }
    >
      <div className="updates-container">
        {/* Resumen de actualizaciones */}
        <div className="updates-summary">
          <div className="update-summary-card">
            <div className="update-summary-icon" style={{ background: '#3b82f620', color: '#3b82f6' }}>
              <FiDownload size={24} />
            </div>
            <div>
              <div className="update-summary-value">
                {updates.filter(u => u.status === 'available').length}
              </div>
              <div className="update-summary-label">Actualizaciones disponibles</div>
            </div>
          </div>
          <div className="update-summary-card">
            <div className="update-summary-icon" style={{ background: '#10b98120', color: '#10b981' }}>
              <FiCheckCircle size={24} />
            </div>
            <div>
              <div className="update-summary-value">
                {updates.filter(u => u.status === 'completed').length}
              </div>
              <div className="update-summary-label">Completadas</div>
            </div>
          </div>
          <div className="update-summary-card">
            <div className="update-summary-icon" style={{ background: '#ef444420', color: '#ef4444' }}>
              <FiAlertCircle size={24} />
            </div>
            <div>
              <div className="update-summary-value">
                {updates.filter(u => u.status === 'failed').length}
              </div>
              <div className="update-summary-label">Fallidas</div>
            </div>
          </div>
        </div>

        {/* Lista de actualizaciones */}
        <div className="updates-list">
          {updates.length === 0 ? (
            <div className="updates-empty-state">
              <FiCheckCircle size={48} color="#444" />
              <p>El sistema está actualizado</p>
              <span>No hay actualizaciones pendientes</span>
            </div>
          ) : (
            updates.map((update) => (
              <div key={update.id} className="update-card">
                <div className="update-card-header">
                  <div className="update-card-info">
                    <div className="update-card-title">
                      <FiPackage size={18} color="#888" />
                      <h3>{update.title}</h3>
                    </div>
                    <div className="update-card-meta">
                      {getStatusBadge(update.status)}
                      {getPriorityBadge(update.priority)}
                      <span className="update-version">v{update.version}</span>
                    </div>
                  </div>
                  <div className="update-card-actions">
                    {update.status === 'available' && (
                      <button 
                        className="update-apply-btn"
                        onClick={() => handleApplyUpdate(update.id)}
                      >
                        <FiDownload size={16} /> Aplicar
                      </button>
                    )}
                    {update.status === 'in_progress' && (
                      <span className="update-in-progress">
                        <FiClock size={16} className="spinning" /> Aplicando...
                      </span>
                    )}
                  </div>
                </div>
                <p className="update-card-description">{update.description}</p>
                <div className="update-card-footer">
                  <span className="update-card-date">
                    <FiCalendar size={14} /> {new Date(update.created_at).toLocaleDateString()}
                  </span>
                  <span className="update-card-module">
                    Módulo: {update.module_name}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PageTemplate>
  );
}