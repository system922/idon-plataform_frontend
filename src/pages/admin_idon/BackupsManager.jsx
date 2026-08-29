// src/admin/pages/global/BackupsManager.jsx
import React, { useState, useEffect } from 'react';
import {
  FiRefreshCw, FiDownload, FiTrash2, FiCheckCircle,
  FiClock, FiAlertCircle, FiDatabase, FiSettings,
  FiCalendar, FiHardDrive, FiUpload
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { adminApi } from '../../config/api';

export default function BackupsManager() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [backups, setBackups] = useState([]);
  const [settings, setSettings] = useState({
    auto_backup: true,
    frequency: 'daily',
    retention_days: 30,
    time: '02:00',
  });

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const [backupsRes, settingsRes] = await Promise.all([
        adminApi.get('/admin/backups'),
        adminApi.get('/admin/backups/settings'),
      ]);
      setBackups(backupsRes.data || []);
      if (settingsRes.data) {
        setSettings(settingsRes.data);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar respaldos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBackups();
    setRefreshing(false);
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await adminApi.post('/admin/backups/create');
      await fetchBackups();
    } catch (err) {
      setError(err.message || 'Error al crear respaldo');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await adminApi.get(`/admin/backups/${id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${id}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.message || 'Error al descargar respaldo');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este respaldo?')) {
      try {
        await adminApi.delete(`/admin/backups/${id}`);
        fetchBackups();
      } catch (err) {
        setError(err.message || 'Error al eliminar respaldo');
      }
    }
  };

  const handleSaveSettings = async () => {
    try {
      await adminApi.put('/admin/backups/settings', settings);
      alert('Configuración guardada correctamente');
    } catch (err) {
      setError(err.message || 'Error al guardar configuración');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      success: { color: '#10b981', label: 'Completado', icon: FiCheckCircle },
      failed: { color: '#ef4444', label: 'Fallido', icon: FiAlertCircle },
      running: { color: '#f59e0b', label: 'En ejecución', icon: FiClock },
      pending: { color: '#3b82f6', label: 'Pendiente', icon: FiClock },
    };
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    return (
      <span className={`backup-status-badge ${status}`} style={{ background: `${badge.color}20`, color: badge.color }}>
        <Icon size={12} className={status === 'running' ? 'spinning' : ''} /> {badge.label}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };

  if (loading) {
    return (
      <PageTemplate title="RESPALDOS" subtitle="Gestión de backups automáticos" loading={true}>
        <div className="admin-loading">Cargando respaldos...</div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="RESPALDOS"
      subtitle="Gestión de backups automáticos"
      theme="admin"
      headerAction={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleCreateBackup} 
            className="backup-action-btn primary"
            disabled={creating}
          >
            <FiRefreshCw size={18} className={creating ? 'spinning' : ''} />
            {creating ? 'Creando...' : 'Crear Backup'}
          </button>
          <button onClick={handleRefresh} className="dashboard-refresh-btn-header" disabled={refreshing}>
            <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
      }
    >
      <div className="backups-container">
        {/* Lista de backups */}
        {backups.length === 0 ? (
          <div className="backups-empty-state">
            <FiDatabase size={48} color="#444" />
            <p>No hay respaldos disponibles</p>
            <button className="backup-action-btn primary" onClick={handleCreateBackup}>
              <FiRefreshCw size={16} /> Crear primer backup
            </button>
          </div>
        ) : (
          <div className="backups-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Respaldo</th>
                  <th>Tamaño</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiDatabase size={16} color="#888" />
                        <span>{backup.filename || `Backup #${backup.id}`}</span>
                      </div>
                    </td>
                    <td className="backup-size">{formatFileSize(backup.size)}</td>
                    <td className="backup-date">
                      {new Date(backup.created_at).toLocaleString()}
                    </td>
                    <td>{getStatusBadge(backup.status)}</td>
                    <td>
                      <div className="admin-actions-cell">
                        {backup.status === 'success' && (
                          <button 
                            className="backup-action-icon download"
                            onClick={() => handleDownload(backup.id)}
                            title="Descargar"
                          >
                            <FiDownload size={16} />
                          </button>
                        )}
                        <button 
                          className="backup-action-icon danger"
                          onClick={() => handleDelete(backup.id)}
                          title="Eliminar"
                        >
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

        {/* Configuración de backups automáticos */}
        <div className="backup-settings">
          <h3>
            <FiSettings size={18} style={{ marginRight: '8px' }} />
            Configuración de respaldos automáticos
          </h3>
          <div className="backup-settings-grid">
            <div className="backup-setting-item">
              <label>Frecuencia</label>
              <select
                value={settings.frequency}
                onChange={(e) => setSettings({ ...settings, frequency: e.target.value })}
              >
                <option value="hourly">Cada hora</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
            <div className="backup-setting-item">
              <label>Horario</label>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => setSettings({ ...settings, time: e.target.value })}
              />
            </div>
            <div className="backup-setting-item">
              <label>Días de retención</label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.retention_days}
                onChange={(e) => setSettings({ ...settings, retention_days: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <div className="backup-toggle">
            <div className="toggle-label">Backups automáticos</div>
            <div 
              className={`toggle-switch ${settings.auto_backup ? 'active' : ''}`}
              onClick={() => setSettings({ ...settings, auto_backup: !settings.auto_backup })}
            >
              <div className="toggle-slider" />
            </div>
            <button className="backup-action-btn primary" onClick={handleSaveSettings}>
              Guardar configuración
            </button>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}