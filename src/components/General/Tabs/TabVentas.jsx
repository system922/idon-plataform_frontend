import React from 'react';
import {
  TrendingUp, Calendar, Clock, DollarSign, 
  ShoppingBag, ArrowUp, ArrowDown, 
  BarChart2, Activity, Zap
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
  ComposedChart,
  Area,
  ReferenceLine
} from 'recharts';

function KPICard({ icon: Icon, value, label, change, changeLabel, color }) {
  const isPositive = change >= 0;

  return (
    <div className="summary-card">
      <div className="summary-icon" style={{ background: `${color}15`, color }}>
        <Icon size={24} />
      </div>
      <div className="summary-info">
        <span className="summary-value">{value}</span>
        <span className="summary-label">{label}</span>
        {change !== undefined && (
          <span className="summary-sub" style={{ color: isPositive ? '#34d399' : '#f87171' }}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}% {changeLabel || 'vs anterior'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── TENDENCIA DE VENTAS MEJORADA ──
function SalesTrendChart({ data, xKey, yKey, formatValue, height = 280, color }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        <TrendingUp size={24} />
        <p>No hay datos disponibles</p>
      </div>
    );
  }

  // Calcular promedio para la línea de referencia
  const average = data.reduce((sum, d) => sum + Number(d[yKey] || 0), 0) / data.length;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const isAboveAverage = value > average;
      
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{label}</p>
          <p className="recharts-tooltip-value" style={{ color: color || 'var(--primary)' }}>
            {formatValue ? formatValue(value) : value}
          </p>
          <p style={{ 
            fontSize: 10, 
            color: isAboveAverage ? 'var(--success)' : 'var(--text-muted)',
            marginTop: 2
          }}>
            {isAboveAverage ? '↑ Por encima del promedio' : '↓ Por debajo del promedio'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color || 'var(--primary)'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color || 'var(--primary)'} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(0,0,0,0.06)" 
            vertical={false}
          />
          
          <XAxis 
            dataKey={xKey} 
            tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
          />
          
          <YAxis 
            tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatValue ? formatValue(value) : value}
            width={60}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <ReferenceLine 
            y={average} 
            stroke="var(--text-muted)" 
            strokeDasharray="5 5"
            strokeWidth={1.5}
            label={{ 
              value: 'Promedio', 
              fill: 'var(--text-muted)',
              fontSize: 10,
              position: 'insideBottomRight'
            }}
          />
          
          <Area
            type="monotone"
            dataKey={yKey}
            fill="url(#trendGradient)"
            stroke="none"
          />
          
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color || 'var(--primary)'}
            strokeWidth={3}
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
              r: 7
            }}
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
          <span style={{ 
            display: 'inline-block', 
            width: 20, 
            height: 3, 
            borderRadius: 2,
            background: color || 'var(--primary)'
          }} />
          Ventas
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            display: 'inline-block', 
            width: 20, 
            height: 1.5, 
            borderRadius: 2,
            background: 'var(--text-muted)',
            borderTop: '1.5px dashed var(--text-muted)'
          }} />
          Promedio
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Activity size={14} style={{ color: 'var(--text-muted)' }} />
          Tendencia
        </span>
      </div>
    </div>
  );
}

// ── VENTAS POR DÍA MEJORADA ──
function DailySalesChart({ data, labelKey, valueKey, formatValue, color }) {
  if (data.length === 0) {
    return <div className="empty-chart">No hay datos</div>;
  }

  const maxValue = Math.max(...data.map(item => Number(item[valueKey]) || 0), 1);
  const maxIndex = data.findIndex(d => Number(d[valueKey]) === maxValue);

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
              <Zap size={12} style={{ display: 'inline', marginRight: 4 }} /> Mejor día
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
    return `${color || 'var(--success)'}50`;
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <defs>
              <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color || 'var(--success)'} stopOpacity="0.2" />
                <stop offset="100%" stopColor={color || 'var(--success)'} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(0,0,0,0.06)" 
              vertical={false}
            />
            
            <XAxis 
              dataKey={labelKey} 
              tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
            />
            
            <YAxis 
              tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatValue ? formatValue(value) : value}
              width={60}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey={valueKey}
              fill="url(#dailyGradient)"
              stroke="none"
            />
            
            <Bar 
              dataKey={valueKey} 
              radius={[4, 4, 0, 0]} 
              barSize={32}
            >
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
              dataKey={valueKey}
              stroke={color || 'var(--success)'}
              strokeWidth={2}
              dot={false}
              strokeOpacity={0.3}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 16, 
        marginTop: 8,
        fontSize: 11,
        color: 'var(--text-muted)'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            display: 'inline-block', 
            width: 12, 
            height: 12, 
            borderRadius: 3,
            background: `${color || 'var(--success)'}50`
          }} />
          Ventas
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            display: 'inline-block', 
            width: 12, 
            height: 12, 
            borderRadius: 3,
            background: color || 'var(--success)',
            border: `2px solid ${color || 'var(--success)'}`
          }} />
          Mejor día
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <BarChart2 size={14} style={{ color: 'var(--text-muted)' }} />
          Tendencia
        </span>
      </div>
    </div>
  );
}

