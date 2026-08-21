import React from 'react';
import {
  DollarSign, UserCheck, ShoppingBag, CreditCard,
  Award, TrendingUp, Zap, Clock, Calendar, Star,
  ArrowUp, ArrowDown, Users, PieChart, Repeat,
  Target, User, PlusCircle, 
  Trophy, Award as AwardIcon, 
  Hash, BarChart2, Circle
} from 'react-feather';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart as RePieChart,
  Pie,
  Legend,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts';

// ── SUBCOMPONENTES ──
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
          <span className={`summary-sub`} style={{ color: isPositive ? '#34d399' : '#f87171' }}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}% {changeLabel || (isPositive ? 'vs anterior' : 'vs anterior')}
          </span>
        )}
      </div>
    </div>
  );
}

// ── LINE CHART CON RECHARTS ──
function CustomLineChart({ data, xKey, yKey, formatValue, height = 280, color }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        <TrendingUp size={24} />
        <p>No hay datos disponibles</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{label}</p>
          <p className="recharts-tooltip-value" style={{ color: color || 'var(--primary)' }}>
            {formatValue ? formatValue(payload[0].value) : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(0,0,0,0.06)" 
            vertical={false}
          />
          <XAxis 
            dataKey={xKey} 
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatValue ? formatValue(value) : value}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color || 'var(--primary)'}
            strokeWidth={2.5}
            dot={{
              fill: color || 'var(--primary)',
              stroke: 'var(--bg-card)',
              strokeWidth: 2,
              r: 4
            }}
            activeDot={{
              fill: color || 'var(--primary)',
              stroke: 'var(--bg-card)',
              strokeWidth: 2,
              r: 6
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── TOP CLIENTES MEJORADO ──
function TopCustomersChart({ data, labelKey, valueKey, formatValue, color, onSelectCustomer }) {
  if (data.length === 0) {
    return (
      <div className="empty-chart">
        <Users size={24} />
        <p>No hay clientes registrados</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(item => Number(item[valueKey]) || 0));

  // Iconos para los top 3 - usando Trophy para el top 1
  const getRankIcon = (index) => {
    switch(index) {
      case 0: return <DollarSign size={14} style={{ color: '#fbbf24' }} />;
      case 1: return <AwardIcon size={14} style={{ color: '#94a3b8' }} />;
      case 2: return <AwardIcon size={14} style={{ color: '#cd7f32' }} />;
      default: return <Hash size={14} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  // Colores para los top 3
  const getRankColor = (index) => {
    switch(index) {
      case 0: return '#fbbf24'; // Oro
      case 1: return '#94a3b8'; // Plata
      case 2: return '#cd7f32'; // Bronce
      default: return color || 'var(--primary)';
    }
  };

  // Badge de posición
  const getRankBadge = (index) => {
    switch(index) {
      case 0: return '#1';
      case 1: return '#2';
      case 2: return '#3';
      default: return `#${index + 1}`;
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const index = data.findIndex(d => d[labelKey] === label);
      const rankColor = getRankColor(index);
      const rankIcon = getRankIcon(index);
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">
            {index < 3 && rankIcon} {label}
          </p>
          <p className="recharts-tooltip-value" style={{ color: rankColor }}>
            {formatValue ? formatValue(payload[0].value) : payload[0].value}
          </p>
          {index < 3 && (
            <p style={{ 
              fontSize: 10, 
              color: 'var(--text-muted)',
              marginTop: 2
            }}>
              Top {index + 1} cliente
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(0,0,0,0.06)" 
              horizontal={false}
            />
            <XAxis 
              type="number" 
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
              tickFormatter={(value) => formatValue ? formatValue(value) : value}
            />
            <YAxis 
              type="category" 
              dataKey={labelKey}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={60}
              tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey={valueKey} 
              radius={[0, 4, 4, 0]}
              onClick={(data) => onSelectCustomer && onSelectCustomer(data)}
              cursor="pointer"
            >
              {data.map((entry, index) => {
                const rankColor = getRankColor(index);
                const isTop3 = index < 3;
                return (
                  <Cell 
                    key={`cell-${index}`}
                    fill={isTop3 ? rankColor : `${color || 'var(--primary)'}60`}
                    stroke={isTop3 ? rankColor : 'transparent'}
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leyenda de ranking */}
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
          <AwardIcon size={14} style={{ color: '#fbbf24' }} />
          Top 1
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <AwardIcon size={14} style={{ color: '#94a3b8' }} />
          Top 2
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <AwardIcon size={14} style={{ color: '#cd7f32' }} />
          Top 3
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            display: 'inline-block', 
            width: 12, 
            height: 12, 
            borderRadius: 3,
            background: `${color || 'var(--primary)'}60`
          }} />
          Resto
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Users size={14} style={{ color: 'var(--text-muted)' }} />
          Click para ver detalle
        </span>
      </div>
    </div>
  );
}

// ── DOUGHNUT CHART CON RECHARTS ──
function CustomDoughnutChart({ data, colors }) {
  if (!data || data.length === 0) {
    return <div className="empty-chart">No hay datos</div>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const percentage = ((value / total) * 100).toFixed(0);
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{payload[0].name}</p>
          <p className="recharts-tooltip-value" style={{ color: payload[0].color }}>
            {value} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer>
        <RePieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            nameKey="label"
            stroke="var(--bg-card)"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors?.[index] || 'var(--primary)'}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            align="center"
            iconType="circle"
            iconSize={8}
            formatter={(value, entry) => {
              const item = data.find(d => d.label === value);
              const percentage = item ? ((item.value / total) * 100).toFixed(0) : 0;
              return (
                <span style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: 12,
                  marginRight: 12 
                }}>
                  {value} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({percentage}%)</span>
                </span>
              );
            }}
          />
        </RePieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── VENTAS POR DÍA ──
function DailySalesChart({ data, xKey, yKey, formatValue, height = 200, color }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        <Calendar size={24} />
        <p>No hay datos disponibles</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Number(d[yKey]) || 0));
  const maxIndex = data.findIndex(d => Number(d[yKey]) === maxValue);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const percentage = ((value / maxValue) * 100).toFixed(0);
      const isMax = value === maxValue;
      
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{label}</p>
          <p className="recharts-tooltip-value" style={{ color: color || 'var(--success)' }}>
            {formatValue ? formatValue(value) : value}
          </p>
          {isMax && (
            <p style={{ 
              fontSize: 11, 
              color: 'var(--success)',
              marginTop: 4,
              fontWeight: 'var(--font-weight-medium)'
            }}>
              <DollarSign size={12} style={{ display: 'inline', marginRight: 4 }} /> Mejor día
            </p>
          )}
          <p style={{ 
            fontSize: 10, 
            color: 'var(--text-muted)',
            marginTop: 2
          }}>
            {percentage}% del total semanal
          </p>
        </div>
      );
    }
    return null;
  };

  const getBarColor = (index) => {
    if (index === maxIndex) {
      return color || 'var(--success)';
    }
    return `${color || 'var(--success)'}60`;
  };

  return (
    <div style={{ width: '100%', height: height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color || 'var(--success)'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color || 'var(--success)'} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(0,0,0,0.06)" 
            vertical={false}
          />
          
          <XAxis 
            dataKey={xKey} 
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
          />
          
          <YAxis 
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatValue ? formatValue(value) : value}
            width={60}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey={yKey}
            fill="url(#dailyGradient)"
            stroke="none"
          />
          
          <Bar dataKey={yKey} radius={[4, 4, 0, 0]} barSize={32}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={getBarColor(index)}
                stroke={index === maxIndex ? (color || 'var(--success)') : 'transparent'}
                strokeWidth={2}
              />
            ))}
          </Bar>
          
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color || 'var(--success)'}
            strokeWidth={2}
            dot={false}
            strokeOpacity={0.4}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── INSIGHT CARD ──
function InsightCard({ icon: Icon, text, type = 'info' }) {
  const colors = {
    info: { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.15)' },
    success: { bg: 'rgba(16,185,129,0.1)', color: '#34d399', border: 'rgba(16,185,129,0.15)' },
    warning: { bg: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: 'rgba(245,158,11,0.15)' },
    danger: { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.15)' }
  };

  const style = colors[type] || colors.info;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 14px',
      borderRadius: '8px',
      background: style.bg,
      border: `1px solid ${style.border}`,
      color: style.color,
      fontSize: '13px'
    }}>
      <Icon size={16} />
      <span>{text}</span>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──
