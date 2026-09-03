// ========== src/admin/pages/businesses/BusinessStats.jsx ==========
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiTrendingUp,
  FiUsers,
  FiDollarSign,
  FiPackage,
  FiSearch,
  FiEye,
  FiRefreshCw,
  FiUser,
  FiBriefcase,
  FiCalendar,
  FiPhone,
  FiMail,
  FiCreditCard,
  FiShoppingBag,
  FiBarChart2,
  FiFileText,
  FiSettings,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiActivity,
  FiGrid,
  FiList,
  FiPlus,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import PageTemplate from '../../components/PageTemplate';
import { adminApi } from '../../config/api';
import '../../styles/admin/BusinessStats.css';

// ─── Constantes ────────────────────────────────────────────────
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#ef4444'];

const STATUS_LABELS = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  pending: 'Pendiente',
  provisioned: 'Provisionado',
};

const STATUS_COLORS = {
  active: '#10b981',
  inactive: '#ef4444',
  suspended: '#f59e0b',
  pending: '#3b82f6',
  provisioned: '#8b5cf6',
};

const SUBSCRIPTION_LABELS = {
  active: 'Activa',
  no_subscription: 'Sin suscripción',
  suspended: 'Suspendida',
  pending: 'Pendiente',
  inactive: 'Inactiva',
};

const SUBSCRIPTION_COLORS = {
  active: '#10b981',
  no_subscription: '#6b7280',
  suspended: '#ef4444',
  pending: '#f59e0b',
  inactive: '#6b7280',
};

