import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  DollarSign, TrendingUp, TrendingDown, BarChart2, PieChart, 
  Download, Calendar, Loader, AlertCircle, Check 
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import '../../styles/AccountingBalance.css';

export default function AccountingBalance() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [groupBy, setGroupBy] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadBalance = async () => {
    if (!dateRange.from || !dateRange.to) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth(`/api/accounting/balance?from=${dateRange.from}&to=${dateRange.to}&groupBy=${groupBy}`);
      if (!res.ok) throw new Error('Error al cargar balance');
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, [dateRange, groupBy]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = data.sales.map(s => {
      const expense = data.expenses.find(e => e.period === s.period) || { amount: 0 };
      return {
        Periodo: s.period,
        Ventas: Number(s.amount) || 0,
        Gastos: Number(expense.amount) || 0,
        'Resultado': (Number(s.amount) || 0) - (Number(expense.amount) || 0)
      };
    });
    const headers = ['Periodo', 'Ventas', 'Gastos', 'Resultado'];
    const csv = [headers, ...rows.map(r => [r.Periodo, r.Ventas, r.Gastos, r.Resultado])]
      .map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance_${dateRange.from}_${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Exportado a CSV');
    setTimeout(() => setSuccess(''), 3000);
  };

  // 🔥 CORRECCIÓN: convertir a número los valores de ventas y gastos
  const chartData = (data?.sales || []).map(s => ({
    period: s.period,
    Ventas: Number(s.amount) || 0,
    Gastos: Number(data.expenses.find(e => e.period === s.period)?.amount) || 0
  })) || [];

  return (
    <PageTemplate
      title="Balance General"
      subtitle="Estado de Resultados - Pérdidas y Ganancias"
    >
      <div className="accounting-balance-container">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="filters-bar">
          <div className="filter-group">
            <label>Desde</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
          </div>
          <div className="filter-group">
            <label>Agrupar por</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="day">Día</option>
              <option value="month">Mes</option>
            </select>
          </div>
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Exportar CSV
          </button>
        </div>

        {loading && <div className="loading-spinner"><Loader size={32} className="spin" /></div>}

        {!loading && data && (
          <>
            {/* KPIs */}
            <div className="kpi-cards">
              <div className="kpi-card">
                <div className="kpi-title">Ventas Totales</div>
                <div className="kpi-value">${(Number(data.total_sales) || 0).toFixed(2)}</div>
                <TrendingUp size={24} className="kpi-icon positive" />
              </div>
              <div className="kpi-card">
                <div className="kpi-title">Gastos Operativos</div>
                <div className="kpi-value">${(Number(data.total_expenses) || 0).toFixed(2)}</div>
                <TrendingDown size={24} className="kpi-icon negative" />
              </div>
              {data.total_incomes > 0 && (
                <div className="kpi-card">
                  <div className="kpi-title">Ingresos No Operativos</div>
                  <div className="kpi-value">${(Number(data.total_incomes) || 0).toFixed(2)}</div>
                  <DollarSign size={24} className="kpi-icon" />
                </div>
              )}
              <div className={`kpi-card ${(Number(data.net_income) || 0) >= 0 ? 'success' : 'danger'}`}>
                <div className="kpi-title">Resultado Neto</div>
                <div className="kpi-value">${(Number(data.net_income) || 0).toFixed(2)}</div>
                <BarChart2 size={24} className="kpi-icon" />
              </div>
            </div>

            {/* Gráfico de evolución */}
            {chartData.length > 0 && (
              <div className="chart-card">
                <h3>Evolución de Ventas vs Gastos</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="period" stroke="#94a3b8" tickFormatter={(v) => {
                      if (groupBy === 'month') return new Date(v).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                      return new Date(v).toLocaleDateString();
                    }} />
                    <YAxis stroke="#94a3b8" tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                    <Legend />
                    <Area type="monotone" dataKey="Ventas" stroke="#10b981" fill="url(#salesGrad)" />
                    <Area type="monotone" dataKey="Gastos" stroke="#ef4444" fill="url(#expenseGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabla resumen por período */}
            <div className="table-card">
              <h3>Detalle por {groupBy === 'month' ? 'Mes' : 'Día'}</h3>
              <div className="table-responsive">
                <table className="balance-table">
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Ventas</th>
                      <th>Gastos</th>
                      <th>Resultado</th>
                      <th>Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map(row => {
                      const result = row.Ventas - row.Gastos;
                      const margin = row.Ventas > 0 ? (result / row.Ventas) * 100 : 0;
                      return (
                        <tr key={row.period}>
                          <td>
                            {groupBy === 'month' 
                              ? new Date(row.period).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                              : new Date(row.period).toLocaleDateString()}
                          </td>
                          <td className="sales">${row.Ventas.toFixed(2)}</td>
                          <td className="expenses">${row.Gastos.toFixed(2)}</td>
                          <td className={result >= 0 ? 'profit' : 'loss'}>${result.toFixed(2)}</td>
                          <td className={margin >= 0 ? 'profit' : 'loss'}>{margin.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td><strong>Totales</strong></td>
                      <td><strong>${(Number(data.total_sales) || 0).toFixed(2)}</strong></td>
                      <td><strong>${(Number(data.total_expenses) || 0).toFixed(2)}</strong></td>
                      <td className={(Number(data.net_income) || 0) >= 0 ? 'profit' : 'loss'}>
                        <strong>${(Number(data.net_income) || 0).toFixed(2)}</strong>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PageTemplate>
  );
}