export default function TabResumen({ data, formatUtils, COLORS, timeRange, setTimeRange, onSelectCustomer }) {
  const { summary, segments, topCustomers, salesByDay, monthlyTrend, clv } = data;

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

  const doughnutData = sortedSegments.map(seg => ({
    label: segmentConfigs[seg.segment]?.label || seg.segment,
    value: Number(seg.count) || 0
  }));

  const doughnutColors = sortedSegments.map(seg =>
    segmentConfigs[seg.segment]?.color || COLORS.primary
  );

  const monthlyData = monthlyTrend.map(m => ({
    label: formatUtils.monthName(m.month),
    value: Number(m.total_sales) || 0
  }));

  const dayData = salesByDay.map(d => ({
    label: formatUtils.dayName(d.day_name),
    value: Number(d.total_sales) || 0
  }));

  const topCustomersForChart = topCustomers.slice(0, 5).map(c => ({
    name: c.name || 'Cliente',
    value: Number(c.total_spent) || 0,
    ...c
  }));

  return (
    <>
      {/* ── KPIs ── */}
      {summary && (
        <div className="analytics-summary-grid">
          <KPICard
            icon={DollarSign}
            value={formatUtils.currency(summary.total_revenue)}
            label="Ventas del período"
            change={12}
            changeLabel="vs mes anterior"
            color={COLORS.success}
          />
          <KPICard
            icon={UserCheck}
            value={formatUtils.number(summary.active_customers)}
            label="Clientes activos"
            change={8}
            changeLabel="vs mes anterior"
            color={COLORS.primary}
          />
          <KPICard
            icon={ShoppingBag}
            value={formatUtils.number(summary.total_orders)}
            label="Órdenes"
            change={15}
            changeLabel="vs mes anterior"
            color={COLORS.info}
          />
          <KPICard
            icon={CreditCard}
            value={formatUtils.currency(summary.avg_ticket)}
            label="Ticket promedio"
            change={-5}
            changeLabel="vs mes anterior"
            color={COLORS.warning}
          />
          <KPICard
            icon={UserCheck}
            value={summary.total_customers > 0 ?
              `${((summary.active_customers / summary.total_customers) * 100).toFixed(0)}%` :
              '0%'
            }
            label="Retención"
            color={COLORS.success}
          />
        </div>
      )}

      {/* ── GRÁFICO PRINCIPAL ── */}
      <div className="analytics-section">
        <div className="section-header">
          <h3><TrendingUp size={18} /> Ventas en el tiempo</h3>
          <div className="chart-filters" style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '6px' }}>
            {['week', 'month', 'quarter', 'year'].map(filter => (
              <button
                key={filter}
                className={`filter-btn ${timeRange === filter ? 'active' : ''}`}
                onClick={() => setTimeRange(filter)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  background: timeRange === filter ? 'var(--bg-primary)' : 'transparent',
                  color: timeRange === filter ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {filter === 'week' ? '7 días' : filter === 'month' ? '30 días' : filter === 'quarter' ? '3 meses' : 'Año'}
              </button>
            ))}
          </div>
        </div>
        <CustomLineChart
          data={monthlyData}
          xKey="label"
          yKey="value"
          formatValue={formatUtils.currency}
          height={280}
          color={COLORS.primary}
        />
      </div>

      {/* ── DOS COLUMNAS ── */}
      <div className="analytics-two-columns">
        <div className="analytics-section half">
          <div className="section-header">
            <h3><Award size={18} /> Top Clientes</h3>
            <span className="card-subtitle" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Por facturación</span>
          </div>
          <TopCustomersChart
            data={topCustomersForChart}
            labelKey="name"
            valueKey="value"
            formatValue={formatUtils.currency}
            color={COLORS.primary}
            onSelectCustomer={onSelectCustomer}
          />
        </div>

        <div className="analytics-section half">
          <div className="section-header">
            <h3><PieChart size={18} /> Segmentación</h3>
            <span className="card-subtitle" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Distribución de clientes</span>
          </div>
          <CustomDoughnutChart data={doughnutData} colors={doughnutColors} />
        </div>
      </div>

      {/* ── SEGUNDA FILA DE DOS COLUMNAS ── */}
      <div className="analytics-two-columns">
        <div className="analytics-section half">
          <div className="section-header">
            <h3><Calendar size={18} /> Ventas por Día</h3>
            <span className="card-subtitle" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Distribución semanal</span>
          </div>
          <DailySalesChart
            data={dayData}
            xKey="label"
            yKey="value"
            formatValue={formatUtils.currency}
            height={200}
            color={COLORS.success}
          />
        </div>

        {clv && (
          <div className="analytics-section half">
            <div className="section-header">
              <h3><Target size={18} /> Valor de Vida del Cliente</h3>
            </div>
            <div className="clv-cards">
              <div className="clv-card">
                <span className="clv-value">{formatUtils.currency(clv.avg_clv)}</span>
                <span className="clv-label">CLV Promedio</span>
              </div>
              <div className="clv-card">
                <span className="clv-value">{formatUtils.currency(clv.max_clv)}</span>
                <span className="clv-label">Mayor cliente</span>
              </div>
              <div className="clv-card" style={{ gridColumn: '1 / -1' }}>
                <span className="clv-value">{formatUtils.currency(clv.avg_projected_annual)}</span>
                <span className="clv-label">Valor anual proyectado</span>
                <div style={{ marginTop: '8px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min((clv.avg_clv / 100) * 100, 100)}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.success})`,
                    borderRadius: '2px',
                    transition: 'width 0.8s ease'
                  }} />
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>Meta $100</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}