import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  Package, AlertTriangle, DollarSign, TrendingDown, TrendingUp, 
  RefreshCw, Download, Search, Filter, X, Loader, AlertCircle, Check 
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import '../../styles/ReportsInventory.css';

export default function ReportsInventory() {
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [currentStock, setCurrentStock] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState({ summary: false, stock: false, movements: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [filterDate, setFilterDate] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [productFilter, setProductFilter] = useState('');
  const [productsList, setProductsList] = useState([]);

  const loadSummary = async () => {
    setLoading(prev => ({ ...prev, summary: true }));
    try {
      const res = await fetchWithAuth('/api/reports/inventory?type=summary');
      if (!res.ok) throw new Error('Error cargando resumen');
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  };

  const loadCurrentStock = async () => {
    setLoading(prev => ({ ...prev, stock: true }));
    try {
      const res = await fetchWithAuth('/api/reports/inventory?type=currentStock');
      if (!res.ok) throw new Error('Error cargando stock');
      const data = await res.json();
      setCurrentStock(data);
      // extraer lista de productos para filtro
      const products = data.map(p => ({ id: p.id, name: p.name }));
      setProductsList(products);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, stock: false }));
    }
  };

  const loadLowStock = async () => {
    setLoading(prev => ({ ...prev, lowStock: true }));
    try {
      const res = await fetchWithAuth('/api/reports/inventory?type=lowStock');
      if (!res.ok) throw new Error('Error cargando productos bajos');
      const data = await res.json();
      setLowStockProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, lowStock: false }));
    }
  };

  const loadMovements = async () => {
    setLoading(prev => ({ ...prev, movements: true }));
    try {
      let url = `/api/reports/inventory?type=movements&from=${filterDate.from}&to=${filterDate.to}`;
      if (productFilter) url += `&productId=${productFilter}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error('Error cargando movimientos');
      const data = await res.json();
      setMovements(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, movements: false }));
    }
  };

  useEffect(() => {
    loadSummary();
    loadCurrentStock();
    loadLowStock();
  }, []);

  useEffect(() => {
    if (activeTab === 'movements') loadMovements();
  }, [activeTab, filterDate, productFilter]);

  const handleExportCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers, ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess(`Exportado ${filename}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <PageTemplate title="Reportes de Inventario" subtitle="Análisis de stock, movimientos y productos críticos">
      <div className="reports-inventory-container">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="tabs">
          <button className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Resumen</button>
          <button className={`tab ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>Stock Actual</button>
          <button className={`tab ${activeTab === 'movements' ? 'active' : ''}`} onClick={() => setActiveTab('movements')}>Movimientos</button>
          <button className={`tab ${activeTab === 'lowstock' ? 'active' : ''}`} onClick={() => setActiveTab('lowstock')}>Bajo Stock</button>
        </div>

        {activeTab === 'summary' && summary && (
          <div className="kpi-cards">
            <div className="kpi-card">
              <div className="kpi-title">Productos Activos</div>
              <div className="kpi-value">{summary.total_products}</div>
              <Package size={24} className="kpi-icon" />
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Unidades en Stock</div>
              <div className="kpi-value">{summary.total_units}</div>
              <Package size={24} className="kpi-icon" />
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Valor de Inventario</div>
              <div className="kpi-value">${summary.total_value.toFixed(2)}</div>
              <DollarSign size={24} className="kpi-icon" />
            </div>
            <div className="kpi-card warning">
              <div className="kpi-title">Productos con Bajo Stock</div>
              <div className="kpi-value">{summary.low_stock_count}</div>
              <AlertTriangle size={24} className="kpi-icon" />
            </div>
            <div className="kpi-card danger">
              <div className="kpi-title">Productos Agotados</div>
              <div className="kpi-value">{summary.out_of_stock_count}</div>
              <TrendingDown size={24} className="kpi-icon" />
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="stock-table-container">
            <div className="table-actions">
              <button className="btn-secondary" onClick={() => handleExportCSV(currentStock, 'stock_actual')}>
                <Download size={16} /> Exportar CSV
              </button>
              <button className="btn-secondary" onClick={loadCurrentStock}>
                <RefreshCw size={16} /> Actualizar
              </button>
            </div>
            <div className="table-responsive">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Código</th><th>Producto</th><th>Stock</th><th>Stock Mín.</th><th>Costo Unit.</th><th>Valor Total</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {currentStock.map(p => (
                    <tr key={p.id} className={p.stock <= p.min_stock && p.min_stock > 0 ? 'warning-row' : (p.stock === 0 ? 'danger-row' : '')}>
                      <td>{p.code || '-'}</td>
                      <td>{p.name}</td>
                      <td>{p.stock}</td>
                      <td>{p.min_stock}</td>
                      <td>${Number(p.unit_cost).toFixed(2)}</td>
                      <td>${Number(p.stock_value).toFixed(2)}</td>
                      <td>
                        {p.stock === 0 ? <span className="badge-danger">Agotado</span> : 
                         p.stock <= p.min_stock && p.min_stock > 0 ? <span className="badge-warning">Bajo Stock</span> : 
                         <span className="badge-success">Normal</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="movements-container">
            <div className="filters-bar">
              <div className="filter-group">
                <label>Desde</label>
                <input type="date" value={filterDate.from} onChange={e => setFilterDate({...filterDate, from: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>Hasta</label>
                <input type="date" value={filterDate.to} onChange={e => setFilterDate({...filterDate, to: e.target.value})} />
              </div>
              <div className="filter-group">
                <label>Producto</label>
                <select value={productFilter} onChange={e => setProductFilter(e.target.value)}>
                  <option value="">Todos</option>
                  {productsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button className="btn-secondary" onClick={() => handleExportCSV(movements, 'movimientos')}>
                <Download size={16} /> Exportar
              </button>
            </div>
            <div className="table-responsive">
              <table className="movements-table">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Costo Unit.</th><th>Referencia</th><th>Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id}>
                      <td>{new Date(m.created_at).toLocaleString()}</td>
                      <td>{m.product_name}</td>
                      <td>
                        <span className={`movement-badge ${m.type}`}>
                          {m.type === 'entrada' ? 'Entrada' : m.type === 'salida' ? 'Salida' : 'Ajuste'}
                        </span>
                      </td>
                      <td>{Math.abs(m.quantity)}</td>
                      <td>{m.unit_cost ? `$${Number(m.unit_cost).toFixed(2)}` : '-'}</td>
                      <td>{m.reference_id || '-'}</td>
                      <td>{m.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'lowstock' && (
          <div className="lowstock-container">
            <div className="table-actions">
              <button className="btn-secondary" onClick={() => handleExportCSV(lowStockProducts, 'productos_bajo_stock')}>
                <Download size={16} /> Exportar
              </button>
              <button className="btn-secondary" onClick={loadLowStock}>
                <RefreshCw size={16} /> Actualizar
              </button>
            </div>
            <div className="table-responsive">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Código</th><th>Producto</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Diferencia</th><th>Valor Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map(p => (
                    <tr key={p.id}>
                      <td>{p.code || '-'}</td>
                      <td>{p.name}</td>
                      <td className="danger-text">{p.stock}</td>
                      <td>{p.min_stock}</td>
                      <td className="danger-text">{p.stock - p.min_stock}</td>
                      <td>${Number(p.stock_value).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}