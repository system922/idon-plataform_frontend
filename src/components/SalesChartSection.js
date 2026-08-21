import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesChartSection({ salesData }) {
  const isEmpty = !salesData || salesData.length === 0;

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          color: 'var(--text-primary)'
        }}>
          <div>
            <span style={{ fontWeight: 'bold' }}>Fecha:</span> {label}
          </div>
          <div>
            <span style={{ fontWeight: 'bold' }}>Total:</span> ${Number(payload[0].value).toFixed(2)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-graph-card graph-big sales-chart-card"
      style={{ 
        width: '100%', 
        minHeight: 320, 
        background: 'var(--bg-card)', 
        borderRadius: 'var(--radius)', 
        marginBottom: 30,
        border: '1px solid var(--border-color)',
        padding: 'var(--space-6)'
      }}
    >
      <div style={{ 
        fontSize: 'var(--font-size-lg)', 
        color: 'var(--text-primary)', 
        fontWeight: 'var(--font-weight-bold)', 
        marginBottom: 8 
      }}>
        Ventas por día
      </div>
      {isEmpty ? (
        <div style={{ 
          height: 230, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--text-muted)', 
          fontSize: 'var(--font-size-base)' 
        }}>
          Sin ventas en los últimos 30 días
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={salesData}>
            <defs>
              <linearGradient id="salesLine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.85} />
                <stop offset="100%" stopColor="var(--bg-card)" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-color)" strokeDasharray="4 3" />
            <XAxis dataKey="day" stroke="var(--text-muted)" />
            <YAxis 
              stroke="var(--text-muted)" 
              tickFormatter={n => `$${Number(n).toLocaleString('es-EC', { minimumFractionDigits: 0 })}`} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="var(--primary)" 
              strokeWidth={4}
              dot={{ stroke: 'var(--bg-card)', fill: 'var(--primary)', r: 6, strokeWidth: 2 }}
              activeDot={{ stroke: 'var(--bg-card)', fill: 'var(--primary-dark)', r: 8, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}