import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBox, FiUsers, FiServer, FiDollarSign, FiTrendingUp,
  FiRefreshCw, FiClock, FiCreditCard, FiUserCheck, FiPackage,
  FiActivity, FiClipboard, FiGrid
} from 'react-icons/fi';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import PageTemplate from '../../components/PageTemplate';
import { adminApi } from '../../config/api';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [modules, setModules] = useState([]);
  const [payments, setPayments] = useState([]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [clientsRes, requestsRes, modulesRes, paymentsRes] = await Promise.all([
        adminApi.get('/admin/clients').catch(() => ({ data: [] })),
        adminApi.get('/admin/requests').catch(() => ({ data: [] })),
        adminApi.get('/admin/modules').catch(() => ({ data: [] })),
        adminApi.get('/admin/payments').catch(() => ({ data: [] })),
      ]);

      setClients(clientsRes.data || []);
      setRequests(requestsRes.data || []);
      setModules(modulesRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const activeBusinesses = useMemo(() => {
    const businesses = [];
    clients.forEach(client => {
      (client.businesses || []).forEach(biz => {
        if (biz.status === 'active' || biz.subscription?.status === 'active') {
          businesses.push({
            ...biz,
            client_name: client.full_name,
            client_email: client.email,
          });
        }
      });
    });
    return businesses;
  }, [clients]);

  const pendingPayments = useMemo(() => {
    return payments.filter(p => {
      const status = p.sub_status || p.status;
      return status === 'pending' || status === 'overdue' || status === 'suspended' || !p.sub_id;
    });
  }, [payments]);

  const paidOnTime = useMemo(() => {
    return payments.filter(p => {
      const status = p.sub_status || p.status;
      return status === 'active' && p.next_billing_at && new Date(p.next_billing_at) > new Date();
    });
  }, [payments]);

  const pendingRequests = useMemo(() => {
    return requests.filter(r => r.status === 'pending' || r.estado === 'pendiente');
  }, [requests]);

  const totalUsers = clients.length;
  const totalModules = modules.length;

  const monthlyRevenue = useMemo(() => {
    let total = 0;
    payments.forEach(p => {
      if (p.sub_status === 'active' && p.total_amount) {
        if (p.billing_period === 'monthly') {
          total += parseFloat(p.total_amount) || 0;
        } else if (p.billing_period === 'annual') {
          total += (parseFloat(p.total_amount) || 0) / 12;
        }
      }
    });
    return total;
  }, [payments]);

  const totalRevenue = useMemo(() => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  }, [payments]);

  const businessDistribution = useMemo(() => {
    const types = {};
    clients.forEach(client => {
      (client.businesses || []).forEach(biz => {
        const type = biz.business_type_name || biz.business_type || 'Otros';
        types[type] = (types[type] || 0) + 1;
      });
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [clients]);

  const moduleUsage = useMemo(() => {
    const usage = {};
    clients.forEach(client => {
      (client.businesses || []).forEach(biz => {
        (biz.modules || []).forEach(mod => {
          usage[mod.name] = (usage[mod.name] || 0) + 1;
        });
      });
    });
    return Object.entries(usage)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [clients]);

  const monthlyData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthly = {};
    payments.forEach(p => {
      if (p.last_paid_at || p.created_at) {
        const date = new Date(p.last_paid_at || p.created_at);
        const month = date.getMonth();
        const amount = parseFloat(p.total_amount) || 0;
        monthly[month] = (monthly[month] || 0) + amount;
      }
    });
    return months.map((month, i) => ({
      month,
      revenue: monthly[i] || 0,
      users: clients.filter(c => {
        const created = new Date(c.created_at);
        return created.getMonth() === i;
      }).length,
      businesses: activeBusinesses.filter(b => {
        const created = new Date(b.created_at);
        return created.getMonth() === i;
      }).length,
    }));
  }, [payments, clients, activeBusinesses]);

  const paymentStatus = useMemo(() => {
    const active = payments.filter(p => p.sub_status === 'active').length;
    const overdue = payments.filter(p => {
      const status = p.sub_status || p.status;
      return status === 'overdue' || (status === 'active' && p.next_billing_at && new Date(p.next_billing_at) < new Date());
    }).length;
    const suspended = payments.filter(p => p.sub_status === 'suspended').length;
    const noSub = payments.filter(p => !p.sub_id).length;
    const pending = payments.filter(p => p.sub_status === 'pending_activation' || p.status === 'pending').length;
    return [
      { name: 'Activos', value: active },
      { name: 'Vencidos', value: overdue },
      { name: 'Suspendidos', value: suspended },
      { name: 'Sin suscripción', value: noSub },
      { name: 'Pendientes', value: pending },
    ].filter(d => d.value > 0);
  }, [payments]);

  const statsCards = [
    { 
      label: 'Negocios Activos', 
      value: activeBusinesses.length, 
      icon: <FiServer size={22} />, 
      color: '#10b981',
      subtitle: `${pendingRequests.length} solicitudes pendientes`
    },
    { 
      label: 'Usuarios Registrados', 
      value: totalUsers, 
      icon: <FiUsers size={22} />, 
      color: '#3b82f6',
      subtitle: `${clients.filter(c => (c.businesses || []).length > 0).length} con negocios`
    },
    { 
      label: 'Ingresos Mensuales', 
      value: `$${monthlyRevenue.toFixed(2)}`, 
      icon: <FiDollarSign size={22} />, 
      color: '#8b5cf6',
      subtitle: `Total: $${totalRevenue.toFixed(2)}`
    },
    { 
      label: 'Suscripciones Activas', 
      value: paidOnTime.length, 
      icon: <FiCreditCard size={22} />, 
      color: '#f59e0b',
      subtitle: `${pendingPayments.length} con pagos pendientes`
    },
  ];

  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const quickActions = [
    { label: 'Solicitudes', icon: FiClipboard, onClick: () => navigate('/admin/requests'), color: '#10b981', count: pendingRequests.length },
    { label: 'Clientes', icon: FiUsers, onClick: () => navigate('/admin/businesses'), color: '#3b82f6', count: totalUsers },
    { label: 'Módulos', icon: FiGrid, onClick: () => navigate('/admin/modules'), color: '#8b5cf6', count: totalModules },
    { label: 'Pagos', icon: FiDollarSign, onClick: () => navigate('/admin/payments'), color: '#f59e0b', count: pendingPayments.length },
  ];

  if (loading) {
    return (
      <PageTemplate title="PANEL DE CONTROL" subtitle="Plataforma IDON" loading={true}>
        <div className="admin-loading">Cargando datos...</div>
      </PageTemplate>
    );
  }

  if (error) {
    return (
      <PageTemplate title="PANEL DE CONTROL" subtitle="Plataforma IDON" error={error} onRetry={fetchAllData}>
        <div className="admin-error-content">
          <p>Error al cargar los datos: {error}</p>
          <button className="admin-retry-btn" onClick={fetchAllData}>
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

        <div className="admin-stats-grid">
          {statsCards.map((stat, index) => (
            <div key={index} className="admin-stat-card">
              <div className="admin-stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
                {stat.icon}
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

        <div className="admin-charts-row">

          <div className="admin-chart-card">
            <div className="admin-chart-header">
              <FiTrendingUp size={16} />
              <span>Ingresos Mensuales</span>
              <span className="admin-chart-total">${monthlyRevenue.toFixed(2)}</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 10 }} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ background: '#1f1f23', border: '1px solid #333', borderRadius: 8 }}
                  formatter={(value) => `$${value.toFixed(2)}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="admin-chart-card">
            <div className="admin-chart-header">
              <FiBox size={16} />
              <span>Distribución por Sector</span>
              <span className="admin-chart-total">{activeBusinesses.length} negocios</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={businessDistribution.length > 0 ? businessDistribution : [{ name: 'Sin datos', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {businessDistribution.length > 0 ? businessDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  )) : <Cell fill="#333" />}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#1f1f23', border: '1px solid #333', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-charts-row admin-charts-row-3">

          <div className="admin-chart-card admin-chart-small">
            <div className="admin-chart-header">
              <FiCreditCard size={14} />
              <span>Estado de Pagos</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={paymentStatus.length > 0 ? paymentStatus : [{ name: 'Sin datos', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {paymentStatus.length > 0 ? paymentStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  )) : <Cell fill="#333" />}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#1f1f23', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="admin-payment-legend">
              {paymentStatus.slice(0, 4).map((d, i) => (
                <span key={i} className="admin-payment-legend-item">
                  <span className="admin-payment-legend-dot" style={{ background: COLORS[i] }} />
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          </div>

          <div className="admin-chart-card admin-chart-small">
            <div className="admin-chart-header">
              <FiPackage size={14} />
              <span>Módulos más usados</span>
            </div>
            <div className="admin-module-list">
              {moduleUsage.length > 0 ? (
                moduleUsage.slice(0, 5).map((mod, i) => {
                  const maxValue = moduleUsage[0]?.value || 1;
                  const percentage = (mod.value / maxValue) * 100;
                  return (
                    <div key={i} className="admin-module-item">
                      <span className="admin-module-name">{mod.name}</span>
                      <div className="admin-module-bar-bg">
                        <div 
                          className="admin-module-bar" 
                          style={{ 
                            width: `${Math.max(percentage, 10)}%`,
                            backgroundColor: COLORS[i % COLORS.length]
                          }}
                        />
                      </div>
                      <span className="admin-module-count">{mod.value}</span>
                    </div>
                  );
                })
              ) : (
                <div className="admin-empty-mini">Sin datos de módulos</div>
              )}
            </div>
          </div>

          <div className="admin-chart-card admin-chart-small">
            <div className="admin-chart-header">
              <FiActivity size={14} />
              <span>Métricas Clave</span>
            </div>
            <div className="admin-kpis-grid">
              <div className="admin-kpi-item">
                <span className="admin-kpi-label">Solicitudes pendientes</span>
                <span className="admin-kpi-value" style={{ color: '#f59e0b' }}>{pendingRequests.length}</span>
              </div>
              <div className="admin-kpi-item">
                <span className="admin-kpi-label">Pagos vencidos</span>
                <span className="admin-kpi-value" style={{ color: '#ef4444' }}>
                  {payments.filter(p => p.sub_status === 'overdue' || (p.sub_status === 'active' && p.next_billing_at && new Date(p.next_billing_at) < new Date())).length}
                </span>
              </div>
              <div className="admin-kpi-item">
                <span className="admin-kpi-label">Negocios activos</span>
                <span className="admin-kpi-value" style={{ color: '#10b981' }}>{activeBusinesses.length}</span>
              </div>
              <div className="admin-kpi-item">
                <span className="admin-kpi-label">Módulos totales</span>
                <span className="admin-kpi-value" style={{ color: '#3b82f6' }}>{totalModules}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-section-card admin-actions-compact">
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
                <div className="admin-action-btn-icon">
                  <action.icon size={22} />
                  {action.count > 0 && (
                    <span className="admin-action-badge">{action.count}</span>
                  )}
                </div>
                <span className="admin-action-label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-section-card">
          <div className="admin-section-header">
            <h3>Resumen General</h3>
          </div>
          <div className="admin-summary-grid">
            <div className="admin-summary-item">
              <FiUserCheck size={16} className="admin-summary-icon green" />
              <div>
                <div className="admin-summary-label">Clientes</div>
                <div className="admin-summary-value">{totalUsers}</div>
              </div>
            </div>
            <div className="admin-summary-item">
              <FiServer size={16} className="admin-summary-icon orange" />
              <div>
                <div className="admin-summary-label">Negocios</div>
                <div className="admin-summary-value">{activeBusinesses.length}</div>
              </div>
            </div>
            <div className="admin-summary-item">
              <FiCreditCard size={16} className="admin-summary-icon purple" />
              <div>
                <div className="admin-summary-label">Ingresos</div>
                <div className="admin-summary-value">${totalRevenue.toFixed(2)}</div>
              </div>
            </div>
            <div className="admin-summary-item">
              <FiClock size={16} className="admin-summary-icon red" />
              <div>
                <div className="admin-summary-label">Pagos Pendientes</div>
                <div className="admin-summary-value admin-summary-value-danger">{pendingRequests.length + pendingPayments.length}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PageTemplate>
  );
}