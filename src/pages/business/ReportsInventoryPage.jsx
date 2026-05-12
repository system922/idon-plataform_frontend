import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import { 
  Package, AlertTriangle, DollarSign, TrendingDown, TrendingUp, 
  RefreshCw, Download, Loader, AlertCircle, Check
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

  // ========== Carga de datos (exactamente igual) ==========
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
  // EXPORTACIÓN A EXCEL **CON ESTILOS PROFESIONALES**
  // ============================================================
  const handleExportXLSX = async () => {
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Inventory';
      wb.created = new Date();

      // ─── Estilos comunes (igual que ReportsAdvanced) ────────────────────
      const COLORS = {
        headerBg:   '1E2840',   // azul oscuro
        sectionBg:  '2563EB',   // azul sección
        colHeaderBg:'DBEAFE',   // azul claro
        totalsBg:   '1E40AF',   // azul oscuro totales
        rowAlt:     'F0F7FF',
        white:      'FFFFFF',
        black:      '000000',
        positive:   '166534',
        negative:   '991B1B',
      };
      const border = {
        top:    { style: 'thin', color: { argb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
        left:   { style: 'thin', color: { argb: 'D1D5DB' } },
        right:  { style: 'thin', color: { argb: 'D1D5DB' } },
      };
      const applyStyle = (cell, style) => { cell.style = style; };
      
      const styleHeader = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } },
          font: { bold: true, size: 14, color: { argb: COLORS.white }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: 'center' },
        });
      };
      const styleSection = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } },
          font: { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: 'left' },
          border,
        });
      };
      const styleColHeader = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.colHeaderBg } },
          font: { bold: true, size: 9, color: { argb: '1E3A5F' }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border,
        });
      };
      const styleData = (cell, value, align = 'left', altRow = false, numFmt = null) => {
        cell.value = value;
        const style = {
          fill: altRow
            ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowAlt } }
            : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } },
          font: { size: 9, name: 'Calibri', color: { argb: COLORS.black } },
          alignment: { vertical: 'middle', horizontal: align },
          border,
        };
        if (numFmt) style.numFmt = numFmt;
        applyStyle(cell, style);
      };
      const styleTotals = (cell, value, align = 'center', numFmt = null) => {
        cell.value = value;
        const style = {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalsBg } },
          font: { bold: true, size: 9, color: { argb: COLORS.white }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: align },
          border: {
            top:    { style: 'medium', color: { argb: COLORS.white } },
            bottom: { style: 'medium', color: { argb: COLORS.white } },
            left:   { style: 'thin',   color: { argb: '3B82F6' } },
            right:  { style: 'thin',   color: { argb: '3B82F6' } },
          },
        };
        if (numFmt) style.numFmt = numFmt;
        applyStyle(cell, style);
      };

      // ─── Hoja 1: Resumen ────────────────────────────────────────────────
      if (summary) {
        const wsSum = wb.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
        wsSum.columns = [{ key: 'a', width: 30 }, { key: 'b', width: 20 }];
        
        wsSum.mergeCells('A1:B1');
        styleHeader(wsSum.getCell('A1'), 'REPORTE DE INVENTARIO');
        wsSum.getRow(1).height = 28;
        
        wsSum.getRow(2).height = 6;
        
        wsSum.mergeCells('A3:B3');
        styleSection(wsSum.getCell('A3'), '  RESUMEN EJECUTIVO');
        wsSum.getRow(3).height = 18;
        
        const kpis = [
          ['Productos Activos', summary.total_products, false, null],
          ['Unidades en Stock', summary.total_units, false, null],
          ['Valor de Inventario', summary.total_value, false, '#currency'],
          ['Productos con Bajo Stock', summary.low_stock_count, false, null],
          ['Productos Agotados', summary.out_of_stock_count, false, null],
        ];
        kpis.forEach(([label, value, bold, fmt], idx) => {
          const rowNum = 4 + idx;
          wsSum.getRow(rowNum).height = 16;
          const cA = wsSum.getCell(`A${rowNum}`);
          const cB = wsSum.getCell(`B${rowNum}`);
          const alt = idx % 2 === 1;
          styleData(cA, label, 'left', alt);
          if (fmt === '#currency') {
            styleData(cB, Number(value), 'right', alt, '"$"#,##0.00');
          } else {
            styleData(cB, value, 'right', alt);
          }
          if (bold) cB.font = { ...cB.font, bold: true };
        });
      }

      // ─── Hoja 2: Stock Actual (con estilos) ─────────────────────────────
      if (currentStock.length) {
        const wsStock = wb.addWorksheet('Stock Actual', { views: [{ showGridLines: false }] });
        wsStock.columns = [
          { header: 'Código', key: 'code', width: 15 },
          { header: 'Producto', key: 'name', width: 35 },
          { header: 'Stock', key: 'stock', width: 12 },
          { header: 'Stock Mín.', key: 'min_stock', width: 12 },
          { header: 'Costo Unit.', key: 'unit_cost', width: 15 },
          { header: 'Valor Total', key: 'stock_value', width: 15 },
          { header: 'Estado', key: 'status', width: 15 },
        ];
        
        wsStock.mergeCells('A1:G1');
        styleHeader(wsStock.getCell('A1'), 'STOCK ACTUAL');
        wsStock.getRow(1).height = 28;
        wsStock.getRow(2).height = 6;
        
        // Cabecera de columnas
        const headerRow = wsStock.getRow(3);
        wsStock.columns.forEach((col, idx) => {
          styleColHeader(wsStock.getCell(3, idx + 1), col.header);
        });
        headerRow.height = 16;
        
        // Filas de datos
        currentStock.forEach((p, idx) => {
          const rowNum = 4 + idx;
          const alt = idx % 2 === 1;
          styleData(wsStock.getCell(rowNum, 1), p.code || '-', 'left', alt);
          styleData(wsStock.getCell(rowNum, 2), p.name, 'left', alt);
          styleData(wsStock.getCell(rowNum, 3), p.stock, 'right', alt);
          styleData(wsStock.getCell(rowNum, 4), p.min_stock, 'right', alt);
          styleData(wsStock.getCell(rowNum, 5), toNumber(p.unit_cost), 'right', alt, '"$"#,##0.00');
          styleData(wsStock.getCell(rowNum, 6), toNumber(p.stock_value), 'right', alt, '"$"#,##0.00');
          const estado = p.stock === 0 ? 'Agotado' : (p.stock <= p.min_stock && p.min_stock > 0 ? 'Bajo Stock' : 'Normal');
          styleData(wsStock.getCell(rowNum, 7), estado, 'center', alt);
        });
      }

      // ─── Hoja 3: Bajo Stock (con estilos) ───────────────────────────────
      if (lowStockProducts.length) {
        const wsLow = wb.addWorksheet('Bajo Stock', { views: [{ showGridLines: false }] });
        wsLow.columns = [
          { header: 'Código', key: 'code', width: 15 },
          { header: 'Producto', key: 'name', width: 35 },
          { header: 'Stock Actual', key: 'stock', width: 12 },
          { header: 'Stock Mínimo', key: 'min_stock', width: 12 },
          { header: 'Diferencia', key: 'diff', width: 12 },
          { header: 'Valor Stock', key: 'stock_value', width: 15 },
        ];
        wsLow.mergeCells('A1:F1');
        styleHeader(wsLow.getCell('A1'), 'PRODUCTOS CON BAJO STOCK');
        wsLow.getRow(1).height = 28;
        wsLow.getRow(2).height = 6;
        
        const headerRow = wsLow.getRow(3);
        wsLow.columns.forEach((col, idx) => {
          styleColHeader(wsLow.getCell(3, idx + 1), col.header);
        });
        headerRow.height = 16;
        
        lowStockProducts.forEach((p, idx) => {
          const rowNum = 4 + idx;
          const alt = idx % 2 === 1;
          styleData(wsLow.getCell(rowNum, 1), p.code || '-', 'left', alt);
          styleData(wsLow.getCell(rowNum, 2), p.name, 'left', alt);
          styleData(wsLow.getCell(rowNum, 3), p.stock, 'right', alt);
          styleData(wsLow.getCell(rowNum, 4), p.min_stock, 'right', alt);
          styleData(wsLow.getCell(rowNum, 5), p.stock - p.min_stock, 'right', alt);
          styleData(wsLow.getCell(rowNum, 6), toNumber(p.stock_value), 'right', alt, '"$"#,##0.00');
        });
      }

      // ─── Hoja 4: Movimientos (con estilos) ───────────────────────────────
      if (movements.length) {
        const wsMov = wb.addWorksheet('Movimientos', { views: [{ showGridLines: false }] });
        wsMov.columns = [
          { header: 'Fecha', key: 'date', width: 20 },
          { header: 'Producto', key: 'product', width: 35 },
          { header: 'Tipo', key: 'type', width: 12 },
          { header: 'Cantidad', key: 'qty', width: 12 },
          { header: 'Costo Unit.', key: 'cost', width: 15 },
          { header: 'Referencia', key: 'ref', width: 20 },
          { header: 'Notas', key: 'notes', width: 30 },
        ];
        wsMov.mergeCells('A1:G1');
        styleHeader(wsMov.getCell('A1'), 'MOVIMIENTOS DE INVENTARIO');
        wsMov.getRow(1).height = 28;
        wsMov.getRow(2).height = 6;
        
        const headerRow = wsMov.getRow(3);
        wsMov.columns.forEach((col, idx) => {
          styleColHeader(wsMov.getCell(3, idx + 1), col.header);
        });
        headerRow.height = 16;
        
        movements.forEach((m, idx) => {
          const rowNum = 4 + idx;
          const alt = idx % 2 === 1;
          styleData(wsMov.getCell(rowNum, 1), new Date(m.created_at).toLocaleString(), 'left', alt);
          styleData(wsMov.getCell(rowNum, 2), m.product_name, 'left', alt);
          const tipo = m.type === 'entrada' ? 'Entrada' : m.type === 'salida' ? 'Salida' : 'Ajuste';
          styleData(wsMov.getCell(rowNum, 3), tipo, 'center', alt);
          styleData(wsMov.getCell(rowNum, 4), Math.abs(toNumber(m.quantity)), 'right', alt);
          const costo = m.unit_cost ? `$${toNumber(m.unit_cost).toFixed(2)}` : '-';
          styleData(wsMov.getCell(rowNum, 5), costo, 'right', alt);
          styleData(wsMov.getCell(rowNum, 6), m.reference_id || '-', 'left', alt);
          styleData(wsMov.getCell(rowNum, 7), m.notes || '-', 'left', alt);
        });
      }

      // ─── Descargar archivo ───────────────────────────────────────────────
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

      setError('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // CONFIGURACIÓN DEL PDF (customConfig) según pestaña activa
  // ============================================================
  const pdfConfig = (() => {
    if (activeTab === 'summary' && summary) {
      return {
        title: 'Reporte de Inventario - Resumen',
        kpis: [
          { label: 'Productos Activos', value: summary.total_products },
          { label: 'Unidades en Stock', value: summary.total_units },
          { label: 'Valor de Inventario', value: summary.total_value, formatter: (v) => `$${Number(v).toFixed(2)}` },
          { label: 'Productos con Bajo Stock', value: summary.low_stock_count },
          { label: 'Productos Agotados', value: summary.out_of_stock_count },
        ],
        sections: [],
      };
    }
    if (activeTab === 'stock' && currentStock.length) {
      const totalInventoryValue = currentStock.reduce((s, p) => s + toNumber(p.stock_value), 0);
      return {
        title: 'Reporte de Inventario - Stock Actual',
        kpis: [
          { label: 'Total Productos', value: currentStock.length },
          { label: 'Valor Total Inventario', value: totalInventoryValue, formatter: (v) => `$${v.toFixed(2)}` },
        ],
        sections: [{
          title: 'Listado de Productos',
          columns: [
            { label: 'Código', key: 'code', width: 15 },
            { label: 'Producto', key: 'name', width: 35 },
            { label: 'Stock', key: 'stock', width: 12 },
            { label: 'Stock Mín.', key: 'min_stock', width: 12 },
            { label: 'Costo Unit.', key: 'unit_cost', width: 15, formatter: (v) => `$${Number(v).toFixed(2)}` },
            { label: 'Valor Total', key: 'stock_value', width: 15, formatter: (v) => `$${Number(v).toFixed(2)}` },
            { label: 'Estado', key: 'status', width: 15 }
          ],
          rows: currentStock.map(p => ({
            code: p.code || '-',
            name: p.name,
            stock: p.stock,
            min_stock: p.min_stock,
            unit_cost: p.unit_cost,
            stock_value: p.stock_value,
            status: p.stock === 0 ? 'Agotado' : (p.stock <= p.min_stock && p.min_stock > 0 ? 'Bajo Stock' : 'Normal')
          }))
        }]
      };
    }
    if (activeTab === 'lowstock' && lowStockProducts.length) {
      const totalRiskValue = lowStockProducts.reduce((s, p) => s + toNumber(p.stock_value), 0);
      return {
        title: 'Reporte de Inventario - Productos con Bajo Stock',
        kpis: [
          { label: 'Productos en Riesgo', value: lowStockProducts.length },
          { label: 'Valor en Riesgo', value: totalRiskValue, formatter: (v) => `$${v.toFixed(2)}` },
        ],
        sections: [{
          title: 'Productos por debajo del stock mínimo',
          columns: [
            { label: 'Código', key: 'code', width: 15 },
            { label: 'Producto', key: 'name', width: 35 },
            { label: 'Stock Actual', key: 'stock', width: 12 },
            { label: 'Stock Mínimo', key: 'min_stock', width: 12 },
            { label: 'Faltante', key: 'diff', width: 12 },
            { label: 'Valor Stock', key: 'stock_value', width: 15, formatter: (v) => `$${Number(v).toFixed(2)}` },
          ],
          rows: lowStockProducts.map(p => ({
            code: p.code || '-',
            name: p.name,
            stock: p.stock,
            min_stock: p.min_stock,
            diff: p.stock - p.min_stock,
            stock_value: p.stock_value,
          }))
        }]
      };
    }
    if (activeTab === 'movements' && movements.length) {
      const entradaCount = movements.filter(m => m.type === 'entrada').length;
      const salidaCount = movements.filter(m => m.type === 'salida').length;
      return {
        title: `Reporte de Movimientos de Inventario`,
        kpis: [
          { label: 'Total Movimientos', value: movements.length },
          { label: 'Entradas', value: entradaCount },
          { label: 'Salidas', value: salidaCount },
        ],
        sections: [{
          title: 'Detalle de Movimientos',
          columns: [
            { label: 'Fecha', key: 'date', width: 20 },
            { label: 'Producto', key: 'product', width: 35 },
            { label: 'Tipo', key: 'type', width: 12 },
            { label: 'Cantidad', key: 'qty', width: 12 },
            { label: 'Costo Unit.', key: 'cost', width: 15, formatter: (v) => v !== '-' ? v : '-' },
            { label: 'Referencia', key: 'ref', width: 20 },
            { label: 'Notas', key: 'notes', width: 30 },
          ],
          rows: movements.map(m => ({
            date: new Date(m.created_at).toLocaleString(),
            product: m.product_name,
            type: m.type === 'entrada' ? 'Entrada' : m.type === 'salida' ? 'Salida' : 'Ajuste',
            qty: Math.abs(toNumber(m.quantity)),
            cost: m.unit_cost ? `$${toNumber(m.unit_cost).toFixed(2)}` : '-',
            ref: m.reference_id || '-',
            notes: m.notes || '-',
          }))
        }]
      };
    }
    return null;
  })();

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

        <div className="table-actions" style={{ justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' }}>
          <button className="btn-secondary" onClick={handleExportXLSX} disabled={exporting}>
            <Download size={16} /> {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <ReportPdfButton
            customConfig={pdfConfig}
            dateRange={activeTab === 'movements' ? { from: filterDate.from, to: filterDate.to } : null}
            groupBy={null}
            className="btn-secondary"
          />
        </div>

        {/* Contenido de pestañas (sin cambios, igual que original) */}
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
                      <td>{p.code || '-'}</td>
                      <td>{p.name}</td>
                      <td>{p.stock}</td>
                      <td>{p.min_stock}</td>
                      <td>${toNumber(p.unit_cost).toFixed(2)}</td>
                      <td>${toNumber(p.stock_value).toFixed(2)}</td>
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
                      <td>{new Date(m.created_at).toLocaleString()}</td>
                      <td>{m.product_name}</td>
                      <td><span className={`movement-badge ${m.type}`}>{m.type === 'entrada' ? 'Entrada' : m.type === 'salida' ? 'Salida' : 'Ajuste'}</span></td>
                      <td>{Math.abs(toNumber(m.quantity))}</td>
                      <td>{m.unit_cost ? `$${toNumber(m.unit_cost).toFixed(2)}` : '-'}</td>
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
            <div className="table-responsive">
              <table className="inventory-table">
                <thead><tr><th>Código</th><th>Producto</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Diferencia</th><th>Valor Stock</th></tr></thead>
                <tbody>
                  {lowStockProducts.map(p => (
                    <tr key={p.id}>
                      <td>{p.code || '-'}</td>
                      <td>{p.name}</td>
                      <td className="danger-text">{p.stock}</td>
                      <td>{p.min_stock}</td>
                      <td className="danger-text">{p.stock - p.min_stock}</td>
                      <td>${toNumber(p.stock_value).toFixed(2)}</td>
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