import React, { useState, useMemo } from 'react';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import {
  Download, TrendingUp, TrendingDown, DollarSign,
  AlertCircle, Check, BarChart2, Layers
} from 'react-feather';
import { FiRefreshCw } from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// ─── HELPERS ──────────────────────────────────────────────────────────────
const formatDate = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return String(isoDate);
  return date.toLocaleDateString('es-EC', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
};

// ─── DATOS DE PRUEBA (MOCK) ──────────────────────────────────────────────
const MOCK_BALANCE = {
  assets: {
    current: [
      { name: 'Caja y Bancos', amount: 12500.00 },
      { name: 'Cuentas por Cobrar', amount: 8400.50 },
      { name: 'Inventarios', amount: 15200.00 },
      { name: 'Total Activos Corrientes', amount: 36100.50, isSubtotal: true }
    ],
    nonCurrent: [
      { name: 'Propiedad, Planta y Equipo', amount: 45000.00 },
      { name: 'Depreciación Acumulada', amount: -8500.00 },
      { name: 'Total Activos No Corrientes', amount: 36500.00, isSubtotal: true }
    ]
  },
  liabilities: {
    current: [
      { name: 'Cuentas por Pagar', amount: 3200.00 },
      { name: 'Obligaciones Laborales', amount: 1800.00 },
      { name: 'Total Pasivos Corrientes', amount: 5000.00, isSubtotal: true }
    ],
    nonCurrent: [
      { name: 'Préstamos Bancarios', amount: 12000.00 },
      { name: 'Total Pasivos No Corrientes', amount: 12000.00, isSubtotal: true }
    ]
  },
  equity: {
    items: [
      { name: 'Capital Social', amount: 50000.00 },
      { name: 'Utilidades Retenidas', amount: 5600.50 },
      { name: 'Total Patrimonio', amount: 55600.50, isSubtotal: true }
    ]
  },
  totals: {
    totalAssets: 72600.50,
    totalLiabilities: 17000.00,
    totalEquity: 55600.50
  }
};

const MOCK_PANDL = {
  sales: [
    { period: '2026-01-01', amount: 1250.00 },
    { period: '2026-01-02', amount: 980.00 },
    { period: '2026-01-03', amount: 1420.00 },
    { period: '2026-01-04', amount: 1100.00 },
    { period: '2026-01-05', amount: 1550.00 },
    { period: '2026-01-06', amount: 1300.00 },
    { period: '2026-01-07', amount: 1720.00 },
    { period: '2026-01-08', amount: 900.00 },
    { period: '2026-01-09', amount: 1450.00 },
    { period: '2026-01-10', amount: 1600.00 }
  ],
  expenses: [
    { period: '2026-01-01', amount: 450.00 },
    { period: '2026-01-02', amount: 380.00 },
    { period: '2026-01-03', amount: 520.00 },
    { period: '2026-01-04', amount: 400.00 },
    { period: '2026-01-05', amount: 600.00 },
    { period: '2026-01-06', amount: 490.00 },
    { period: '2026-01-07', amount: 630.00 },
    { period: '2026-01-08', amount: 350.00 },
    { period: '2026-01-09', amount: 540.00 },
    { period: '2026-01-10', amount: 580.00 }
  ]
};

const MOCK_RATIOS = {
  liquidez: 7.22,
  endeudamiento: 0.23,
  rentabilidad: 0.12,
  rotacion: 1.28
};

