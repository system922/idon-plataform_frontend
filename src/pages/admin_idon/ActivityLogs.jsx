// src/admin/pages/users/ActivityLogs.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  FiSearch, FiRefreshCw, FiCalendar, FiUser,
  FiEye, FiEdit2, FiTrash2, FiPlus, FiLogIn, FiLogOut,
  FiDownload, FiFilter
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { adminApi } from '../../config/api';

export default function ActivityLogs() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/activity-logs');
      setLogs(res.data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar logs de actividad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const getActionBadge = (action) => {
    const actions = {
      create: { color: '#10b981', label: 'Creación', icon: FiPlus },
      update: { color: '#3b82f6', label: 'Actualización', icon: FiEdit2 },
      delete: { color: '#ef4444', label: 'Eliminación', icon: FiTrash2 },
      login: { color: '#8b5cf6', label: 'Login', icon: FiLogIn },
      logout: { color: '#f59e0b', label: 'Logout', icon: FiLogOut },
      view: { color: '#06b6d4', label: 'Visualización', icon: FiEye },
      export: { color: '#ec4899', label: 'Exportación', icon: FiDownload },
    };
    const act = actions[action] || actions.view;
    const Icon = act.icon;
    return (
      <span className={`log-action-badge ${action}`} style={{ background: `${act.color}20`, color: act.color }}>
        <Icon size={12} /> {act.label}
      </span>
    );
  };

  const getUsers = useMemo(() => {
    const users = {};
    logs.forEach(log => {
      if (log.user_name && !users[log.user_id]) {
        users[log.user_id] = log.user_name;
      }
    });
    return Object.entries(users).map(([id, name]) => ({ id, name }));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let filtered = logs;
    
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }
    
    if (filterUser !== 'all') {
      filtered = filtered.filter(log => log.user_id === parseInt(filterUser));
    }
    
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [logs, filterAction, filterUser, searchTerm]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <PageTemplate title="LOGS DE ACTIVIDAD" subtitle="Trazabilidad de acciones de usuarios" loading={true}>
        <div className="admin-loading">Cargando logs...</div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="LOGS DE ACTIVIDAD"
      subtitle="Trazabilidad de acciones de usuarios"
      theme="admin"
      headerAction={
        <button onClick={handleRefresh} className="dashboard-refresh-btn-header" disabled={refreshing}>
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      }
    >
      <div className="activity-logs-container">
        {/* Filtros */}
        <div className="activity-logs-filters">
          <div className="filter-search">
            <input
              type="text"
              placeholder="Buscar usuario o acción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="all">Todas las acciones</option>
            <option value="create">Creación</option>
            <option value="update">Actualización</option>
            <option value="delete">Eliminación</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="view">Visualización</option>
            <option value="export">Exportación</option>
          </select>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="all">Todos los usuarios</option>
            {getUsers.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>

        {/* Tabla */}
        {filteredLogs.length === 0 ? (
          <div className="logs-empty-state">
            <FiEye size={48} color="#444" />
            <p>No hay logs registrados</p>
          </div>
        ) : (
          <>
            <div className="activity-logs-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Detalles</th>
                    <th>IP</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="log-user-info">
                          <div className="log-user-avatar">
                            {getInitials(log.user_name)}
                          </div>
                          <div>
                            <div className="log-user-name">{log.user_name || 'Usuario'}</div>
                            <div className="log-user-email">{log.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{getActionBadge(log.action)}</td>
                      <td>
                        <div className="log-details" title={log.details}>
                          {log.details || '-'}
                        </div>
                      </td>
                      <td>
                        <span className="log-ip">{log.ip_address || '-'}</span>
                      </td>
                      <td>
                        <span className="log-date">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="activity-logs-pagination">
                <div className="pagination-info">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} de {filteredLogs.length} registros
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageTemplate>
  );
}