// ─── Componente ──────────────────────────────────────────────────
export default function BusinessStats() {
  const navigate = useNavigate();

  // ─── Estados ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    owner: true,
    users: true,
    sales: true,
    modules: true,
    subscription: true,
    customers: true,
  });

  // ─── Logs de datos ─────────────────────────────────────────────
  const logData = (label, data) => {
    console.log(`📊 [BusinessStats] ${label}:`);
    console.log(JSON.stringify(data, null, 2));
  };

  // ─── Fetch Data ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    console.log('🔄 [BusinessStats] Iniciando fetch de datos...');
    
    try {
      setLoading(true);
      setError(null);

      const res = await adminApi.get('/admin/businesses/stats');
      
      console.log('📥 [BusinessStats] Respuesta:', res);
      console.log('📥 [BusinessStats] res.success:', res.success);

      // ✅ CORREGIDO: Verificar res.success (no res.data?.success)
      if (res.success !== true) {
        console.warn('⚠️ [BusinessStats] La respuesta no fue exitosa');
        console.warn('⚠️ [BusinessStats] res:', res);
        setError(res.message || 'Error al cargar estadísticas');
        setLoading(false);
        return;
      }

      // ✅ CORREGIDO: Los datos están en res.data
      const businessList = res.data?.businesses || [];
      const summaryData = res.data?.summary || null;

      console.log(`📊 [BusinessStats] Negocios encontrados: ${businessList.length}`);

      setBusinesses(businessList);

      if (businessList.length > 0) {
        setSelectedBusiness((prev) => {
          if (prev && businessList.some((b) => b.id === prev.id)) {
            return prev;
          }
          return businessList[0];
        });
      } else {
        setSelectedBusiness(null);
      }

      setSummary(summaryData);

      if (summaryData) {
        console.log('📊 [BusinessStats] Resumen:', summaryData);
      }

    } catch (err) {
      console.error('❌ [BusinessStats] Error en fetchData:', err);
      console.error('❌ [BusinessStats] err.response:', err.response);
      console.error('❌ [BusinessStats] err.response?.data:', err.response?.data);
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleSearch = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleBusinessChange = useCallback(
    (e) => {
      const biz = businesses.find((b) => b.id === e.target.value);
      if (biz) {
        console.log(`🎯 [BusinessStats] Negocio seleccionado: ${biz.name}`);
        setSelectedBusiness(biz);
        setExpandedSections({
          overview: true,
          owner: true,
          users: true,
          sales: true,
          modules: true,
          subscription: true,
          customers: true,
        });
      }
    },
    [businesses]
  );

  const handleViewDetail = useCallback(() => {
    if (selectedBusiness) {
      navigate(`/admin/businesses/${selectedBusiness.id}`);
    }
  }, [navigate, selectedBusiness]);

  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // ─── Memorizados ──────────────────────────────────────────────
  const filteredBusinesses = useMemo(() => {
    if (!searchTerm.trim()) return businesses;
    const term = searchTerm.toLowerCase().trim();
    return businesses.filter(
      (biz) =>
        biz.name?.toLowerCase().includes(term) ||
        biz.client_name?.toLowerCase().includes(term) ||
        biz.schema_name?.toLowerCase().includes(term)
    );
  }, [businesses, searchTerm]);

  const statsCards = useMemo(() => {
    if (!selectedBusiness) return [];

    return [
      {
        id: 'revenue',
        label: 'Ingresos Totales',
        value: `$${selectedBusiness.total_revenue?.toFixed(2) || '0.00'}`,
        icon: FiDollarSign,
        color: '#10b981',
        subtitle: `${selectedBusiness.total_sales || 0} ventas`,
      },
      {
        id: 'users',
        label: 'Usuarios',
        value: selectedBusiness.total_users || 0,
        icon: FiUsers,
        color: '#3b82f6',
        subtitle: `${selectedBusiness.active_users || 0} activos`,
      },
      {
        id: 'modules',
        label: 'Módulos Activos',
        value: selectedBusiness.active_modules || 0,
        icon: FiPackage,
        color: '#8b5cf6',
        subtitle: 'del sistema',
      },
      {
        id: 'growth',
        label: 'Crecimiento',
        value: `${selectedBusiness.growth || 0}%`,
        icon: FiTrendingUp,
        color: '#f59e0b',
        subtitle: 'vs mes anterior',
      },
      {
        id: 'customers',
        label: 'Clientes',
        value: selectedBusiness.customers?.total || 0,
        icon: FiUsers,
        color: '#ec4899',
        subtitle: `${selectedBusiness.customers?.active || 0} activos`,
      },
      {
        id: 'sales',
        label: 'Ventas',
        value: selectedBusiness.total_sales || 0,
        icon: FiShoppingBag,
        color: '#06b6d4',
        subtitle: 'últimos 30 días',
      },
    ];
  }, [selectedBusiness]);

  const chartData = useMemo(() => {
    if (!selectedBusiness?.monthly_data?.length) return [];
    return selectedBusiness.monthly_data;
  }, [selectedBusiness]);

  const modules = useMemo(() => {
    return selectedBusiness?.modules || [];
  }, [selectedBusiness]);

  const topProducts = useMemo(() => {
    return selectedBusiness?.top_products || [];
  }, [selectedBusiness]);

  // ─── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageTemplate
        title="ESTADÍSTICAS POR NEGOCIO"
        subtitle="Análisis detallado de rendimiento por negocio"
        loading={true}
      >
        <div className="admin-loading">Cargando estadísticas...</div>
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate
        title="ESTADÍSTICAS POR NEGOCIO"
        subtitle="Análisis detallado de rendimiento por negocio"
        error={error}
      >
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
        <button
          className="dashboard-refresh-btn-header"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      }
    >
      <div className="business-stats-container">
        {/* ─── Barra de búsqueda y selector ──────────────────── */}
        <div className="business-stats-controls">
          <div className="business-stats-search">
            <FiSearch size={18} />
            <input
              type="text"
              placeholder="Buscar negocio por nombre, cliente o schema..."
              value={searchTerm}
              onChange={handleSearch}
            />
            {searchTerm && (
              <button className="search-clear" onClick={clearSearch}>
                <FiXCircle size={16} />
              </button>
            )}
          </div>

          <div className="business-stats-selector-wrapper">
            <label htmlFor="business-select">Negocio:</label>
            <select
              id="business-select"
              value={selectedBusiness?.id || ''}
              onChange={handleBusinessChange}
            >
              {filteredBusinesses.length > 0 ? (
                filteredBusinesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.name} - {biz.client_name}
                  </option>
                ))
              ) : (
                <option value="">No hay negocios disponibles</option>
              )}
            </select>
          </div>
        </div>

        {/* ─── Resumen General ────────────────────────────────── */}
        {summary && (
          <div className="business-stats-summary">
            <div className="summary-item">
              <span className="summary-label">Total Negocios</span>
              <span className="summary-value">{summary.total_businesses}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Activos</span>
              <span className="summary-value">{summary.active_businesses}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Inactivos</span>
              <span className="summary-value">{summary.inactive_businesses}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Usuarios Totales</span>
              <span className="summary-value">{summary.total_users}</span>
            </div>
            <div className="summary-item highlight">
              <span className="summary-label">Ingresos Totales</span>
              <span className="summary-value">
                ${summary.total_revenue?.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Módulos Activos</span>
              <span className="summary-value">{summary.total_modules}</span>
            </div>
          </div>
        )}

        {/* ─── Detalle del Negocio Seleccionado ───────────────── */}
        {selectedBusiness ? (
          <div className="business-detail-container">
            {/* ─── Header del Negocio ────────────────────────── */}
            <div className="business-detail-header">
              <div className="business-detail-title">
                <h2>{selectedBusiness.name}</h2>
                <div className="business-detail-badges">
                  <span
                    className={`status-badge ${selectedBusiness.status}`}
                    style={{
                      backgroundColor: `${STATUS_COLORS[selectedBusiness.status] || '#888'}20`,
                      color: STATUS_COLORS[selectedBusiness.status] || '#888',
                    }}
                  >
                    {STATUS_LABELS[selectedBusiness.status] || selectedBusiness.status}
                  </span>
                  <span
                    className="status-badge verified"
                    style={{
                      backgroundColor: selectedBusiness.is_verified ? '#10b98120' : '#f59e0b20',
                      color: selectedBusiness.is_verified ? '#10b981' : '#f59e0b',
                    }}
                  >
                    {selectedBusiness.is_verified ? '✓ Verificado' : '⏳ Pendiente'}
                  </span>
                  <span
                    className="status-badge subscription"
                    style={{
                      backgroundColor: `${SUBSCRIPTION_COLORS[selectedBusiness.subscription_status] || '#888'}20`,
                      color: SUBSCRIPTION_COLORS[selectedBusiness.subscription_status] || '#888',
                    }}
                  >
                    {SUBSCRIPTION_LABELS[selectedBusiness.subscription_status] || selectedBusiness.subscription_status}
                  </span>
                </div>
              </div>

              <div className="business-detail-actions">
                <button
                  className="business-stats-view-btn"
                  onClick={handleViewDetail}
                >
                  <FiEye size={16} /> Ver Detalle Completo
                </button>
              </div>
            </div>

            {/* ─── Información General del Negocio ───────────── */}
            <div className="business-detail-info">
              <div className="info-item">
                <FiBriefcase size={14} />
                <span><strong>Schema:</strong> {selectedBusiness.schema_name}</span>
              </div>
              <div className="info-item">
                <FiGrid size={14} />
                <span><strong>Tipo:</strong> {selectedBusiness.business_type}</span>
              </div>
              <div className="info-item">
                <FiCalendar size={14} />
                <span><strong>Creado:</strong> {selectedBusiness.created_at ? new Date(selectedBusiness.created_at).toLocaleDateString('es-EC') : 'N/A'}</span>
              </div>
            </div>

            {/* ─── Stats Cards ────────────────────────────────── */}
            <div className="admin-stats-grid">
              {statsCards.map((stat) => (
                <div key={stat.id} className="admin-stat-card">
                  <div
                    className="admin-stat-icon"
                    style={{
                      backgroundColor: `${stat.color}20`,
                      color: stat.color,
                    }}
                  >
                    <stat.icon size={22} />
                  </div>
                  <div className="admin-stat-content">
                    <div className="admin-stat-value">{stat.value}</div>
                    <div className="admin-stat-label">{stat.label}</div>
                    {stat.subtitle && (
                      <div className="admin-stat-subtitle">{stat.subtitle}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Sección: Dueño del Negocio ─────────────────── */}
            <div className="business-section">
              <div
                className="business-section-header"
                onClick={() => toggleSection('owner')}
              >
                <div className="section-header-left">
                  <FiUser size={18} />
                  <h3>Dueño del Negocio</h3>
                </div>
                <button className="section-toggle">
                  {expandedSections.owner ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                </button>
              </div>
              {expandedSections.owner && (
                <div className="business-section-content owner-info">
                  <div className="owner-avatar">
                    {selectedBusiness.client_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="owner-details">
                    <div className="owner-name">
                      <strong>{selectedBusiness.client_name || 'Sin nombre'}</strong>
                    </div>
                    <div className="owner-contact">
                      <div className="contact-item">
                        <FiMail size={14} />
                        <span>{selectedBusiness.client_email || 'Sin email'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Sección: Usuarios ───────────────────────────── */}
            <div className="business-section">
              <div
                className="business-section-header"
                onClick={() => toggleSection('users')}
              >
                <div className="section-header-left">
                  <FiUsers size={18} />
                  <h3>Usuarios del Negocio</h3>
                  <span className="section-badge">
                    {selectedBusiness.total_users || 0} total
                  </span>
                </div>
                <button className="section-toggle">
                  {expandedSections.users ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                </button>
              </div>
              {expandedSections.users && (
                <div className="business-section-content users-grid">
                  <div className="user-stat-card">
                    <div className="user-stat-number">{selectedBusiness.total_users || 0}</div>
                    <div className="user-stat-label">Total Usuarios</div>
                  </div>
                  <div className="user-stat-card success">
                    <div className="user-stat-number">{selectedBusiness.active_users || 0}</div>
                    <div className="user-stat-label">Usuarios Activos</div>
                  </div>
                  <div className="user-stat-card warning">
                    <div className="user-stat-number">
                      {(selectedBusiness.total_users || 0) - (selectedBusiness.active_users || 0)}
                    </div>
                    <div className="user-stat-label">Inactivos</div>
                  </div>
                  <div className="user-stat-card info">
                    <div className="user-stat-number">
                      {selectedBusiness.total_users > 0
                        ? Math.round(((selectedBusiness.active_users || 0) / (selectedBusiness.total_users || 1)) * 100)
                        : 0}%
                    </div>
                    <div className="user-stat-label">Tasa de Actividad</div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Sección: Ventas ────────────────────────────── */}
            <div className="business-section">
              <div
                className="business-section-header"
                onClick={() => toggleSection('sales')}
              >
                <div className="section-header-left">
                  <FiShoppingBag size={18} />
                  <h3>Ventas</h3>
                  <span className="section-badge">
                    ${selectedBusiness.total_revenue?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <button className="section-toggle">
                  {expandedSections.sales ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                </button>
              </div>
              {expandedSections.sales && (
                <div className="business-section-content sales-content">
                  <div className="sales-summary">
                    <div className="sales-item">
                      <span className="sales-label">Total Ventas</span>
                      <span className="sales-value">{selectedBusiness.total_sales || 0}</span>
                    </div>
                    <div className="sales-item">
                      <span className="sales-label">Ingresos Totales</span>
                      <span className="sales-value">${selectedBusiness.total_revenue?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="sales-item">
                      <span className="sales-label">Ingresos Mensuales</span>
                      <span className="sales-value">${selectedBusiness.monthly_revenue?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="sales-item">
                      <span className="sales-label">Crecimiento</span>
                      <span className={`sales-value ${selectedBusiness.growth > 0 ? 'positive' : 'negative'}`}>
                        {selectedBusiness.growth > 0 ? '+' : ''}{selectedBusiness.growth || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Gráficos */}
                  <div className="admin-charts-row">
                    <div className="admin-chart-card">
                      <div className="admin-chart-header">
                        <FiBarChart2 size={16} />
                        <span>Ingresos Mensuales</span>
                      </div>
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{
                                background: '#1f1f23',
                                border: '1px solid #333',
                                borderRadius: 8,
                              }}
                              formatter={(value) => `$${value.toFixed(2)}`}
                            />
                            <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="admin-chart-empty">No hay datos de ingresos</div>
                      )}
                    </div>

                    <div className="admin-chart-card">
                      <div className="admin-chart-header">
                        <FiActivity size={16} />
                        <span>Actividad de Ventas</span>
                      </div>
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                            <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
                            <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                            <Tooltip
                              contentStyle={{
                                background: '#1f1f23',
                                border: '1px solid #333',
                                borderRadius: 8,
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="sales"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              dot={{ fill: '#8b5cf6' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="admin-chart-empty">No hay datos de actividad</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Sección: Módulos ───────────────────────────── */}
            <div className="business-section">
              <div
                className="business-section-header"
                onClick={() => toggleSection('modules')}
              >
                <div className="section-header-left">
                  <FiPackage size={18} />
                  <h3>Módulos Activos</h3>
                  <span className="section-badge">
                    {selectedBusiness.active_modules || 0} módulos
                  </span>
                </div>
                <button className="section-toggle">
                  {expandedSections.modules ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                </button>
              </div>
              {expandedSections.modules && (
                <div className="business-section-content modules-content">
                  {modules.length > 0 ? (
                    <div className="business-modules-grid">
                      {modules.map((mod, index) => (
                        <div key={mod.id || index} className="business-module-card">
                          <div
                            className="business-module-icon"
                            style={{
                              backgroundColor: `${COLORS[index % COLORS.length]}20`,
                            }}
                          >
                            {mod.icon ? (
                              <span style={{ fontSize: '20px' }}>{mod.icon}</span>
                            ) : (
                              <FiPackage size={20} color={COLORS[index % COLORS.length]} />
                            )}
                          </div>
                          <div className="business-module-info">
                            <span className="business-module-name">{mod.name}</span>
                            <span className="business-module-code">{mod.code}</span>
                            <span className="business-module-status">
                              <FiCheckCircle size={12} /> Activo
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="business-empty-modules">
                      <FiPackage size={32} />
                      <p>No hay módulos activos para este negocio</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── Sección: Suscripción ────────────────────────── */}
            <div className="business-section">
              <div
                className="business-section-header"
                onClick={() => toggleSection('subscription')}
              >
                <div className="section-header-left">
                  <FiFileText size={18} />
                  <h3>Suscripción</h3>
                </div>
                <button className="section-toggle">
                  {expandedSections.subscription ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                </button>
              </div>
              {expandedSections.subscription && (
                <div className="business-section-content subscription-content">
                  <div className="subscription-info">
                    <div className="sub-item">
                      <span className="sub-label">Estado</span>
                      <span
                        className="sub-value status"
                        style={{
                          color: SUBSCRIPTION_COLORS[selectedBusiness.subscription_status] || '#888',
                        }}
                      >
                        {SUBSCRIPTION_LABELS[selectedBusiness.subscription_status] || selectedBusiness.subscription_status}
                      </span>
                    </div>
                    <div className="sub-item">
                      <span className="sub-label">Activación</span>
                      <span className="sub-value">
                        {selectedBusiness.subscription_activated_at
                          ? new Date(selectedBusiness.subscription_activated_at).toLocaleDateString('es-EC')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="sub-item">
                      <span className="sub-label">Próxima Facturación</span>
                      <span className="sub-value">
                        {selectedBusiness.next_billing_at
                          ? new Date(selectedBusiness.next_billing_at).toLocaleDateString('es-EC')
                          : 'N/A'}
                      </span>
                    </div>
                    {selectedBusiness.suspended_at && (
                      <div className="sub-item">
                        <span className="sub-label">Suspendido</span>
                        <span className="sub-value" style={{ color: '#ef4444' }}>
                          {new Date(selectedBusiness.suspended_at).toLocaleDateString('es-EC')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Sección: Clientes ───────────────────────────── */}
            <div className="business-section">
              <div
                className="business-section-header"
                onClick={() => toggleSection('customers')}
              >
                <div className="section-header-left">
                  <FiUsers size={18} />
                  <h3>Clientes</h3>
                  <span className="section-badge">
                    {selectedBusiness.customers?.total || 0} total
                  </span>
                </div>
                <button className="section-toggle">
                  {expandedSections.customers ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                </button>
              </div>
              {expandedSections.customers && (
                <div className="business-section-content customers-content">
                  <div className="customers-summary">
                    <div className="customer-stat">
                      <span className="customer-number">{selectedBusiness.customers?.total || 0}</span>
                      <span className="customer-label">Total Clientes</span>
                    </div>
                    <div className="customer-stat success">
                      <span className="customer-number">{selectedBusiness.customers?.active || 0}</span>
                      <span className="customer-label">Clientes Activos</span>
                    </div>
                    <div className="customer-stat">
                      <span className="customer-number">
                        {selectedBusiness.customers?.total > 0
                          ? Math.round(((selectedBusiness.customers?.active || 0) / (selectedBusiness.customers?.total || 1)) * 100)
                          : 0}%
                      </span>
                      <span className="customer-label">Tasa de Actividad</span>
                    </div>
                  </div>
                  {topProducts.length > 0 && (
                    <div className="top-products">
                      <h4>Productos Más Vendidos</h4>
                      <div className="products-list">
                        {topProducts.map((product, index) => (
                          <div key={index} className="product-item">
                            <span className="product-rank">#{index + 1}</span>
                            <span className="product-name">{product.name}</span>
                            <span className="product-sales">
                              <FiShoppingBag size={12} /> {product.sales_count || 0} ventas
                            </span>
                            <span className="product-revenue">
                              ${product.total_revenue?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="business-empty-state">
            <FiPackage size={48} color="#666" />
            <p>No hay negocios disponibles</p>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}