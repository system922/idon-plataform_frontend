import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesChartSection({ salesData }) {
  return (
    <div className="dashboard-graph-card graph-big"
      style={{ width: '100%', minHeight: 320, padding: 32, background: '#17192b', borderRadius: 16, marginBottom: 30 }}
    >
      <div style={{ fontSize: 18, color: '#fff', fontWeight: 700, marginBottom: 8 }}>Ventas por día</div>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={salesData}>
          <defs>
            <linearGradient id="salesLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#5caaff" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#17192b" stopOpacity={0.2}  />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#233356" strokeDasharray="4 3" />
          <XAxis dataKey="day" stroke="#5caaffb0" />
          <YAxis stroke="#5caaff85" tickFormatter={n => `$${Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`} />
          <Tooltip
            contentStyle={{ background: '#23243b', border: 'none', color: '#fff' }}
            formatter={v => [`$${Number(v).toFixed(2)}`, 'Total']}
            labelFormatter={l => `Fecha: ${l}`}
          />
          <Line type="monotone" dataKey="total" stroke="url(#salesLine)" strokeWidth={4}
            dot={{ stroke: '#fff', fill: '#5caaff', r: 6, strokeWidth: 2 }}
            activeDot={{ stroke: '#fff', fill: '#007AFF', r: 8, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}