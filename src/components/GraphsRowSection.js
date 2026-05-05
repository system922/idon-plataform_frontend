import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function GraphsRowSection({ purchasesData, hoursData, graphLoading }) {
  const noPurchases = !purchasesData || purchasesData.length === 0;

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Gráfico de Compras */}
      <div className="dashboard-graph-card"
        style={{ flex: 1, minWidth: 0, background: '#17192b', borderRadius: 14, padding: 22 }}
      >
        <div style={{ fontSize: 15, color: '#fff', fontWeight: 700, marginBottom: 5 }}>Compras por día</div>
        {noPurchases ? (
          <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffffff44', fontSize: 13 }}>
            Sin compras en los últimos 30 días
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={purchasesData}>
              <defs>
                <linearGradient id="purchasesLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#21e69e" stopOpacity={0.90} />
                  <stop offset="90%" stopColor="#17192b" stopOpacity={0.1}  />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#233356" strokeDasharray="4 3" />
              <XAxis dataKey="day" stroke="#21e69e88" />
              <YAxis stroke="#21e69e40" />
              <Tooltip
                contentStyle={{ background: '#23243b', border: 'none', color: '#fff' }}
                formatter={v => [`$${Number(v).toFixed(2)}`, 'Total']}
                labelFormatter={l => `Fecha: ${l}`}
              />
              <Line type="monotone" dataKey="total" stroke="url(#purchasesLine)" strokeWidth={3}
                dot={{ stroke: '#fff', fill: '#21e69e', r: 5, strokeWidth: 2 }}
                activeDot={{ stroke: '#fff', fill: '#048050', r: 7, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfico de Horas Trabajadas */}
      <div className="dashboard-graph-card"
        style={{ flex: 1, minWidth: 0, background: '#17192b', borderRadius: 14, padding: 22 }}
      >
        <div style={{ fontSize: 15, color: '#fff', fontWeight: 700, marginBottom: 5 }}>Horas trabajadas hoy</div>
        {graphLoading ? (
          <div style={{ color: '#af47f9', textAlign: 'center', paddingTop: 50 }}>Cargando...</div>
        ) : hoursData.length === 0 ? (
          <div style={{ color: '#ffffff55', textAlign: 'center', paddingTop: 50, fontSize: 13 }}>
            Sin registros de salida aún
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={hoursData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="hoursBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#af47f9" stopOpacity={0.8} />
                  <stop offset="90%" stopColor="#17192b" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#233356" strokeDasharray="4 3" />
              <XAxis dataKey="day" stroke="#af47f9a0" tick={{ fontSize: 11 }} />
              <YAxis stroke="#af47f955" tickFormatter={n => `${n}h`} />
              <Tooltip
                contentStyle={{ background: '#23243b', border: 'none', color: '#fff' }}
                formatter={v => [`${v} hrs`, 'Horas']}
                labelFormatter={l => `Colaborador/a: ${l}`}
              />
              <Bar dataKey="hours" fill="url(#hoursBar)" radius={[8, 8, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
