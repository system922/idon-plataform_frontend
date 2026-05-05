import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  Download, Calendar, TrendingUp, TrendingDown, DollarSign, 
  PieChart, BarChart2, Loader, AlertCircle, Check 
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, 
  Pie, Cell
} from 'recharts';
import '../../styles/ReportsAdvanced.css';

export default function ReportsAdvanced() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState('day');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadReport = async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`/api/reports/advanced?from=${dateRange.from}&to=${dateRange.to}&groupBy=${groupBy}`);
      if (!res.ok) throw new Error('Error al cargar reporte');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [dateRange, groupBy]);

  const handleExportCSV = () => {
    if (!data) return;
    const salesRows = data.sales.map(s => ({ ...s, type: 'Ventas' }));
    const expensesRows = data.expenses.map(e => ({ ...e, type: 'Gastos' }));
    const all = [...salesRows, ...expensesRows];
    const headers = ['Fecha', 'Monto', 'Tipo'];
    const csv = [headers, ...all.map(r => [r.date, r.total_sales || r.total_expenses, r.type])]
      .map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${dateRange.from}_${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Exportado a CSV');
    setTimeout(() => setSuccess(''), 3000);
  };

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];

  return (
    <PageTemplate
      title="Reportes Avanzados"
      subtitle="Análisis de ventas, gastos y rentabilidad"
      loading={loading}
    >
      <div className="reports-advanced-container">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="filters-bar">
          <div className="filter-group">
            <label>Desde</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
          </div>
          <div className="filter-group">
            <label>Agrupar por</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="day">Día</option>
              <option value="month">Mes</option>
              <option value="category">Categoría</option>
            </select>
          </div>
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Exportar CSV
          </button>
        </div>

        {data && data.totals && (
          <div className="kpi-cards">
            <div className="kpi-card">
              <div className="kpi-title">Ventas Totales</div>
              <div className="kpi-value">${Number(data.totals.total_sales).toFixed(2)}</div>
              <TrendingUp size={20} className="kpi-icon positive" />
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Gastos Totales</div>
              <div className="kpi-value">${Number(data.totals.total_expenses).toFixed(2)}</div>
              <TrendingDown size={20} className="kpi-icon negative" />
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Ganancia Neta</div>
              <div className="kpi-value" style={{ color: data.totals.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                ${Number(data.totals.net_profit).toFixed(2)}
              </div>
              <DollarSign size={20} className="kpi-icon" />
            </div>
          </div>
        )}

        {loading && <div className="loading-spinner"><Loader size={32} className="spin" /></div>}

        {!loading && data && (
          <>
            {/* Gráfico de evolución (solo si groupBy no es 'category') */}
            {groupBy !== 'category' && (
              <div className="chart-card">
                <h3>Evolución vs Gastos</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data.sales.map((s, idx) => ({
                    date: s.date,
                    Ventas: s.total_sales,
                    Gastos: data.expenses.find(e => e.date === s.date)?.total_expenses || 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                    <Legend />
                    <Line type="monotone" dataKey="Ventas" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Gráfico de barras o pastel según groupBy */}
            {groupBy === 'category' && data.sales && data.sales.length > 0 && (
              <div className="chart-card">
                <h3>Ventas por Categoría</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.sales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="category" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b' }} />
                    <Bar dataKey="total_sales" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabla resumen */}
            <div className="table-card">
              <h3>Detalle de Ventas Diarias</h3>
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr><th>Fecha</th><th>Ventas</th><th>Gastos</th><th>Margen</th></tr>
                  </thead>
                  <tbody>
                    {data.sales.map(s => {
                      const gasto = data.expenses.find(e => e.date === s.date)?.total_expenses || 0;
                      const margen = s.total_sales - gasto;
                      return (
                        <tr key={s.date}>
                          <td>{s.date}</td>
                          <td>${Number(s.total_sales).toFixed(2)}</td>
                          <td>${Number(gasto).toFixed(2)}</td>
                          <td style={{ color: margen >= 0 ? '#10b981' : '#ef4444' }}>${margen.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
}