import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import PageTemplate from '../../components/PageTemplate';
import { 
  Package, AlertTriangle, DollarSign, TrendingDown, TrendingUp, 
  RefreshCw, Download, Loader, AlertCircle, Check, Printer
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/ReportsInventory.css';

export default function ReportsInventory() {
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [currentStock, setCurrentStock] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState({ summary: false, stock: false, movements: false, lowStock: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [filterDate, setFilterDate] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [productFilter, setProductFilter] = useState('');
  const [productsList, setProductsList] = useState([]);
  const [exporting, setExporting] = useState(false);

  const toNumber = (val) => Number(val) || 0;

  // Cargas de datos (sin cambios)
  const loadSummary = async () => {
    setLoading(prev => ({ ...prev, summary: true }));
    try {
      const res = await fetchWithAuth('/api/reports/inventory?type=summary');
      if (!res.ok) throw new Error('Error cargando resumen');
      const data = await res.json();
      setSummary({
        total_products: toNumber(data.total_products),
        total_units: toNumber(data.total_units),
        total_value: toNumber(data.total_value),
        low_stock_count: toNumber(data.low_stock_count),
        out_of_stock_count: toNumber(data.out_of_stock_count)
      });
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
      const parsed = data.map(p => ({
        ...p,
        stock: toNumber(p.stock),
        min_stock: toNumber(p.min_stock),
        unit_cost: toNumber(p.unit_cost),
        stock_value: toNumber(p.stock_value)
      }));
      setCurrentStock(parsed);
      setProductsList(parsed.map(p => ({ id: p.id, name: p.name })));
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
      const parsed = data.map(p => ({
        ...p,
        stock: toNumber(p.stock),
        min_stock: toNumber(p.min_stock),
        stock_value: toNumber(p.stock_value)
      }));
      setLowStockProducts(parsed);
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

  // ============================================================
  // EXPORTACIÓN A EXCEL
  // ============================================================
  const handleExportXLSX = async () => {
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Inventario';
      wb.created = new Date();

      // Hoja 1: Resumen
      if (summary) {
        const wsSum = wb.addWorksheet('Resumen');
        wsSum.columns = [{ key: 'a', width: 25 }, { key: 'b', width: 20 }];
        wsSum.addRow(['Concepto', 'Valor']);
        wsSum.addRow(['Productos Activos', summary.total_products]);
        wsSum.addRow(['Unidades en Stock', summary.total_units]);
        wsSum.addRow(['Valor de Inventario', summary.total_value]);
        wsSum.addRow(['Productos con Bajo Stock', summary.low_stock_count]);
        wsSum.addRow(['Productos Agotados', summary.out_of_stock_count]);
        wsSum.getRow(1).font = { bold: true };
      }

      // Hoja 2: Stock Actual
      if (currentStock.length) {
        const wsStock = wb.addWorksheet('Stock Actual');
        wsStock.columns = [
          { header: 'Código', key: 'code', width: 15 },
          { header: 'Producto', key: 'name', width: 35 },
          { header: 'Stock', key: 'stock', width: 12 },
          { header: 'Stock Mín.', key: 'min_stock', width: 12 },
          { header: 'Costo Unit.', key: 'unit_cost', width: 15 },
          { header: 'Valor Total', key: 'stock_value', width: 15 },
          { header: 'Estado', key: 'status', width: 15 },
        ];
        currentStock.forEach(p => {
          let estado = 'Normal';
          if (p.stock === 0) estado = 'Agotado';
          else if (p.stock <= p.min_stock && p.min_stock > 0) estado = 'Bajo Stock';
          wsStock.addRow({
            code: p.code || '-',
            name: p.name,
            stock: p.stock,
            min_stock: p.min_stock,
            unit_cost: toNumber(p.unit_cost).toFixed(2),
            stock_value: toNumber(p.stock_value).toFixed(2),
            status: estado,
          });
        });
        wsStock.getRow(1).font = { bold: true };
      }

      // Hoja 3: Bajo Stock
      if (lowStockProducts.length) {
        const wsLow = wb.addWorksheet('Bajo Stock');
        wsLow.columns = [
          { header: 'Código', key: 'code', width: 15 },
          { header: 'Producto', key: 'name', width: 35 },
          { header: 'Stock Actual', key: 'stock', width: 12 },
          { header: 'Stock Mínimo', key: 'min_stock', width: 12 },
          { header: 'Diferencia', key: 'diff', width: 12 },
          { header: 'Valor Stock', key: 'stock_value', width: 15 },
        ];
        lowStockProducts.forEach(p => {
          wsLow.addRow({
            code: p.code || '-',
            name: p.name,
            stock: p.stock,
            min_stock: p.min_stock,
            diff: p.stock - p.min_stock,
            stock_value: toNumber(p.stock_value).toFixed(2),
          });
        });
        wsLow.getRow(1).font = { bold: true };
      }

      // Hoja 4: Movimientos
      if (movements.length) {
        const wsMov = wb.addWorksheet('Movimientos');
        wsMov.columns = [
          { header: 'Fecha', key: 'date', width: 20 },
          { header: 'Producto', key: 'product', width: 35 },
          { header: 'Tipo', key: 'type', width: 12 },
          { header: 'Cantidad', key: 'qty', width: 12 },
          { header: 'Costo Unit.', key: 'cost', width: 15 },
          { header: 'Referencia', key: 'ref', width: 20 },
          { header: 'Notas', key: 'notes', width: 30 },
        ];
        movements.forEach(m => {
          wsMov.addRow({
            date: new Date(m.created_at).toLocaleString(),
            product: m.product_name,
            type: m.type === 'entrada' ? 'Entrada' : m.type === 'salida' ? 'Salida' : 'Ajuste',
            qty: Math.abs(toNumber(m.quantity)),
            cost: m.unit_cost ? `$${toNumber(m.unit_cost).toFixed(2)}` : '-',
            ref: m.reference_id || '-',
            notes: m.notes || '-',
          });
        });
        wsMov.getRow(1).font = { bold: true };
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Reporte exportado a Excel');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // IMPRESIÓN / PDF (window.print)
  // ============================================================
  const handlePrint = () => {
    const content = document.querySelector('.reports-inventory-container');
    if (!content) return;

    const originalTitle = document.title;
    document.title = `Reporte de Inventario - ${activeTab === 'summary' ? 'Resumen' : 
                         activeTab === 'stock' ? 'Stock Actual' : 
                         activeTab === 'movements' ? 'Movimientos' : 'Bajo Stock'}`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>Reporte de Inventario</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2c3e50; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .header { margin-bottom: 20px; }
        .filter-info { font-size: 12px; color: #666; margin-bottom: 15px; }
        @media print { .no-print { display: none; } button { display: none; } }
      </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte de Inventario - ${activeTab === 'summary' ? 'Resumen' : activeTab === 'stock' ? 'Stock Actual' : activeTab === 'movements' ? 'Movimientos' : 'Bajo Stock'}</h1>
          <div class="filter-info">
            Generado: ${new Date().toLocaleString()}
            ${activeTab === 'movements' ? `<br>Periodo: ${filterDate.from} al ${filterDate.to} ${productFilter ? ` - Producto: ${productsList.find(p => p.id === productFilter)?.name || productFilter}` : ''}` : ''}
          </div>
        </div>
        <div class="print-content">
          ${document.querySelector(activeTab === 'summary' ? '.kpi-cards' : 
                                  activeTab === 'stock' ? '.stock-table-container .table-responsive' :
                                  activeTab === 'movements' ? '.movements-container .table-responsive' :
                                  '.lowstock-container .table-responsive')?.outerHTML || 'No hay datos para imprimir'}
        </div>
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
    document.title = originalTitle;
  };

  // ========== Render ==========
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

        {/* Botones de exportación */}
        <div className="table-actions" style={{ justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' }}>
          <button className="btn-secondary" onClick={handleExportXLSX} disabled={exporting}>
            <Download size={16} /> {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>

        {/* Contenido de cada pestaña (igual que antes) */}
        {activeTab === 'summary' && summary && (
          <div className="kpi-cards">
            <div className="kpi-card"><div className="kpi-title">Productos Activos</div><div className="kpi-value">{summary.total_products}</div><Package size={24} className="kpi-icon" /></div>
            <div className="kpi-card"><div className="kpi-title">Unidades en Stock</div><div className="kpi-value">{summary.total_units}</div><Package size={24} className="kpi-icon" /></div>
            <div className="kpi-card"><div className="kpi-title">Valor de Inventario</div><div className="kpi-value">${summary.total_value.toFixed(2)}</div><DollarSign size={24} className="kpi-icon" /></div>
            <div className="kpi-card warning"><div className="kpi-title">Productos con Bajo Stock</div><div className="kpi-value">{summary.low_stock_count}</div><AlertTriangle size={24} className="kpi-icon" /></div>
            <div className="kpi-card danger"><div className="kpi-title">Productos Agotados</div><div className="kpi-value">{summary.out_of_stock_count}</div><TrendingDown size={24} className="kpi-icon" /></div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="stock-table-container">
            <div className="table-responsive">
              <table className="inventory-table">
                <thead><tr><th>Código</th><th>Producto</th><th>Stock</th><th>Stock Mín.</th><th>Costo Unit.</th><th>Valor Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {currentStock.map(p => (
                    <tr key={p.id}>
                      <td>{p.code || '-'}</td><td>{p.name}</td><td>{p.stock}</td><td>{p.min_stock}</td>
                      <td>${toNumber(p.unit_cost).toFixed(2)}</td><td>${toNumber(p.stock_value).toFixed(2)}</td>
                      <td>{p.stock === 0 ? 'Agotado' : (p.stock <= p.min_stock && p.min_stock > 0 ? 'Bajo Stock' : 'Normal')}</td>
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
              <div className="filter-group"><label>Desde</label><input type="date" value={filterDate.from} onChange={e => setFilterDate({...filterDate, from: e.target.value})} /></div>
              <div className="filter-group"><label>Hasta</label><input type="date" value={filterDate.to} onChange={e => setFilterDate({...filterDate, to: e.target.value})} /></div>
              <div className="filter-group"><label>Producto</label><select value={productFilter} onChange={e => setProductFilter(e.target.value)}><option value="">Todos</option>{productsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <button className="btn-secondary" onClick={loadMovements}><RefreshCw size={16} /> Actualizar</button>
            </div>
            <div className="table-responsive">
              <table className="movements-table">
                <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Costo Unit.</th><th>Referencia</th><th>Notas</th></tr></thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id}>
                      <td>{new Date(m.created_at).toLocaleString()}</td><td>{m.product_name}</td>
                      <td><span className={`movement-badge ${m.type}`}>{m.type === 'entrada' ? 'Entrada' : m.type === 'salida' ? 'Salida' : 'Ajuste'}</span></td>
                      <td>{Math.abs(toNumber(m.quantity))}</td>
                      <td>{m.unit_cost ? `$${toNumber(m.unit_cost).toFixed(2)}` : '-'}</td><td>{m.reference_id || '-'}</td><td>{m.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'lowstock' && (
          <div className="lowstock-container">
            <div className="table-responsive">
              <table className="inventory-table">
                <thead><tr><th>Código</th><th>Producto</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Diferencia</th><th>Valor Stock</th></tr></thead>
                <tbody>
                  {lowStockProducts.map(p => (
                    <tr key={p.id}>
                      <td>{p.code || '-'}</td><td>{p.name}</td><td className="danger-text">{p.stock}</td><td>{p.min_stock}</td>
                      <td className="danger-text">{p.stock - p.min_stock}</td><td>${toNumber(p.stock_value).toFixed(2)}</td>
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