import React from 'react';
import { 
  PieChart as FeatherPieChart, Award, Star, User, PlusCircle, 
  Users, Target, TrendingUp, BarChart2, Activity, Zap
} from 'react-feather';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Line,
  Area,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

// ── COMPONENTE: DONA DE SEGMENTACIÓN ──
function SegmentDoughnutChart({ data, colors, total }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-chart">
        <FeatherPieChart size={24} />
        <p>No hay datos</p>
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
            {value} clientes
          </p>
          <p className="recharts-tooltip-sub">{percentage}% del total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <defs>
            {data.map((entry, index) => (
              <radialGradient key={`grad-${index}`} id={`segment-grad-${index}`}>
                <stop offset="0%" stopColor={colors?.[index] || 'var(--primary)'} stopOpacity="0.9" />
                <stop offset="100%" stopColor={colors?.[index] || 'var(--primary)'} stopOpacity="0.5" />
              </radialGradient>
            ))}
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
            dataKey="value"
            nameKey="label"
            stroke="var(--bg-card)"
            strokeWidth={3}
            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
              const x = cx + radius * 0.7 * Math.cos(-midAngle * Math.PI / 180);
              const y = cy + radius * 0.7 * Math.sin(-midAngle * Math.PI / 180);
              return (
                <text 
                  x={x} 
                  y={y} 
                  fill="var(--text-primary)" 
                  textAnchor="middle" 
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight="bold"
                >
                  {`${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#segment-grad-${index})`}
                stroke={colors?.[index] || 'var(--primary)'}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
          <Legend 
            verticalAlign="bottom" 
            align="center"
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => {
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── COMPONENTE: RADAR CHART DE COMPARATIVO ──
function SegmentRadarChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="empty-chart">No hay datos</div>;
  }

  const metrics = ['clientes', 'gasto', 'frecuencia', 'antigüedad', 'lealtad'];
  
  // Normalizar datos para el radar
  const radarData = data.map(seg => {
    const maxClients = Math.max(...data.map(s => s.count));
    const maxSpent = Math.max(...data.map(s => s.avg_spent || 0));
    const maxFrequency = Math.max(...data.map(s => s.avg_frequency || 1));
    const maxTenure = Math.max(...data.map(s => s.avg_tenure || 1));
    const maxLoyalty = Math.max(...data.map(s => s.loyalty_score || 1));

    return {
      segmento: seg.label,
      clientes: maxClients > 0 ? (seg.count / maxClients) * 100 : 0,
      gasto: maxSpent > 0 ? ((seg.avg_spent || 0) / maxSpent) * 100 : 0,
      frecuencia: maxFrequency > 0 ? ((seg.avg_frequency || 0) / maxFrequency) * 100 : 0,
      antigüedad: maxTenure > 0 ? ((seg.avg_tenure || 0) / maxTenure) * 100 : 0,
      lealtad: maxLoyalty > 0 ? ((seg.loyalty_score || 0) / maxLoyalty) * 100 : 0
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{data.segmento}</p>
          <p className="recharts-tooltip-sub">Clientes: {data.clientes.toFixed(0)}%</p>
          <p className="recharts-tooltip-sub">Gasto: {data.gasto.toFixed(0)}%</p>
          <p className="recharts-tooltip-sub">Frecuencia: {data.frecuencia.toFixed(0)}%</p>
          <p className="recharts-tooltip-sub">Antigüedad: {data.antigüedad.toFixed(0)}%</p>
          <p className="recharts-tooltip-sub">Lealtad: {data.lealtad.toFixed(0)}%</p>
        </div>
      );
    }
    return null;
  };

  const colors = ['#8b5cf6', '#34d399', '#60a5fa', '#fbbf24'];

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis 
            dataKey="segmento" 
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          />
          <Radar
            name="Rendimiento"
            dataKey="clientes"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.2}
          />
          <Radar
            name="Gasto"
            dataKey="gasto"
            stroke="#34d399"
            fill="#34d399"
            fillOpacity={0.2}
          />
          <Radar
            name="Frecuencia"
            dataKey="frecuencia"
            stroke="#60a5fa"
            fill="#60a5fa"
            fillOpacity={0.2}
          />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
          <Legend 
            verticalAlign="bottom" 
            align="center"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => (
              <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginRight: 12 }}>
                {value}
              </span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── COMPONENTE: BARRAS DE COMPARACIÓN ──
