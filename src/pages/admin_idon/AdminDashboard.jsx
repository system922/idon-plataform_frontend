import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClipboard, FiUsers, FiTool, FiStar, FiServer, FiFileText, FiTrendingUp, FiRefreshCw } from 'react-icons/fi';
import { fetchProtected } from '../../utils/auth';
import '../../styles/AdminPages.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeBusinesses: 0,
    pendingRequests: 0,
    totalModules: 0,
    totalFeatures: 0,
    totalUsers: 0,
    modulesInUse: 0,
  });
  const [, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      const response = await fetchProtected(`/api/admin/stats`);
      if (!response || !response.data) return;

      const data = response.data;
      setStats({
        activeBusinesses: data.activeBusinesses || 0,
        pendingRequests: data.pendingRequests || 0,
        totalModules: data.totalModules || 0,
        monthlyRevenue: data.monthlyRevenue || 0,
        totalUsers: data.totalUsers || 0,
      });
      setRecentActivity([]); // Not provided by backend
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchDashboard();
  };

  const quickActions = [
    {
      label: 'Ver Solicitudes',
      icon: FiClipboard,
      onClick: () => navigate('/admin/requests'),
    },
    {
      label: 'Gestionar Negocios',
      icon: FiUsers,
      onClick: () => navigate('/admin/businesses'),
    },
    {
      label: 'Módulos',
      icon: FiTool,
      onClick: () => navigate('/admin/modules'),
    },
    {
      label: 'Funcionalidades',
      icon: FiStar,
      onClick: () => navigate('/admin/features'),
    },
  ];

  if (loading) {
    return (
      <div className="admin-page-container">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">IDON Plataforma de Gestión Multinegocios</p>
        </div>
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          Cargando datos...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page-container">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">IDON Plataforma de Gestión Multinegocios</p>
        </div>
        <div className="admin-card">
          <div className="admin-card-body">
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ color: '#ef4444', marginBottom: '12px' }}>Error: {error}</p>
              <button className="admin-btn admin-btn-primary" onClick={handleRetry}>
                <FiRefreshCw size={16} /> Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-subtitle">IDON Plataforma de Gestión Multinegocios</p>
      </div>

      {/* Stats Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><FiServer /></div>
          <div className="admin-stat-label">Negocios Activos</div>
          <div className="admin-stat-value">{stats.activeBusinesses}</div>
          <div className="admin-stat-subtitle">Empresas registradas</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><FiClipboard /></div>
          <div className="admin-stat-label">Solicitudes Pendientes</div>
          <div className="admin-stat-value">{stats.pendingRequests}</div>
          <div className="admin-stat-subtitle">En espera de aprobación</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><FiTool /></div>
          <div className="admin-stat-label">Módulos Base</div>
          <div className="admin-stat-value">{stats.totalModules}</div>
          <div className="admin-stat-subtitle">Disponibles en el sistema</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><FiTrendingUp /></div>
          <div className="admin-stat-label">Ingresos Mensuales</div>
          <div className="admin-stat-value">${Math.round(stats.monthlyRevenue)}</div>
          <div className="admin-stat-subtitle">Total suscripciones activas</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon"><FiUsers /></div>
          <div className="admin-stat-label">Usuarios Activos</div>
          <div className="admin-stat-value">{stats.totalUsers}</div>
          <div className="admin-stat-subtitle">En toda la plataforma</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Acciones Rápidas</h2>
        </div>
        <div className="admin-card-body">
          <div className="admin-grid admin-grid-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="admin-btn admin-btn-secondary"
                onClick={action.onClick}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '20px 16px',
                  height: 'auto',
                  borderRadius: '8px',
                  textAlign: 'center',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '32px', display: 'flex', justifyContent: 'center', color: '#ff8c42' }}>
                  <action.icon size={32} />
                </span>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty Recent Activity */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Actividad Reciente</h2>
        </div>
        <div className="admin-card-body">
          <div className="admin-empty">
            <div className="admin-empty-icon"><FiFileText /></div>
            <p className="admin-empty-title">Sin actividad reciente</p>
            <p className="admin-empty-text">El historial de actividad aparecerá aquí</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
