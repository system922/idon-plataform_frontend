// src/admin/pages/businesses/BusinessStats.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiTrendingUp, FiUsers, FiDollarSign, FiPackage,
  FiSearch, FiEye, FiRefreshCw, FiCalendar,
  FiArrowUp, FiArrowDown
} from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import PageTemplate from '../../components/PageTemplate';
import { adminApi } from '../../config/api';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

export default function BusinessStats() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/businesses/stats');
      setBusinesses(res.data || []);
      if (res.data?.length > 0) {
        setSelectedBusiness(res.data[0]);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredBusinesses = useMemo(() => {
    if (!searchTerm) return businesses;
    return businesses.filter(biz =>
      biz.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      biz.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [businesses, searchTerm]);

  const statsCards = useMemo(() => {
    if (!selectedBusiness) return [];
    return [
      { 
        label: 'Ingresos Totales', 
        value: `$${selectedBusiness.total_revenue?.toFixed(2) || '0.00'}`, 
        icon: FiDollarSign, 
        color: '#10b981' 
      },
      { 
        label: 'Usuarios Activos', 
        value: selectedBusiness.active_users || 0, 
        icon: FiUsers, 
        color: '#3b82f6' 
      },
      { 
        label: 'Módulos Activos', 
        value: selectedBusiness.active_modules || 0, 
        icon: FiPackage, 
        color: '#8b5cf6' 
      },
      { 
        label: 'Crecimiento', 
        value: `${selectedBusiness.growth || 0}%`, 
        icon: FiTrendingUp, 
        color: '#f59e0b' 
      },
    ];
  }, [selectedBusiness]);

  const chartData = useMemo(() => {
    if (!selectedBusiness?.monthly_data) return [];
    return selectedBusiness.monthly_data;
  }, [selectedBusiness]);

  if (loading) {
    return (
      <PageTemplate title="ESTADÍSTICAS POR NEGOCIO" subtitle="Análisis detallado de cada negocio" loading={true}>
        <div className="admin-loading">Cargando estadísticas...</div>
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate title="ESTADÍSTICAS POR NEGOCIO" subtitle="Análisis detallado de cada negocio" error={error}>
        <div className="admin-error-content">
          <p>Error al cargar los datos: {error}</p>
          <button className="admin-retry-btn" onClick={fetchData}>
            <FiRefreshCw size={16} /> Reintentar
          </button>
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="ESTADÍSTICAS POR NEGOCIO"
      subtitle="Análisis detallado de rendimiento por negocio"
      theme="admin"
      headerAction={
        <button onClick={handleRefresh} className="dashboard-refresh-btn-header" disabled={refreshing}>
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      }
    >
      <div className="business-stats-container">
        {/* Controles de búsqueda y selector */}
        <div className="business-stats-controls">
          <div className="business-stats-search">
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Buscar negocio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="business-stats-selector">
            <select
              value={selectedBusiness?.id || ''}
              onChange={(e) => {
                const biz = businesses.find(b => b.id === parseInt(e.target.value));
                setSelectedBusiness(biz);
              }}
            >
              {filteredBusinesses.map(biz => (
                <option key={biz.id} value={biz.id}>
                  {biz.name} - {biz.client_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedBusiness ? (
          <>
            {/* Header del negocio */}
            <div className="business-stats-header">
              <div>
                <h2>{selectedBusiness.name}</h2>
                <p>Cliente: {selectedBusiness.client_name} • {selectedBusiness.client_email}</p>
              </div>
              <div className="business-stats-status">
                <span className={`status-badge ${selectedBusiness.status}`}>
                  {selectedBusiness.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
                <button 
                  className="business-stats-view-btn" 
                  onClick={() => navigate(`/admin/businesses/${selectedBusiness.id}`)}
                >
                  <FiEye size={16} /> Ver Detalle
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="admin-stats-grid">
              {statsCards.map((stat, index) => (
                <div key={index} className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                    <stat.icon size={22} />
                  </div>
                  <div className="admin-stat-content">
                    <div className="admin-stat-value">{stat.value}</div>
                    <div className="admin-stat-label">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gráficos */}
            <div className="admin-charts-row">
              <div className="admin-chart-card">
                <div className="admin-chart-header">
                  <FiTrendingUp size={16} />
                  <span>Ingresos Mensuales</span>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: '#1f1f23', border: '1px solid #333', borderRadius: 8 }}
                      formatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="admin-chart-card">
                <div className="admin-chart-header">
                  <FiUsers size={16} />
                  <span>Usuarios Activos</span>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: '#1f1f23', border: '1px solid #333', borderRadius: 8 }}
                    />
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Módulos usados */}
            <div className="business-stats-modules">
              <h3>Módulos Utilizados</h3>
              <div className="business-modules-grid">
                {selectedBusiness.modules?.length > 0 ? (
                  selectedBusiness.modules.map((mod, index) => (
                    <div key={index} className="business-module-card">
                      <div className="business-module-icon" style={{ background: `${COLORS[index % COLORS.length]}20` }}>
                        <FiPackage size={20} color={COLORS[index % COLORS.length]} />
                      </div>
                      <div className="business-module-info">
                        <span className="business-module-name">{mod.name}</span>
                        <span className="business-module-status">Activo</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="business-empty-modules">No hay módulos activos</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="business-empty-state">
            <p>No hay negocios disponibles</p>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}