// ─── SUBCOMPONENTES ────────────────────────────────────────────────────────
function BalanceSheetTable({ data }) {
  if (!data) return <div className="empty-state">No hay datos de balance.</div>;

  const { assets, liabilities, equity, totals } = data;

  const renderSection = (title, items, totalKey, totalLabel) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="balance-sheet-section">
        {title && <h4 className="balance-section-title">{title}</h4>}
        <table className="balance-sheet-table">
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={item.isSubtotal ? 'subtotal-row' : ''}>
                <td className="account-name">{item.name}</td>
                <td className="account-amount">${Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
            {totalKey && (
              <tr className="total-row">
                <td><strong>Total {totalLabel}</strong></td>
                <td><strong>${Number(totals[totalKey]).toFixed(2)}</strong></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="balance-sheet-container">
      <div className="balance-sheet-grid">
        <div className="balance-sheet-col">
          {renderSection('ACTIVOS', assets.current, 'totalAssets', 'Activos Corrientes')}
          {renderSection('', assets.nonCurrent, null, null)}
          <div className="balance-sheet-total">
            <span><strong>Total Activos</strong></span>
            <span><strong>${Number(totals.totalAssets).toFixed(2)}</strong></span>
          </div>
        </div>
        <div className="balance-sheet-col">
          {renderSection('PASIVOS', liabilities.current, 'totalLiabilities', 'Pasivos Corrientes')}
          {renderSection('', liabilities.nonCurrent, null, null)}
          <div className="balance-sheet-total">
            <span><strong>Total Pasivos</strong></span>
            <span><strong>${Number(totals.totalLiabilities).toFixed(2)}</strong></span>
          </div>
          <div style={{ marginTop: '20px' }}>
            {renderSection('PATRIMONIO', equity.items, 'totalEquity', 'Patrimonio')}
            <div className="balance-sheet-total">
              <span><strong>Total Patrimonio</strong></span>
              <span><strong>${Number(totals.totalEquity).toFixed(2)}</strong></span>
            </div>
          </div>
          <div className="balance-sheet-grand-total">
            <span><strong>Pasivos + Patrimonio</strong></span>
            <span><strong>${Number(totals.totalLiabilities + totals.totalEquity).toFixed(2)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RatiosCards({ ratios }) {
  if (!ratios) return <div className="empty-state">No hay ratios disponibles.</div>;

  const ratioItems = [
    { key: 'liquidez', label: 'Liquidez', icon: <DollarSign size={20} />, color: 'var(--primary)' },
    { key: 'endeudamiento', label: 'Endeudamiento', icon: <BarChart2 size={20} />, color: 'var(--warning)' },
    { key: 'rentabilidad', label: 'Rentabilidad sobre Ventas', icon: <TrendingUp size={20} />, color: 'var(--success)' },
    { key: 'rotacion', label: 'Rotación de Activos', icon: <Layers size={20} />, color: 'var(--info)' }
  ];

  return (
    <div className="ratios-grid">
      {ratioItems.map(({ key, label, icon, color }) => (
        <div key={key} className="ratio-card" style={{ borderLeftColor: color }}>
          <div className="ratio-icon" style={{ background: `${color}20`, color }}>
            {icon}
          </div>
          <div className="ratio-content">
            <div className="ratio-label">{label}</div>
            <div className="ratio-value">{ratios[key] !== undefined ? ratios[key].toFixed(2) : 'N/A'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
export default function AccountingBalance() {
  const [activeTab, setActiveTab] = useState('balance'); // 'balance', 'pandl', 'ratios'
  const [dateRange] = useState({
    from: '2026-01-01',
    to: '2026-01-10'
  });
  const [groupBy] = useState('month');

  // Datos mock
  const balanceData = MOCK_BALANCE;
  const pandlData = MOCK_PANDL;
  const ratiosData = MOCK_RATIOS;

  const [loadingBalance] = useState(false);
  const [loadingPandl] = useState(false);
  const [loadingRatios] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ─── Calcular totales P&L ──────────────────────────────────────────────
  const pandlTotals = useMemo(() => {
    if (!pandlData) return { totalVentas: 0, totalGastos: 0, neto: 0, margen: 0 };
    const totalVentas = pandlData.sales.reduce((sum, s) => sum + s.amount, 0);
    const totalGastos = pandlData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const neto = totalVentas - totalGastos;
    const margen = totalVentas > 0 ? (neto / totalVentas) * 100 : 0;
    return { totalVentas, totalGastos, neto, margen };
  }, [pandlData]);

  // ─── Datos para gráfico ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!pandlData) return [];
    return pandlData.sales.map(s => {
      const gasto = pandlData.expenses.find(e => e.period === s.period)?.amount || 0;
      return {
        period: formatDate(s.period),
        periodKey: s.period,
        Ventas: s.amount,
        Gastos: gasto
      };
    });
  }, [pandlData]);

  // ─── Datos para tabla P&L ──────────────────────────────────────────────
  const tableData = useMemo(() => {
    if (!pandlData) return [];
    return pandlData.sales.map(s => {
      const gasto = pandlData.expenses.find(e => e.period === s.period)?.amount || 0;
      const venta = s.amount;
      const resultado = venta - gasto;
      return {
        id: s.period,
        period: s.period,
        periodFormatted: formatDate(s.period),
        ventas: venta,
        gastos: gasto,
        resultado: resultado,
        margenPorcentaje: venta > 0 ? +((resultado / venta) * 100).toFixed(1) : 0
      };
    });
  }, [pandlData]);

  // ─── Filtrar tabla ──────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;
    const term = searchTerm.toLowerCase();
    return tableData.filter(row =>
      row.periodFormatted.toLowerCase().includes(term) ||
      row.ventas.toString().includes(term) ||
      row.gastos.toString().includes(term)
    );
  }, [tableData, searchTerm]);

  // ─── Simular refresh ────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
    setSuccess('Datos actualizados correctamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  // ─── Exportar Excel (simulado) ─────────────────────────────────────────
  const handleExportXLSX = () => {
    setSuccess('Exportado a Excel correctamente (simulado)');
    setTimeout(() => setSuccess(''), 3000);
  };

  // ─── Columnas tabla ────────────────────────────────────────────────────
  const columns = [
    { accessor: 'periodFormatted', label: 'Período', render: (item) => <span>{item.periodFormatted}</span> },
    { accessor: 'ventas', label: 'Ventas ($)', align: 'right', render: (item) => <span>${item.ventas.toFixed(2)}</span> },
    { accessor: 'gastos', label: 'Gastos ($)', align: 'right', render: (item) => <span>${item.gastos.toFixed(2)}</span> },
    { accessor: 'resultado', label: 'Resultado ($)', align: 'right', render: (item) => (
      <span style={{ color: item.resultado >= 0 ? 'var(--success)' : 'var(--danger)' }}>
        ${item.resultado.toFixed(2)}
      </span>
    ) },
    { accessor: 'margenPorcentaje', label: 'Margen (%)', align: 'right', render: (item) => (
      <span style={{ color: item.resultado >= 0 ? 'var(--success)' : 'var(--danger)' }}>
        {item.margenPorcentaje}%
      </span>
    ) }
  ];

  // ─── Toolbar ─────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<Download size={13} />}
          onClick={handleExportXLSX}
        >
          Exportar Excel (mock)
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ─── Footer tabla ──────────────────────────────────────────────────────
  const tableFooter = useMemo(() => {
    if (filteredData.length === 0) return null;
    const { totalVentas, totalGastos, neto, margen } = pandlTotals;
    return (
      <tr className="table-footer-totals">
        <td><strong>TOTALES</strong></td>
        <td className="text-right"><strong>${totalVentas.toFixed(2)}</strong></td>
        <td className="text-right"><strong>${totalGastos.toFixed(2)}</strong></td>
        <td className={`text-right ${neto >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>${neto.toFixed(2)}</strong>
        </td>
        <td className={`text-right ${neto >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>{margen.toFixed(1)}%</strong>
        </td>
      </tr>
    );
  }, [filteredData, pandlTotals]);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="BALANCE Y P&G"
      subtitle="Balance General, Estado de Resultados y Ratios Financieros"
      theme="business"
      loading={loadingBalance || loadingPandl || loadingRatios}
      headerAction={
        <button
          onClick={handleRefresh}
          className="dashboard-refresh-btn-header"
          disabled={refreshing}
          title="Actualizar datos"
        >
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      }
    >
      <div className="accounting-balance-container custom-dashboard">
        {error && (
          <div className="alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="alert-success">
            <Check size={16} /> {success}
          </div>
        )}

        {/* Filtros (estáticos para demo) */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Desde</label>
            <input type="date" value={dateRange.from} disabled />
          </div>
          <div className="filter-group">
            <label>Hasta</label>
            <input type="date" value={dateRange.to} disabled />
          </div>
          <div className="filter-group">
            <label>Agrupar por</label>
            <select value={groupBy} disabled>
              <option value="month">Mes</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === 'balance' ? 'active' : ''}`}
              onClick={() => setActiveTab('balance')}
            >
              <Layers size={16} /> Balance General
            </button>
            <button
              className={`tab-btn ${activeTab === 'pandl' ? 'active' : ''}`}
              onClick={() => setActiveTab('pandl')}
            >
              <TrendingUp size={16} /> Estado de Resultados
            </button>
            <button
              className={`tab-btn ${activeTab === 'ratios' ? 'active' : ''}`}
              onClick={() => setActiveTab('ratios')}
            >
              <BarChart2 size={16} /> Ratios Financieros
            </button>
          </div>

          <div className="tab-content">
            {/* Tab: Balance General */}
            {activeTab === 'balance' && (
              <div className="tab-panel">
                <BalanceSheetTable data={balanceData} />
              </div>
            )}

            {/* Tab: Estado de Resultados */}
            {activeTab === 'pandl' && (
              <div className="tab-panel">
                {/* KPIs */}
                <div className="stat-cards-row">
                  <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
                      <TrendingUp size={24} color="var(--text-primary)" />
                    </div>
                    <div>
                      <div className="stat-card-label">Ventas Totales</div>
                      <div className="stat-card-value" style={{ color: 'var(--text-primary)' }}>
                        ${pandlTotals.totalVentas.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
                    <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
                      <TrendingDown size={24} color="var(--text-primary)" />
                    </div>
                    <div>
                      <div className="stat-card-label">Gastos Operativos</div>
                      <div className="stat-card-value" style={{ color: 'var(--text-primary)' }}>
                        ${pandlTotals.totalGastos.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="stat-card" style={{ borderLeft: `4px solid ${pandlTotals.neto >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                    <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
                      <DollarSign size={24} color={pandlTotals.neto >= 0 ? 'var(--success)' : 'var(--danger)'} />
                    </div>
                    <div>
                      <div className="stat-card-label">Resultado Neto</div>
                      <div className="stat-card-value" style={{ color: pandlTotals.neto >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        ${pandlTotals.neto.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className="stat-card" style={{ borderLeft: `4px solid ${pandlTotals.neto >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                    <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
                      <TrendingUp size={24} color={pandlTotals.neto >= 0 ? 'var(--success)' : 'var(--danger)'} />
                    </div>
                    <div>
                      <div className="stat-card-label">Margen de Ganancia</div>
                      <div className="stat-card-value" style={{ color: pandlTotals.neto >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {pandlTotals.margen.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfico */}
                {chartData.length > 0 && (
                  <div className="dashboard-graph-card">
                    <h3 className="dashboard-graph-title">Evolución de Ventas vs Gastos</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--success)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--success)" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--danger)" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="period" stroke="var(--text-muted)" />
                        <YAxis stroke="var(--text-muted)" tickFormatter={v => `$${v}`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: 'var(--radius-sm)'
                          }}
                          formatter={(value) => `$${Number(value).toFixed(2)}`}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="Ventas"
                          stroke="var(--success)"
                          fill="url(#salesGrad)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="Gastos"
                          stroke="var(--danger)"
                          fill="url(#expenseGrad)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Tabla */}
                <Table
                  data={filteredData}
                  columns={columns}
                  keyField="id"
                  title="Detalle por Período"
                  subtitle={`${filteredData.length} registros encontrados`}
                  toolbar={toolbar}
                  searchable={true}
                  searchPlaceholder="Buscar por período o monto..."
                  pagination={true}
                  itemsPerPage={itemsPerPage}
                  itemsPerPageOptions={[10, 15]}
                  onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
                  loading={loadingPandl}
                  emptyMessage="No hay datos para el período seleccionado"
                  striped={true}
                  hoverable={true}
                  bordered={false}
                  compact={false}
                  footer={tableFooter}
                />
              </div>
            )}

            {/* Tab: Ratios Financieros */}
            {activeTab === 'ratios' && (
              <div className="tab-panel">
                <RatiosCards ratios={ratiosData} />
                <div style={{ marginTop: '24px', padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ marginBottom: '12px' }}>Interpretación de Ratios</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li><strong>Liquidez:</strong> {ratiosData.liquidez >= 1 ? '✅ Adecuada' : '⚠️ Posible problema de liquidez'}</li>
                    <li><strong>Endeudamiento:</strong> {ratiosData.endeudamiento < 0.5 ? '✅ Bajo' : '⚠️ Alto'}</li>
                    <li><strong>Rentabilidad:</strong> {ratiosData.rentabilidad > 0.1 ? '✅ Buena' : '⚠️ Mejorable'}</li>
                    <li><strong>Rotación de Activos:</strong> {ratiosData.rotacion > 1 ? '✅ Eficiente' : '⚠️ Ineficiente'}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}