function SegmentComparisonChart({ data, formatUtils }) {
  if (!data || data.length === 0) {
    return <div className="empty-chart">No hay datos</div>;
  }

  const chartData = data.map(seg => ({
    name: seg.label,
    clientes: seg.count,
    gasto: seg.avg_spent || 0,
    color: seg.color || 'var(--primary)'
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = chartData.find(d => d.name === label);
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-label">{label}</p>
          <p className="recharts-tooltip-value" style={{ color: 'var(--primary)' }}>
            {formatUtils.number(item?.clientes || 0)} clientes
          </p>
          <p className="recharts-tooltip-sub">
            Gasto promedio: {formatUtils.currency(item?.gasto || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'var(--text-primary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatUtils.currency(value)}
          />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
          <Bar 
            yAxisId="left"
            dataKey="clientes" 
            radius={[4, 4, 0, 0]} 
            barSize={40}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} opacity={0.7} />
            ))}
          </Bar>
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="gasto" 
            stroke="var(--warning)" 
            strokeWidth={3}
            dot={{ fill: 'var(--warning)', r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 20, 
        marginTop: 8,
        fontSize: 11,
        color: 'var(--text-muted)'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 20, height: 3, borderRadius: 2, background: 'var(--primary)', opacity: 0.7 }} />
          Clientes
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 20, height: 3, borderRadius: 2, background: 'var(--warning)' }} />
          Gasto promedio
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <BarChart2 size={14} style={{ color: 'var(--text-muted)' }} />
          Comparativa
        </span>
      </div>
    </div>
  );
}