// ── VENTAS POR HORA - HEATMAP MEJORADO ──
function HourlySalesChart({ data, labelKey, valueKey, formatValue, color }) {
  if (!data || data.length === 0) {
    return <div className="empty-chart">No hay datos</div>;
  }

  const maxValue = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);

  // Encontrar horas pico
  const sortedData = [...data].sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]));
  const peakHours = sortedData.slice(0, 3).map(d => d[labelKey]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const isPeak = peakHours.includes(label);
      const percentage = ((value / maxValue) * 100).toFixed(0);
      
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{label}</p>
          <p className="recharts-tooltip-value" style={{ color: color || 'var(--primary)' }}>
            {formatValue ? formatValue(value) : value}
          </p>
          {isPeak && (
            <p style={{ 
              fontSize: 11, 
              color: 'var(--warning)',
              marginTop: 4,
              fontWeight: 'var(--font-weight-medium)'
            }}>
              <Zap size={12} style={{ display: 'inline', marginRight: 4 }} /> Hora pico
            </p>
          )}
          <p style={{ 
            fontSize: 10, 
            color: 'var(--text-muted)',
            marginTop: 2
          }}>
            {percentage}% del total diario
          </p>
        </div>
      );
    }
    return null;
  };

  const getIntensityColor = (value) => {
    const intensity = value / maxValue;
    const baseColor = color || 'var(--primary)';
    const opacity = Math.max(intensity * 0.8, 0.1);
    return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(0,0,0,0.06)" 
              vertical={false}
            />
            
            <XAxis 
              dataKey={labelKey} 
              tick={{ fill: 'var(--text-primary)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
            />
            
            <YAxis 
              tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatValue ? formatValue(value) : value}
              width={60}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Bar 
              dataKey={valueKey} 
              radius={[2, 2, 0, 0]}
              barSize={24}
            >
              {data.map((entry, index) => {
                const value = Number(entry[valueKey]) || 0;
                const isPeak = peakHours.includes(entry[labelKey]);
                return (
                  <Cell 
                    key={`cell-${index}`}
                    fill={isPeak ? (color || 'var(--primary)') : getIntensityColor(value)}
                    stroke={isPeak ? (color || 'var(--primary)') : 'transparent'}
                    strokeWidth={2}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
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
          <span style={{ 
            display: 'inline-block', 
            width: 12, 
            height: 12, 
            borderRadius: 3,
            background: `${color || 'var(--primary)'}`
          }} />
          Hora pico
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            display: 'inline-block', 
            width: 12, 
            height: 12, 
            borderRadius: 3,
            background: `${color || 'var(--primary)'}40`
          }} />
          Actividad media
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ 
            display: 'inline-block', 
            width: 12, 
            height: 12, 
            borderRadius: 3,
            background: `${color || 'var(--primary)'}10`
          }} />
          Baja actividad
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={14} style={{ color: 'var(--text-muted)' }} />
          Distribución horaria
        </span>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──
export default function TabVentas({ data, formatUtils, COLORS, timeRange, setTimeRange }) {
  const { summary, monthlyTrend, salesByDay, salesByHour } = data;

  const monthlyData = monthlyTrend.map(m => ({
    label: formatUtils.monthName(m.month),
    value: Number(m.total_sales) || 0
  }));

  const dayData = salesByDay.map(d => ({
    label: formatUtils.dayName(d.day_name),
    value: Number(d.total_sales) || 0
  }));

  const hourData = salesByHour.map(h => ({
    label: `${String(h.hour).padStart(2, '0')}:00`,
    value: Number(h.total_sales) || 0
  }));

  return (
    <>
      {summary && (
        <div className="analytics-summary-grid">
          <KPICard
            icon={DollarSign}
            value={formatUtils.currency(summary.total_revenue)}
            label="Ventas totales"
            change={12}
            color={COLORS.success}
          />
          <KPICard
            icon={ShoppingBag}
            value={formatUtils.number(summary.total_orders)}
            label="Órdenes"
            change={15}
            color={COLORS.info}
          />
          <KPICard
            icon={DollarSign}
            value={formatUtils.currency(summary.avg_ticket)}
            label="Ticket promedio"
            change={-5}
            color={COLORS.warning}
          />
        </div>
      )}

      {/* ── TENDENCIA DE VENTAS ── */}
      <div className="analytics-section">
        <div className="section-header">
          <h3><TrendingUp size={18} /> Tendencia de Ventas</h3>
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
                  background: timeRange === filter ? 'rgba(104,66,254,0.2)' : 'transparent',
                  color: timeRange === filter ? '#8b5cf6' : 'rgba(255,255,255,0.4)',
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
        <SalesTrendChart
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
            <h3><Calendar size={18} /> Ventas por Día</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Distribución semanal</span>
          </div>
          <DailySalesChart
            data={dayData}
            labelKey="label"
            valueKey="value"
            formatValue={formatUtils.currency}
            color={COLORS.success}
          />
        </div>

        <div className="analytics-section half">
          <div className="section-header">
            <h3><Clock size={18} /> Ventas por Hora</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Heatmap de actividad</span>
          </div>
          <HourlySalesChart
            data={hourData}
            labelKey="label"
            valueKey="value"
            formatValue={formatUtils.currency}
            color={COLORS.primary}
          />
        </div>
      </div>
    </>
  );
}