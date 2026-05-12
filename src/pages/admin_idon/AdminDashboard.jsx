import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from '../../components/PageTemplate';
import {
  FiClipboard, FiUsers, FiTool, FiStar, FiServer, FiTrendingUp,
  FiRefreshCw, FiFileText, FiDollarSign, FiCheckCircle, FiClock,
  FiGrid, FiBarChart2
} from 'react-icons/fi';
import { adminApiService } from '../../services/apiService';
import '../../styles/AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeBusinesses: 0,
    pendingRequests: 0,
    totalModules: 0,
    totalFeatures: 0,
    totalUsers: 0,
    monthlyRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await adminApiService.get('/admin/stats');
      if (!response || !response.data) return;

      const data = response.data;
      setStats({
        activeBusinesses: data.activeBusinesses || 0,
        pendingRequests: data.pendingRequests || 0,
        totalModules: data.totalModules || 0,
        totalFeatures: data.totalFeatures || 0,
        monthlyRevenue: data.monthlyRevenue || 0,
        totalUsers: data.totalUsers || 0,
      });
      setRecentActivity(data.recentActivity || []);
      setLoading(false);
    } catch (err) {

      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

  const quickActions = [
    { label: 'Ver Solicitudes', icon: FiClipboard, onClick: () => navigate('/admin/requests'), color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Gestionar Negocios', icon: FiUsers, onClick: () => navigate('/admin/businesses'), color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Módulos', icon: FiTool, onClick: () => navigate('/admin/modules'), color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    { label: 'Funcionalidades', icon: FiStar, onClick: () => navigate('/admin/features'), color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  ];

  const statsCards = [
    { label: 'Negocios Activos', value: stats.activeBusinesses, icon: <FiServer size={24} />, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Solicitudes Pendientes', value: stats.pendingRequests, icon: <FiClock size={24} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Módulos Base', value: stats.totalModules, icon: <FiGrid size={24} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    { label: 'Ingresos Mensuales', value: formatCurrency(stats.monthlyRevenue), icon: <FiDollarSign size={24} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    { label: 'Usuarios Activos', value: stats.totalUsers, icon: <FiUsers size={24} />, color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
    { label: 'Funcionalidades', value: stats.totalFeatures, icon: <FiBarChart2 size={24} />, color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  ];

  const refreshButton = (
    <button onClick={handleRefresh} className="admin-refresh-btn" disabled={refreshing}>
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  if (loading) {
    return (
      <PageTemplate title="PANEL DE CONTROL" subtitle="IDON Plataforma de Gestión Multinegocios" loading={true}>
        <div className="admin-loading">Cargando datos...</div>
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate title="PANEL DE CONTROL" subtitle="IDON Plataforma de Gestión Multinegocios" error={error} onRetry={fetchDashboard}>
        <div className="admin-error-content">
          <p>Error al cargar los datos del dashboard</p>
          <button className="admin-retry-btn" onClick={fetchDashboard}>
            <FiRefreshCw size={16} /> Reintentar
          </button>
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="PANEL DE CONTROL"
      subtitle="Resumen ejecutivo de la plataforma IDON"
      theme="admin"
      headerAction={refreshButton}
    >
      <div className="admin-dashboard-container">
        {/* Tarjetas de estadísticas */}
        <div className="admin-stats-grid">
          {statsCards.map((stat, index) => (
            <div key={index} className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: stat.bg, color: stat.color }}>
                {stat.icon}
              </div>
              <div className="admin-stat-content">
                <div className="admin-stat-value">{stat.value}</div>
                <div className="admin-stat-label">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Acciones Rápidas */}
        <div className="admin-section-card">
          <div className="admin-section-header">
            <h3>Acciones Rápidas</h3>
          </div>
          <div className="admin-actions-grid">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="admin-action-btn"
                onClick={action.onClick}
              >
                <action.icon size={28} />
                <span className="admin-action-label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="admin-section-card">
          <div className="admin-section-header">
            <h3>Actividad Reciente</h3>
          </div>
          <div className="admin-activity-list">
            {recentActivity.length === 0 ? (
              <div className="admin-empty-state">
                <FiFileText size={48} />
                <p>No hay actividad reciente</p>
                <span>El historial de actividad aparecerá aquí</span>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={index} className="admin-activity-item">
                  <div className="admin-activity-icon">
                    <FiCheckCircle size={16} />
                  </div>
                  <div className="admin-activity-content">
                    <div className="admin-activity-description">{activity.description}</div>
                    <div className="admin-activity-time">{new Date(activity.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}