// ── COMPONENTE: MÉTRICAS POR SEGMENTO ──
function SegmentMetricsTable({ segments, segmentConfigs, formatUtils, total }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
            <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
              Segmento
            </th>
            <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
              Clientes
            </th>
            <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
              % Total
            </th>
            <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
              Gasto Prom.
            </th>
            <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
              Frecuencia
            </th>
            <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
              Score Lealtad
            </th>
          </tr>
        </thead>
        <tbody>
          {segments.map(seg => {
            const config = segmentConfigs[seg.segment] || segmentConfigs.ocasional;
            const percentage = total > 0 ? ((Number(seg.count) / total) * 100).toFixed(0) : 0;
            const avgSpent = seg.avg_spent || 0;
            const frequency = seg.avg_frequency || 0;
            const loyaltyScore = seg.loyalty_score || 0;

            // Calcular nivel de lealtad
            const loyaltyLevel = loyaltyScore >= 80 ? 'Alta' : loyaltyScore >= 50 ? 'Media' : 'Baja';
            const loyaltyColor = loyaltyScore >= 80 ? 'var(--success)' : loyaltyScore >= 50 ? 'var(--warning)' : 'var(--danger)';

            return (
              <tr key={seg.segment} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '12px 8px', color: 'var(--text-primary)', fontWeight: 500 }}>
                  <span style={{ color: config.color, marginRight: 8 }}>●</span> 
                  {config.label}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {formatUtils.number(seg.count)}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {percentage}%
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {formatUtils.currency(avgSpent)}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {frequency.toFixed(1)}x
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  <span style={{ 
                    color: loyaltyColor,
                    fontWeight: 600,
                    background: `${loyaltyColor}15`,
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {loyaltyLevel}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──
export default function TabSegmentacion({ data, formatUtils, COLORS }) {
  const { segments } = data;

  const segmentConfigs = {
    vip: { color: COLORS.purple, label: 'VIP', icon: Award, description: 'Clientes de alto valor' },
    frecuente: { color: COLORS.success, label: 'Frecuente', icon: Star, description: 'Compradores recurrentes' },
    ocasional: { color: COLORS.info, label: 'Ocasional', icon: User, description: 'Compras esporádicas' },
    nuevo: { color: COLORS.warning, label: 'Nuevo', icon: PlusCircle, description: 'Clientes recientes' }
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

  const total = sortedSegments.reduce((sum, seg) => sum + (Number(seg.count) || 0), 0);

  // Datos para el radar y gráfico de barras
  const segmentMetrics = sortedSegments.map(seg => ({
    label: segmentConfigs[seg.segment]?.label || seg.segment,
    count: Number(seg.count) || 0,
    avg_spent: seg.avg_spent || 0,
    avg_frequency: seg.avg_frequency || 0,
    avg_tenure: seg.avg_tenure || 0,
    loyalty_score: seg.loyalty_score || 0,
    color: segmentConfigs[seg.segment]?.color || COLORS.primary
  }));

  return (
    <>
      {/* ── KPIs DE SEGMENTACIÓN ── */}
      <div className="analytics-summary-grid">
        <div className="summary-card">
          <div className="summary-icon" style={{ background: `${COLORS.primary}15`, color: COLORS.primary }}>
            <Users size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">{formatUtils.number(total)}</span>
            <span className="summary-label">Total Clientes</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: `${COLORS.success}15`, color: COLORS.success }}>
            <Award size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">
              {formatUtils.number(sortedSegments.find(s => s.segment === 'vip')?.count || 0)}
            </span>
            <span className="summary-label">Clientes VIP</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: `${COLORS.warning}15`, color: COLORS.warning }}>
            <TrendingUp size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">
              {formatUtils.number(sortedSegments.find(s => s.segment === 'nuevo')?.count || 0)}
            </span>
            <span className="summary-label">Nuevos Clientes</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: `${COLORS.info}15`, color: COLORS.info }}>
            <Activity size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-value">
              {sortedSegments.reduce((sum, s) => sum + (Number(s.avg_frequency) || 0), 0).toFixed(1)}x
            </span>
            <span className="summary-label">Frecuencia Promedio</span>
          </div>
        </div>
      </div>

      {/* ── PRIMERA FILA: DONA + RADAR ── */}
      <div className="analytics-two-columns">
        <div className="analytics-section half">
          <div className="section-header">
            <h3><FeatherPieChart size={18} /> Distribución</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {total} clientes totales
            </span>
          </div>
          <SegmentDoughnutChart 
            data={doughnutData} 
            colors={doughnutColors}
            total={total}
          />
        </div>

        <div className="analytics-section half">
          <div className="section-header">
            <h3><Activity size={18} /> Perfil de Segmentos</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Comparativa multidimensional
            </span>
          </div>
          <SegmentRadarChart data={segmentMetrics} />
        </div>
      </div>

      {/* ── SEGUNDA FILA: BARRAS COMPARATIVAS ── */}
      <div className="analytics-section">
        <div className="section-header">
          <h3><BarChart2 size={18} /> Comparativa de Segmentos</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            <Zap size={14} style={{ display: 'inline', marginRight: 4 }} />
            Clientes vs Gasto Promedio
          </span>
        </div>
        <SegmentComparisonChart 
          data={segmentMetrics}
          formatUtils={formatUtils}
        />
      </div>

      {/* ── TERCERA FILA: TABLA DE MÉTRICAS ── */}
      <div className="analytics-section">
        <div className="section-header">
          <h3><Target size={18} /> Métricas Detalladas por Segmento</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Análisis completo de comportamiento
          </span>
        </div>
        <SegmentMetricsTable 
          segments={sortedSegments}
          segmentConfigs={segmentConfigs}
          formatUtils={formatUtils}
          total={total}
        />
      </div>
    </>
  );
}