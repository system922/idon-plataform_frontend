import React from 'react';
import { 
  Users, UserCheck, Award, Star, User, PlusCircle, 
  UserPlus, Repeat, Calendar, TrendingUp, 
  Target, PieChart as FeatherPieChart, 
  Activity, Zap, Hash, DollarSign, ShoppingBag
} from 'react-feather';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

function KPICard({ icon: Icon, value, label, subtitle, change, changeLabel, color }) {
  const hasChange = change !== undefined && change !== null;
  const isPositive = hasChange ? change >= 0 : false;

  return (
    <div className="summary-card">
      <div className="summary-icon" style={{ background: `${color}15`, color }}>
        <Icon size={24} />
      </div>
      <div className="summary-info">
        <span className="summary-value">{value}</span>
        <span className="summary-label">{label}</span>
        {subtitle && <span className="summary-sub">{subtitle}</span>}
        {hasChange && (
          <span className="summary-sub" style={{ color: isPositive ? '#34d399' : '#f87171' }}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}% {changeLabel || 'vs mes anterior'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── GRÁFICO 1: DONA DE SEGMENTACIÓN ──
function SegmentDoughnutChart({ data, colors, total }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        <FeatherPieChart size={24} />
        <p>No hay datos de segmentación</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const percentage = ((value / total) * 100).toFixed(0);
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{payload[0].name}</p>
          <p className="recharts-tooltip-value" style={{ color: payload[0].color }}>
            {value} clientes ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <RePieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            nameKey="label"
            stroke="var(--bg-card)"
            strokeWidth={3}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors?.[index] || 'var(--primary)'}
                style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            align="center"
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value, entry) => {
              const item = data.find(d => d.label === value);
              const percentage = item ? ((item.value / total) * 100).toFixed(0) : 0;
              return (
                <span style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: 12,
                  marginRight: 16,
                  fontWeight: 500
                }}>
                  {value} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({percentage}%)</span>
                </span>
              );
            }}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── GRÁFICO 2: TOP CLIENTES (BARRAS HORIZONTALES) ──
function TopCustomersBarChart({ customers, formatUtils, onSelectCustomer }) {
  if (!customers || customers.length === 0) {
    return (
      <div className="empty-chart">
        <Users size={24} />
        <p>No hay clientes registrados</p>
      </div>
    );
  }

  const data = customers.slice(0, 8).map((c, idx) => ({
    name: c.name || 'Cliente',
    value: Number(c.total_spent) || 0,
    orders: Number(c.total_orders) || 0,
    id: c.id,
    fullData: c
  }));

  const maxValue = Math.max(...data.map(d => d.value), 1);

  // Colores para el top 3
  const rankColors = ['#fbbf24', '#94a3b8', '#cd7f32'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = data.find(d => d.name === label);
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{label}</p>
          <p className="recharts-tooltip-value" style={{ color: 'var(--primary)' }}>
            {formatUtils.currency(item?.value || 0)}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <ShoppingBag size={12} style={{ display: 'inline', marginRight: 4 }} />
            {item?.orders || 0} órdenes
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
          onClick={(data) => {
            if (data && data.activePayload && data.activePayload.length) {
              const item = data.activePayload[0].payload;
              if (item && item.fullData && onSelectCustomer) {
                onSelectCustomer(item.fullData);
              }
            }
          }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(0,0,0,0.06)" 
            horizontal={false}
          />
          <XAxis 
            type="number" 
            tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
            tickFormatter={(value) => formatUtils.currency(value)}
          />
          <YAxis 
            type="category" 
            dataKey="name"
            tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={80}
            tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="value" 
            radius={[0, 4, 4, 0]}
            cursor="pointer"
          >
            {data.map((entry, index) => {
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
        gap: 20, 
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Zap size={14} style={{ color: 'var(--text-muted)' }} />
          Click para ver detalle
        </span>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──
export default function TabClientes({ data, formatUtils, COLORS, onSelectCustomer }) {
  const { summary, segments, topCustomers } = data;

  const segmentConfigs = {
    vip: { color: COLORS.purple, label: 'VIP', icon: Award },
    frecuente: { color: COLORS.success, label: 'Frecuente', icon: Star },
    ocasional: { color: COLORS.info, label: 'Ocasional', icon: User },
    nuevo: { color: COLORS.warning, label: 'Nuevo', icon: PlusCircle }
  };

  const segmentOrder = ['vip', 'frecuente', 'ocasional', 'nuevo'];
  const sortedSegments = [...segments].sort((a, b) =>
    segmentOrder.indexOf(a.segment) - segmentOrder.indexOf(b.segment)
  );

  const segmentChartData = sortedSegments.map(seg => ({
    label: segmentConfigs[seg.segment]?.label || seg.segment,
    value: Number(seg.count) || 0
  }));

  const segmentChartColors = sortedSegments.map(seg =>
    segmentConfigs[seg.segment]?.color || COLORS.primary
  );

  const totalSegments = segmentChartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <>
      {/* ── KPIs ── */}
      {summary && (
        <div className="analytics-summary-grid">
          <KPICard
            icon={Users}
            value={formatUtils.number(summary.total_customers)}
            label="Total Clientes"
            change={8}
            changeLabel="vs mes anterior"
            color={COLORS.primary}
          />
          <KPICard
            icon={UserCheck}
            value={formatUtils.number(summary.active_customers)}
            label="Clientes Activos"
            subtitle={`${((summary.active_customers / summary.total_customers) * 100).toFixed(0)}% del total`}
            change={5}
            changeLabel="vs mes anterior"
            color={COLORS.success}
          />
          <KPICard
            icon={UserPlus}
            value={formatUtils.number(summary.new_customers || 0)}
            label="Nuevos Clientes"
            change={12}
            changeLabel="vs mes anterior"
            color={COLORS.info}
          />
          <KPICard
            icon={Repeat}
            value={summary.total_customers > 0 ?
              `${((summary.active_customers / summary.total_customers) * 100).toFixed(0)}%` :
              '0%'
            }
            label="Tasa de Retención"
            change={3}
            changeLabel="vs mes anterior"
            color={COLORS.purple}
          />
        </div>
      )}

      {/* ── DOS GRÁFICOS ── */}
      <div className="analytics-two-columns">
        {/* GRÁFICO 1: Segmentación */}
        <div className="analytics-section half">
          <div className="section-header">
            <h3><FeatherPieChart size={18} /> Segmentación</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <Activity size={14} style={{ display: 'inline', marginRight: 4 }} />
              {totalSegments} clientes
            </span>
          </div>
          <SegmentDoughnutChart 
            data={segmentChartData} 
            colors={segmentChartColors}
            total={totalSegments}
          />
        </div>

        {/* GRÁFICO 2: Top Clientes */}
        <div className="analytics-section half">
          <div className="section-header">
            <h3><Target size={18} /> Top Clientes</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              <DollarSign size={14} style={{ display: 'inline', marginRight: 4 }} />
              Por facturación
            </span>
          </div>
          <TopCustomersBarChart 
            customers={topCustomers}
            formatUtils={formatUtils}
            onSelectCustomer={onSelectCustomer}
          />
        </div>
      </div>
    </>
  );
}