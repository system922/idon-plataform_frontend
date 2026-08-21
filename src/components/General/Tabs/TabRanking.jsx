import React, { useState } from 'react';
import { 
  Award, Search, ChevronDown, ChevronUp, Users,
  TrendingUp, DollarSign, ShoppingBag, Target,
  BarChart2, PieChart as FeatherPieChart
} from 'react-feather';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line
} from 'recharts';

// ── COMPONENTE: GRÁFICO DE BARRAS TOP CLIENTES ──
function TopCustomersBarChart({ data, formatUtils, onSelectCustomer }) {
  if (!data || data.length === 0) {
    return <div className="empty-chart">No hay datos</div>;
  }

  const chartData = data.slice(0, 10).map((c, idx) => ({
    name: c.name || 'Cliente',
    value: Number(c.total_spent) || 0,
    orders: Number(c.total_orders) || 0,
    id: c.id,
    fullData: c,
    isTop3: idx < 3
  }));

  const maxValue = Math.max(...chartData.map(d => d.value), 1);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = chartData.find(d => d.name === label);
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{label}</p>
          <p className="recharts-tooltip-value" style={{ color: 'var(--primary)' }}>
            {formatUtils.currency(item?.value || 0)}
          </p>
          <p className="recharts-tooltip-sub">
            <ShoppingBag size={14} style={{ display: 'inline', marginRight: 4 }} />
            {item?.orders || 0} órdenes
          </p>
        </div>
      );
    }
    return null;
  };

  const rankColors = ['#fbbf24', '#94a3b8', '#cd7f32'];

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'var(--text-primary)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatUtils.currency(value)}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
          <Bar 
            dataKey="value" 
            radius={[4, 4, 0, 0]}
            onClick={(data) => onSelectCustomer(data.fullData)}
            cursor="pointer"
          >
            {chartData.map((entry, index) => {
              const isTop3 = index < 3;
              return (
                <Cell 
                  key={`cell-${index}`}
                  fill={isTop3 ? rankColors[index] : 'var(--primary)'}
                  opacity={isTop3 ? 1 : 0.6}
                  stroke={isTop3 ? rankColors[index] : 'transparent'}
                  strokeWidth={2}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 16, 
        marginTop: 8,
        fontSize: 11,
        color: 'var(--text-muted)',
        flexWrap: 'wrap'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#fbbf24' }} />
          Top 1
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#94a3b8' }} />
          Top 2
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#cd7f32' }} />
          Top 3
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: 'var(--primary)', opacity: 0.6 }} />
          Resto
        </span>
      </div>
    </div>
  );
}

