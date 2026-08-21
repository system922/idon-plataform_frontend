import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Custom Tooltip para el gráfico de gastos
const CustomPurchasesTooltip = ({ active, payload, label }) => {
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

// Custom Tooltip para el gráfico de horas
const CustomHoursTooltip = ({ active, payload, label }) => {
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
          <span style={{ fontWeight: 'bold' }}>Colaborador/a:</span> {label}
        </div>
        <div>
          <span style={{ fontWeight: 'bold' }}>Horas:</span> {payload[0].value} hrs
        </div>
      </div>
    );
  }
  return null;
};

export default function GraphsRowSection({ purchasesData, hoursData, graphLoading }) {
  const noPurchases = !purchasesData || purchasesData.length === 0;

  return (
    <div className="dashboard-graphs-row">
      {/* Gráfico de Gastos */}
      <div className="dashboard-graph-card"
        style={{ 
          flex: 1, 
          minWidth: 0, 
          background: 'var(--bg-card)', 
          borderRadius: 'var(--radius)', 
          padding: 'var(--space-5)',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ 
          fontSize: 'var(--font-size-md)', 
          color: 'var(--text-primary)', 
          fontWeight: 'var(--font-weight-bold)', 
          marginBottom: 5 
        }}>
          Gastos por día
        </div>
        {noPurchases ? (
          <div style={{ 
            height: 150, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--text-muted)', 
            fontSize: 'var(--font-size-sm)' 
          }}>
            Sin gastos en los últimos 30 días
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={purchasesData}>
              <defs>
                <linearGradient id="purchasesLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="var(--info)" stopOpacity={0.90} />
                  <stop offset="90%" stopColor="var(--bg-card)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-color)" strokeDasharray="4 3" />
              <XAxis dataKey="day" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip content={<CustomPurchasesTooltip />} />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="var(--text-primary)" 
                strokeWidth={3}
                dot={{ stroke: 'var(--primary)', fill: 'var(--primary)', r: 5, strokeWidth: 2 }}
                activeDot={{ stroke: 'var(--bg-card)', fill: 'var(--primary)', r: 7, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfico de Horas Trabajadas */}
      <div className="dashboard-graph-card"
        style={{ 
          flex: 1, 
          minWidth: 0, 
          background: 'var(--bg-card)', 
          borderRadius: 'var(--radius)', 
          padding: 'var(--space-5)',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ 
          fontSize: 'var(--font-size-md)', 
          color: 'var(--text-primary)', 
          fontWeight: 'var(--font-weight-bold)', 
          marginBottom: 5 
        }}>
          Horas trabajadas hoy
        </div>
        {graphLoading ? (
          <div style={{ 
            color: 'var(--purple)', 
            textAlign: 'center', 
            paddingTop: 50,
            fontSize: 'var(--font-size-base)'
          }}>
            Cargando...
          </div>
        ) : hoursData.length === 0 ? (
          <div style={{ 
            color: 'var(--text-muted)', 
            textAlign: 'center', 
            paddingTop: 50, 
            fontSize: 'var(--font-size-sm)' 
          }}>
            Sin registros de salida aún
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={hoursData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="hoursBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="var(--primary)" stopOpacity={0.8} />
                  <stop offset="90%" stopColor="var(--bg-card)" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-color)" strokeDasharray="4 3" />
              <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-muted)" tickFormatter={n => `${n}h`} />
              <Tooltip content={<CustomHoursTooltip />} />
              <Bar 
                dataKey="hours" 
                fill="url(#hoursBar)" 
                radius={[8, 8, 0, 0]} 
                barSize={22} 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}