// ── COMPONENTE: GRÁFICO DE CONCENTRACIÓN ──
function ConcentrationChart({ data, formatUtils }) {
  if (!data || data.length === 0) {
    return <div className="empty-chart">No hay datos</div>;
  }

  // Calcular concentración de ingresos
  const totalSpent = data.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0);
  let cumulative = 0;
  const concentrationData = data.slice(0, 20).map((c, idx) => {
    const spent = Number(c.total_spent) || 0;
    cumulative += spent;
    return {
      name: c.name || `Cliente ${idx + 1}`,
      individual: (spent / totalSpent) * 100,
      cumulative: (cumulative / totalSpent) * 100
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{label}</p>
          <p className="recharts-tooltip-value" style={{ color: 'var(--primary)' }}>
            Individual: {item.individual.toFixed(1)}%
          </p>
          <p className="recharts-tooltip-sub">
            Acumulado: {item.cumulative.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <ComposedChart data={concentrationData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
            interval={2}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
            width={40}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
          <Bar 
            yAxisId="left"
            dataKey="individual" 
            fill="var(--primary)" 
            opacity={0.6}
            radius={[2, 2, 0, 0]}
            barSize={20}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="cumulative" 
            stroke="var(--warning)" 
            strokeWidth={3}
            dot={{ fill: 'var(--warning)', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 16, 
        marginTop: 8,
        fontSize: 11,
        color: 'var(--text-muted)'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 20, height: 3, borderRadius: 2, background: 'var(--primary)', opacity: 0.6 }} />
          % Individual
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 20, height: 3, borderRadius: 2, background: 'var(--warning)' }} />
          % Acumulado
        </span>
      </div>
    </div>
  );
}

// ── COMPONENTE: DISTRIBUCIÓN POR RANGOS ──
function DistributionChart({ data, formatUtils }) {
  if (!data || data.length === 0) {
    return <div className="empty-chart">No hay datos</div>;
  }

  // Crear rangos de gasto
  const ranges = [
    { label: '$0 - $100', min: 0, max: 100 },
    { label: '$100 - $500', min: 100, max: 500 },
    { label: '$500 - $1,000', min: 500, max: 1000 },
    { label: '$1,000 - $5,000', min: 1000, max: 5000 },
    { label: '$5,000+', min: 5000, max: Infinity }
  ];

  const distributionData = ranges.map(range => {
    const count = data.filter(c => {
      const spent = Number(c.total_spent) || 0;
      return spent >= range.min && spent < range.max;
    }).length;
    return {
      name: range.label,
      value: count,
      percentage: (count / data.length) * 100
    };
  });

  const chartColors = ['#8b5cf6', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = distributionData.find(d => d.name === label);
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{label}</p>
          <p className="recharts-tooltip-value" style={{ color: 'var(--primary)' }}>
            {item?.value || 0} clientes
          </p>
          <p className="recharts-tooltip-sub">
            {item?.percentage.toFixed(1) || 0}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={distributionData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
            stroke="var(--bg-card)"
            strokeWidth={2}
            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {distributionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
          <Legend 
            verticalAlign="bottom" 
            align="center"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => (
              <span style={{ color: 'var(--text-secondary)', fontSize: 10, marginRight: 12 }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──
export default function TabRanking({ data, formatUtils, COLORS, onSelectCustomer }) {
  const { topCustomers } = data;
  const [sortBy, setSortBy] = useState('total_spent');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'charts'

  const sortedCustomers = [...topCustomers]
    .filter(c =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.document_number?.includes(searchTerm)
    )
    .sort((a, b) => {
      const aVal = Number(a[sortBy]) || 0;
      const bVal = Number(b[sortBy]) || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
  };

  const medals = ['🥇', '🥈', '🥉'];
  const totalSpent = sortedCustomers.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0);
  const totalOrders = sortedCustomers.reduce((sum, c) => sum + (Number(c.total_orders) || 0), 0);

  return (
    <>
      {/* ── KPIs ── */}
      <div className="analytics-summary-grid">
        <div className="summary-card">
          <div className="summary-icon" style={{ background: `${COLORS.primary}15`, color: COLORS.primary }}>
            <Users size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{sortedCustomers.length}</span>
            <span className="summary-label">Clientes en ranking</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: `${COLORS.success}15`, color: COLORS.success }}>
            <DollarSign size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{formatUtils.currency(totalSpent)}</span>
            <span className="summary-label">Total facturado</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: `${COLORS.info}15`, color: COLORS.info }}>
            <ShoppingBag size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{formatUtils.number(totalOrders)}</span>
            <span className="summary-label">Total órdenes</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: `${COLORS.warning}15`, color: COLORS.warning }}>
            <TrendingUp size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">
              {sortedCustomers.length > 0 ? formatUtils.currency(totalSpent / sortedCustomers.length) : '$0'}
            </span>
            <span className="summary-label">Promedio por cliente</span>
          </div>
        </div>
      </div>

      {/* ── CONTROLES ── */}
      <div className="analytics-section" style={{ marginBottom: '20px' }}>
        <div className="section-header">
          <h3><Award size={18} /> Ranking de Clientes</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: viewMode === 'table' ? 'var(--primary-bg)' : 'transparent',
                color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Tabla
            </button>
            <button
              onClick={() => setViewMode('charts')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: viewMode === 'charts' ? 'var(--primary-bg)' : 'transparent',
                color: viewMode === 'charts' ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Gráficos
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── GRÁFICOS ── */}
      {viewMode === 'charts' && (
        <div className="analytics-two-columns">
          <div className="analytics-section half">
            <div className="section-header">
              <h3><BarChart2 size={18} /> Top Clientes</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Por facturación
              </span>
            </div>
            <TopCustomersBarChart 
              data={sortedCustomers}
              formatUtils={formatUtils}
              onSelectCustomer={onSelectCustomer}
            />
          </div>

          <div className="analytics-section half">
            <div className="section-header">
              <h3><FeatherPieChart size={18} /> Distribución por Rango</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Niveles de gasto
              </span>
            </div>
            <DistributionChart 
              data={sortedCustomers}
              formatUtils={formatUtils}
            />
          </div>
        </div>
      )}

      {/* ── TABLA ── */}
      {(viewMode === 'table' || sortedCustomers.length < 5) && (
        <div className="analytics-section">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, width: '50px' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>Cliente</th>
                  <th
                    style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => handleSort('total_spent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      Total Gastado <SortIcon field="total_spent" />
                    </div>
                  </th>
                  <th
                    style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => handleSort('total_orders')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      Órdenes <SortIcon field="total_orders" />
                    </div>
                  </th>
                  <th
                    style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => handleSort('avg_ticket')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      Ticket Promedio <SortIcon field="avg_ticket" />
                    </div>
                  </th>
                  <th style={{ textAlign: 'right', padding: '10px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {sortedCustomers.slice(0, 20).map((customer, idx) => {
                  const medal = idx < 3 ? medals[idx] : `#${idx + 1}`;
                  const maxSpent = sortedCustomers.length > 0 ? Math.max(...sortedCustomers.map(c => Number(c.total_spent) || 0)) : 0;
                  const spentPercentage = maxSpent > 0 ? ((Number(customer.total_spent) / maxSpent) * 100) : 0;

                  return (
                    <tr
                      key={customer.id || `rank-${idx}`}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      onClick={() => onSelectCustomer(customer)}
                    >
                      <td style={{ padding: '10px 8px', fontSize: '16px', textAlign: 'center' }}>
                        {medal}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--primary-bg)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '13px',
                            flexShrink: 0
                          }}>
                            {customer.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '14px' }}>
                              {customer.name || 'Cliente'}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                              {customer.document_number || 'Sin documento'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatUtils.currency(customer.total_spent)}
                        </div>
                        <div style={{ width: '80px', marginLeft: 'auto', marginTop: '4px', height: '3px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(spentPercentage, 100)}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
                            borderRadius: '2px'
                          }} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {formatUtils.number(customer.total_orders)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {formatUtils.currency(customer.avg_ticket)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <button
                          style={{
                            background: 'var(--primary-bg)',
                            border: 'none',
                            color: 'var(--primary)',
                            padding: '4px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-bg)'}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCustomer(customer);
                          }}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {sortedCustomers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                <Users size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>No se encontraron clientes</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESUMEN TOP 3 ── */}
      {sortedCustomers.length > 0 && (
        <div className="analytics-two-columns" style={{ marginTop: '20px' }}>
          <div className="analytics-section half">
            <div className="section-header">
              <h3><Award size={18} /> Top 3 Clientes</h3>
            </div>
            {sortedCustomers.slice(0, 3).map((customer, idx) => {
              const rankColors = ['#fbbf24', '#94a3b8', '#cd7f32'];
              return (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 0',
                  borderBottom: idx < 2 ? '1px solid var(--border-color)' : 'none'
                }}>
                  <div style={{ 
                    fontSize: '24px',
                    width: '40px',
                    textAlign: 'center'
                  }}>
                    {medals[idx]}
                  </div>
                  <div style={{ 
                    flex: 1,
                    paddingLeft: '8px',
                    borderLeft: `3px solid ${rankColors[idx]}`
                  }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {customer.name || 'Cliente'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {formatUtils.currency(customer.total_spent)} gastados
                    </div>
                  </div>
                  <div style={{ 
                    color: rankColors[idx],
                    fontWeight: 600,
                    background: `${rankColors[idx]}15`,
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '13px'
                  }}>
                    {formatUtils.number(customer.total_orders)} órdenes
                  </div>
                </div>
              );
            })}
          </div>

          <div className="analytics-section half">
            <div className="section-header">
              <h3><Target size={18} /> Resumen</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {sortedCustomers.length}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Clientes totales</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatUtils.currency(totalSpent)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total facturado</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatUtils.currency(totalSpent / (sortedCustomers.length || 1))}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Promedio por cliente</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatUtils.number(totalOrders)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total órdenes</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}