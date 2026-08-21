import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from '../../context/SessionContext';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import { ButtonGroup } from '../../components/General/Button';
import SearchInput from '../../components/General/SearchInput';
import CustomCombobox from '../../components/General/CustomCombobox';
import {
  TrendingUp, TrendingDown, DollarSign,
  AlertCircle, Check
} from 'react-feather';
import { FiRefreshCw, FiPackage } from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

import ReportPdfButton from '../../components/ReportPdfButton';
import ReportExcelButton from '../../components/ReportExcelGenerator';
import Modal from '../../components/General/Modal';

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDate = (isoDate) => {
  if (!isoDate) return '';
  if (typeof isoDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return String(isoDate);
  return date.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Guayaquil'
  });
};

const normalizeDate = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return String(dateValue);
  return date.toISOString().split('T')[0];
};

const money = (val) => {
  const num = Number(val) || 0;
  return `$${num.toFixed(2)}`;
};

const fmtCurrency = (n) => `$${Number(n || 0).toFixed(2)}`;

// ─── Nombres de meses ──────────────────────────────────────────────────────
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// ─── Componente de selector de fechas personalizadas ──────────────────────
function DateRangePicker({ startDate, endDate, onApply, onClose }) {
  const [localStart, setLocalStart] = useState(startDate || '');
  const [localEnd, setLocalEnd] = useState(endDate || '');

  const handleApply = () => {
    if (localStart && localEnd) onApply(localStart, localEnd);
  };

  return (
    <div className="report-date-range-picker">
      <div className="report-date-range-inputs">
        <input type="date" value={localStart} onChange={(e) => setLocalStart(e.target.value)} placeholder="Fecha inicial" />
        <span>a</span>
        <input type="date" value={localEnd} onChange={(e) => setLocalEnd(e.target.value)} placeholder="Fecha final" />
      </div>
      <div className="report-date-range-actions">
        <button onClick={onClose} className="report-btn-cancel">Cancelar</button>
        <button onClick={handleApply} className="report-btn-apply" disabled={!localStart || !localEnd}>Aplicar</button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ReportsProfit() {
  const { user } = useSession();

  // ─── Estados de filtros ──────────────────────────────────────────────────
  const [groupBy, setGroupBy] = useState('day');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [filterCategory, setFilterCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // ─── Estados de datos ────────────────────────────────────────────────────
  const [data, setData] = useState(null);
  const [profitDetail, setProfitDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const chartLineRef = useRef(null);

  // ─── Cargar categorías ──────────────────────────────────────────────────
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (loadingCategories) return;
    try {
      setLoadingCategories(true);
      const res = await fetchWithAuth('/reports/products/categories');
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setCategories(Array.isArray(data.data) ? data.data : []);
      } else {
        setCategories([]);
      }
    } catch (err) {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // ─── Cargar reporte ──────────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Cargar datos avanzados (ventas, gastos)
      let url = `/reports/advanced?groupBy=${groupBy}`;

      let fromDate = dateRange.from;
      let toDate = dateRange.to;

      if (groupBy === 'day' || groupBy === 'month') {
        if (dateRange.from) url += `&from=${dateRange.from}`;
        if (dateRange.to) url += `&to=${dateRange.to}`;
      } else if (groupBy === 'year') {
        fromDate = `${selectedYear}-01-01`;
        toDate = `${selectedYear}-12-31`;
        url += `&from=${fromDate}&to=${toDate}`;
      }

      const res = await fetchWithAuth(url);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || `HTTP ${res.status}: Error al cargar reporte`);
      }

      setData(result);

      // 2. Cargar detalle de ganancias por producto (con filtro de categoría)
      if (fromDate && toDate) {
        try {
          let profitUrl = `/reports/profit-detail?from=${fromDate}&to=${toDate}`;
          if (filterCategory) {
            profitUrl += `&category=${filterCategory}`;
          }
          const profitRes = await fetchWithAuth(profitUrl);
          if (profitRes.ok) {
            const profitData = await profitRes.json();
            setProfitDetail(profitData.data);
          }
        } catch (err) {
          console.warn('Error cargando detalle de ganancias:', err);
          setProfitDetail(null);
        }
      }
    } catch (err) {
      setError(err.message || 'Error desconocido al cargar reporte');
    } finally {
      setLoading(false);
    }
  }, [groupBy, dateRange, selectedYear, filterCategory]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  }, [loadReport]);

  // ─── Totales ──────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (!data || !data.totals) {
      return {
        totalVentas: 0,
        totalCosto: 0,
        gananciaBruta: 0,
        totalGastos: 0,
        gananciaNeta: 0,
        margen: 0,
        margenBruto: 0,
        totalIva: 0,
        totalOrdenes: 0,
      };
    }
    const t = data.totals;
    const costoAbs = Math.abs(t.total_costo_fifo || 0);
    const ventas = t.total_ventas || 0;
    const gananciaBruta = ventas - costoAbs;
    const gastos = t.total_gastos || 0;
    const gananciaNeta = gananciaBruta - gastos;
    const margen = ventas > 0 ? (gananciaNeta / ventas) * 100 : 0;

    return {
      totalVentas: ventas,
      totalCosto: costoAbs,
      gananciaBruta: gananciaBruta,
      totalGastos: gastos,
      gananciaNeta: gananciaNeta,
      margen: margen,
      margenBruto: ventas > 0 ? (gananciaBruta / ventas) * 100 : 0,
      totalIva: t.total_iva || 0,
      totalOrdenes: t.total_ordenes || 0,
    };
  }, [data]);

  // ─── Datos de ventas (salesData) ────────────────────────────────────────
  const salesData = useMemo(() => {
    if (!data?.sales || !Array.isArray(data.sales)) return [];
    return data.sales.map((s) => ({
      date: s.date || '',
      total_sales: Number(s.total_sales) || 0,
      total_cost: Math.abs(Number(s.total_cost) || 0),
      profit: Number(s.profit) || 0,
      orders: Number(s.orders) || 0,
      iva: Number(s.iva) || 0,
    }));
  }, [data]);

  // ─── Datos para gráfico ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!salesData.length) return [];

    const expensesMap = new Map(
      (data?.expenses || []).map((expense) => [
        normalizeDate(expense.date),
        Number(expense.total_expenses) || 0,
      ])
    );

    return salesData.map((s) => {
      const dateKey = normalizeDate(s.date);
      const gasto = expensesMap.get(dateKey) || 0;

      let dateFormatted;
      if (groupBy === 'year') {
        const [year, month] = dateKey.split('-');
        dateFormatted = MONTHS[parseInt(month) - 1];
      } else {
        dateFormatted = formatDate(dateKey);
      }

      return {
        date: s.date,
        dateKey,
        dateFormatted,
        Ventas: s.total_sales,
        CostoFIFO: s.total_cost,
        Ganancia: s.profit,
        Gastos: gasto,
        GananciaNeta: s.profit - gasto,
      };
    });
  }, [salesData, data, groupBy]);

  // ─── Datos para tabla de ventas ──────────────────────────────────────────
  const tableData = useMemo(() => {
    return salesData.map((s) => {
      const dateKey = normalizeDate(s.date);
      const gasto = data?.expenses?.find(e => normalizeDate(e.date) === dateKey)?.total_expenses || 0;
      const gananciaNeta = s.profit - Number(gasto);

      let dateFormatted;
      if (groupBy === 'year') {
        const [year, month] = dateKey.split('-');
        dateFormatted = MONTHS[parseInt(month) - 1];
      } else {
        dateFormatted = dateKey ? dateKey.slice(8, 10) + '/' + dateKey.slice(5, 7) : formatDate(dateKey);
      }

      return {
        id: dateKey,
        date: s.date,
        dateFormatted: dateFormatted,
        ventas: s.total_sales,
        costo: s.total_cost,
        gananciaBruta: s.profit,
        gastos: Number(gasto),
        gananciaNeta: gananciaNeta,
        margenPorcentaje: s.total_sales > 0 ? +((gananciaNeta / s.total_sales) * 100).toFixed(1) : 0,
        empty: '',
      };
    });
  }, [salesData, data, groupBy]);

  // ─── Datos para tabla de ganancias por producto ──────────────────────────
  const profitTableData = useMemo(() => {
    if (!profitDetail?.products) return [];
    return profitDetail.products.map(p => ({
      id: p.product_id,
      product_name: p.product_name,
      barcode: p.barcode || '-',
      category: p.category_name || 'Sin categoría',
      quantity: p.total_quantity,
      precio_promedio: p.precio_promedio || 0,
      costo_promedio: p.costo_promedio || 0,
      total_ventas: p.total_ventas || 0,
      total_costo: p.total_costo || 0,
      total_ganancia: p.total_ganancia || 0,
      margen: p.margen || 0,
    }));
  }, [profitDetail]);

  // ─── Datos filtrados ──────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;
    const term = searchTerm.toLowerCase();
    return tableData.filter(row =>
      row.dateFormatted.toLowerCase().includes(term) ||
      row.ventas.toString().includes(term) ||
      row.costo.toString().includes(term) ||
      row.gananciaBruta.toString().includes(term) ||
      row.gananciaNeta.toString().includes(term)
    );
  }, [tableData, searchTerm]);

  // ─── Filtro de productos por búsqueda ────────────────────────────────────
  const filteredProfitData = useMemo(() => {
    if (!profitTableData.length) return [];
    const term = searchTerm.toLowerCase().trim();
    if (!term) return profitTableData;
    return profitTableData.filter(p =>
      p.product_name?.toLowerCase().includes(term) ||
      p.barcode?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );
  }, [profitTableData, searchTerm]);

  // ─── Helper para texto del período ──────────────────────────────────────
  const getPeriodText = useCallback(() => {
    const groupLabels = { day: 'Día', month: 'Mes', year: 'Año' };
    const label = groupLabels[groupBy] || groupBy;

    if (groupBy === 'day') {
      return `${label}: ${formatDate(dateRange.from)} al ${formatDate(dateRange.to)}`;
    } else if (groupBy === 'month') {
      const [year, month] = dateRange.from?.split('-') || [];
      return `${label}: ${MONTHS[parseInt(month) - 1]} ${year}`;
    } else if (groupBy === 'year') {
      return `${label}: ${selectedYear}`;
    }
    return '';
  }, [groupBy, dateRange, selectedYear]);

  // ─── Nombre de archivo ────────────────────────────────────────────────────
  const getFilename = useCallback(() => {
    const baseName = 'reporte_ganancias';
    if (groupBy === 'day') {
      const fromFormatted = formatDate(dateRange.from).replace(/\//g, '-');
      const toFormatted = formatDate(dateRange.to).replace(/\//g, '-');
      if (dateRange.from === dateRange.to) {
        return `${baseName}_${fromFormatted}`;
      } else {
        return `${baseName}_${fromFormatted}--${toFormatted}`;
      }
    }
    if (groupBy === 'month') {
      const [year, month] = dateRange.from.split('-');
      const monthName = MONTHS[parseInt(month) - 1];
      return `${baseName}_${monthName}-${year}`;
    }
    if (groupBy === 'year') {
      return `${baseName}_${selectedYear}`;
    }
    return `${baseName}_${dateRange.from || selectedYear || 'sin-fecha'}`;
  }, [groupBy, dateRange, selectedYear]);

  // ─── Configuración para Excel ────────────────────────────────────────────
  const excelConfig = useMemo(() => {
    if (!data) return null;

    const {
      totalVentas,
      totalCosto,
      gananciaBruta,
      totalGastos,
      gananciaNeta,
      margen,
    } = totals;

    const groupLabels = { day: 'Día', month: 'Mes', year: 'Año' };
    const groupLabel = groupLabels[groupBy] || groupBy;
    const periodText = getPeriodText();
    const filename = getFilename();

    // Columnas tabla de período
    const columnsPeriod = [
      { label: groupBy === 'year' ? 'Mes' : groupLabel, key: 'dateFormatted', align: 'left', width: 6 },
      { label: 'Ventas ($)', key: 'ventas', align: 'right', width: 8, numFmt: '"$"#,##0.00', total: true },
      { label: 'Costo FIFO ($)', key: 'costo', align: 'right', width: 10, numFmt: '"$"#,##0.00', total: true },
      { label: 'Ganancia B.', key: 'gananciaBruta', align: 'right', width: 10, numFmt: '"$"#,##0.00', total: true },
      { label: 'Gastos ($)', key: 'gastos', align: 'right', width: 8, numFmt: '"$"#,##0.00', total: true },
      { label: 'Ganancia N.', key: 'gananciaNeta', align: 'right', width: 10, numFmt: '"$"#,##0.00', total: true },
      { label: 'Margen (%)', key: 'margenPorcentaje', align: 'right', width: 10, numFmt: '0.0"%"', mergeWithNext: true },
      { label: '', key: 'empty', align: 'left', width: 2 },
    ];

    // Columnas tabla de productos
    const columnsProfit = [
      { label: 'Producto', key: 'product_name', align: 'left', width: 25 },
      { label: 'Código de barras', key: 'barcode', align: 'left', width: 18 },
      { label: 'Categoría', key: 'category', align: 'left', width: 18 },
      { label: 'Cantidad', key: 'quantity', align: 'right', width: 4, numFmt: '#,##0' },
      { label: 'Precio Prom.', key: 'precio_promedio', align: 'right', width: 8, numFmt: '"$"#,##0.00' },
      { label: 'Costo Prom.', key: 'costo_promedio', align: 'right', width: 6, numFmt: '"$"#,##0.00' },
      { label: 'T. Ventas', key: 'total_ventas', align: 'right', width: 4, numFmt: '"$"#,##0.00', total: true },
      { label: 'Costo FIFO', key: 'total_costo', align: 'right', width: 4, numFmt: '"$"#,##0.00', total: true },
      { label: 'Ganancia', key: 'total_ganancia', align: 'right', width: 4, numFmt: '"$"#,##0.00', total: true },
      { label: 'Margen %', key: 'margen', align: 'right', width: 8, numFmt: '0.0"%"' },
    ];

    const profitRows = profitTableData.map(p => ({
      product_name: p.product_name,
      barcode: p.barcode || '-',
      category: p.category || 'Sin categoría',
      quantity: p.quantity,
      precio_promedio: p.precio_promedio || 0,
      costo_promedio: p.costo_promedio || 0,
      total_ventas: p.total_ventas || 0,
      total_costo: p.total_costo || 0,
      total_ganancia: p.total_ganancia || 0,
      margen: p.margen || 0,
    }));

    return {
      columns: columnsPeriod,
      title: 'REPORTE DE GANANCIAS',
      subtitle: 'Análisis de Ventas, Gastos y Rentabilidad',
      period: periodText,
      filename,
      confidential: true,
      kpis: [
        { label: 'Ventas Totales', value: totalVentas, formatter: fmtCurrency },
        { label: 'Costo de Ventas (FIFO)', value: totalCosto, formatter: fmtCurrency },
        { label: 'Ganancia Bruta', value: gananciaBruta, formatter: fmtCurrency, bold: true },
        { label: 'Gastos Operativos', value: totalGastos, formatter: fmtCurrency },
        { label: 'Ganancia Neta', value: gananciaNeta, formatter: fmtCurrency, bold: true },
        { label: 'Margen de Ganancia', value: margen, formatter: (v) => `${Number(v).toFixed(1)}%`, bold: true },
        { label: 'Total Órdenes', value: totals.totalOrdenes || 0, formatter: (v) => Number(v).toLocaleString() },
      ],
      sections: [
        ...(tableData.length ? [{
          title: `DETALLE POR ${groupLabel.toUpperCase()}`,
          columns: columnsPeriod,
          rows: tableData,
          showTotals: true,
        }] : []),
        ...(profitRows.length ? [{
          title: 'GANANCIAS POR PRODUCTO',
          columns: columnsProfit,
          rows: profitRows,
          showTotals: true,
        }] : []),
      ],
      observations: [
        `Reporte generado para el período ${periodText}.`,
        `Total de órdenes: ${totals.totalOrdenes || 0}.`,
        'Las cifras están expresadas en dólares americanos (USD).',
        totals.gananciaNeta >= 0
          ? '✅ El período presenta ganancias positivas.'
          : '⚠️ El período presenta pérdidas. Se recomienda revisar los gastos operativos.',
      ],
      signatures: [
        { name: user?.firstName || user?.nombre || 'Usuario', role: 'Responsable del Reporte', date: new Date().toISOString() },
        { name: 'Gerencia', role: 'Aprobación', date: new Date().toISOString() },
      ],
    };
  }, [data, tableData, profitTableData, totals, groupBy, getPeriodText, getFilename, user]);

  // ─── Configuración para PDF ──────────────────────────────────────────────
  const reportConfig = useMemo(() => {
    if (!data) return null;

    const {
      totalVentas,
      totalCosto,
      gananciaBruta,
      totalGastos,
      gananciaNeta,
      margen,
    } = totals;

    const groupLabels = { day: 'Día', month: 'Mes', year: 'Año' };
    const groupLabel = groupLabels[groupBy] || groupBy;
    const periodText = getPeriodText();
    const filename = getFilename();

    const profitRows = profitTableData.map(p => ({
      product_name: p.product_name,
      barcode: p.barcode || '-',
      category: p.category || 'Sin categoría',
      quantity: p.quantity,
      precio_promedio: p.precio_promedio || 0,
      costo_promedio: p.costo_promedio || 0,
      total_ventas: p.total_ventas || 0,
      total_costo: p.total_costo || 0,
      total_ganancia: p.total_ganancia || 0,
      margen: p.margen || 0,
    }));

    return {
      title: 'REPORTE DE GANANCIAS',
      subtitle: 'Análisis de Ventas, Gastos y Rentabilidad',
      period: periodText,
      filename,
      confidential: true,
      landscape: false,
      kpis: [
        { label: 'Ventas Totales', value: totalVentas, formatter: fmtCurrency },
        { label: 'Costo de Ventas (FIFO)', value: totalCosto, formatter: fmtCurrency },
        { label: 'Ganancia B.', value: gananciaBruta, formatter: fmtCurrency, bold: true },
        { label: 'Gastos Operativos', value: totalGastos, formatter: fmtCurrency },
        { label: 'Ganancia N.', value: gananciaNeta, formatter: fmtCurrency, bold: true },
        { label: 'Margen de Ganancia', value: margen, formatter: (v) => `${Number(v).toFixed(1)}%`, bold: true },
        { label: 'Total Órdenes', value: totals.totalOrdenes || 0, formatter: (v) => Number(v).toLocaleString() },
      ],
      sections: [
        ...(tableData.length ? [{
          title: `DETALLE POR ${groupLabel.toUpperCase()}`,
          columns: [
            { label: groupBy === 'year' ? 'Mes' : groupLabel, key: 'dateFormatted', align: 'left' },
            { label: 'Ventas ($)', key: 'ventas', align: 'right', formatter: fmtCurrency, total: true },
            { label: 'Costo FIFO ($)', key: 'costo', align: 'right', formatter: fmtCurrency, total: true },
            { label: 'Ganancia Bruta ($)', key: 'gananciaBruta', align: 'right', formatter: fmtCurrency, total: true },
            { label: 'Gastos ($)', key: 'gastos', align: 'right', formatter: fmtCurrency, total: true },
            { label: 'Ganancia Neta ($)', key: 'gananciaNeta', align: 'right', formatter: fmtCurrency, total: true },
            { label: 'Margen (%)', key: 'margenPorcentaje', align: 'right', formatter: (v) => `${Number(v).toFixed(1)}%` },
          ],
          rows: tableData,
          showTotals: true,
        }] : []),
        ...(profitRows.length ? [{
          title: 'GANANCIAS POR PRODUCTO',
          columns: [
            { label: 'Producto', key: 'product_name', align: 'left' },
            { label: 'Código de barras', key: 'barcode', align: 'left' },
            { label: 'Categoría', key: 'category', align: 'left' },
            { label: 'Cantidad', key: 'quantity', align: 'right' },
            { label: 'Precio Prom.', key: 'precio_promedio', align: 'right', formatter: fmtCurrency },
            { label: 'Costo Prom.', key: 'costo_promedio', align: 'right', formatter: fmtCurrency },
            { label: 'Total Ventas', key: 'total_ventas', align: 'right', formatter: fmtCurrency, total: true },
            { label: 'Costo FIFO', key: 'total_costo', align: 'right', formatter: fmtCurrency, total: true },
            { label: 'Ganancia', key: 'total_ganancia', align: 'right', formatter: fmtCurrency, total: true },
            { label: 'Margen %', key: 'margen', align: 'right', formatter: (v) => `${Number(v).toFixed(1)}%` },
          ],
          rows: profitRows,
          showTotals: true,
        }] : []),
      ],
      chartRefs: [chartLineRef],
      observations: [
        `Reporte generado para el período ${periodText}.`,
        `Total de órdenes: ${totals.totalOrdenes || 0}.`,
        'Las cifras están expresadas en dólares americanos (USD).',
        totals.gananciaNeta >= 0
          ? '✅ El período presenta ganancias positivas.'
          : '⚠️ El período presenta pérdidas. Se recomienda revisar los gastos operativos.',
      ],
      signatures: [
        { name: user?.firstName || user?.nombre || 'Usuario', role: 'Responsable del Reporte', date: new Date().toISOString() },
        { name: 'Gerencia', role: 'Aprobación', date: new Date().toISOString() },
      ],
    };
  }, [data, tableData, profitTableData, totals, groupBy, dateRange, selectedYear, user, getPeriodText, getFilename, chartLineRef]);

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = useMemo(() => (
    <div className="users-toolbar">
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar por fecha, monto o producto..."
        size="md"
        variant="bordered"
        className="users-search-input"
        onClear={() => setSearchTerm('')}
        autoFocus={false}
      />
      <ButtonGroup>
        <ReportExcelButton
          config={excelConfig}
          onSuccess={() => {
            setSuccess('Excel generado correctamente');
            setTimeout(() => setSuccess(''), 3000);
          }}
          onError={(err) => {
            setError('Error al generar Excel: ' + err.message);
            setTimeout(() => setError(''), 5000);
          }}
        />
        <ReportPdfButton
          customConfig={reportConfig}
          dateRange={dateRange}
          groupBy={groupBy}
          onSuccess={() => {
            setSuccess('PDF generado correctamente');
            setTimeout(() => setSuccess(''), 3000);
          }}
          onError={(err) => {
            setError('Error al generar PDF: ' + err.message);
            setTimeout(() => setError(''), 5000);
          }}
        />
      </ButtonGroup>
    </div>
  ), [searchTerm, excelConfig, reportConfig, dateRange, groupBy]);

  // ─── Botón de refresh ──────────────────────────────────────────────────────
  const refreshButton = useMemo(() => (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  ), [handleRefresh, refreshing]);

  // ─── Columnas para tabla de ventas ────────────────────────────────────────
  const columns = useMemo(() => [
    {
      accessor: 'dateFormatted',
      label: 'Fecha / Período',
      render: (item) => <span>{item.dateFormatted}</span>,
    },
    {
      accessor: 'ventas',
      label: 'Ventas ($)',
      align: 'right',
      render: (item) => <span style={{ fontWeight: 500 }}>${item.ventas.toFixed(2)}</span>,
    },
    {
      accessor: 'costo',
      label: 'Costo FIFO ($)',
      align: 'right',
      render: (item) => <span style={{ fontWeight: 500 }}>${item.costo.toFixed(2)}</span>,
    },
    {
      accessor: 'gananciaBruta',
      label: 'Ganancia Bruta ($)',
      align: 'right',
      render: (item) => (
        <span
          style={{
            fontWeight: 600,
            color: item.gananciaBruta >= 0 ? 'var(--success)' : 'var(--danger)',
          }}
        >
          ${item.gananciaBruta.toFixed(2)}
        </span>
      ),
    },
    {
      accessor: 'gastos',
      label: 'Gastos ($)',
      align: 'right',
      render: (item) => <span style={{ fontWeight: 500 }}>${item.gastos.toFixed(2)}</span>,
    },
    {
      accessor: 'gananciaNeta',
      label: 'Ganancia Neta ($)',
      align: 'right',
      render: (item) => (
        <span
          style={{
            fontWeight: 600,
            color: item.gananciaNeta >= 0 ? 'var(--success)' : 'var(--danger)',
          }}
        >
          ${item.gananciaNeta.toFixed(2)}
        </span>
      ),
    },
    {
      accessor: 'margenPorcentaje',
      label: 'Margen (%)',
      align: 'right',
      render: (item) => (
        <span
          style={{
            fontWeight: 600,
            color: item.gananciaNeta >= 0 ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {item.margenPorcentaje}%
        </span>
      ),
    },
  ], []);

  // ─── Columnas para tabla de productos ─────────────────────────────────────
  const profitColumns = useMemo(() => [
    {
      accessor: 'product_name',
      label: 'Producto',
      render: (item) => <span style={{ fontWeight: 500 }}>{item.product_name}</span>,
    },
    {
      accessor: 'barcode',
      label: 'Código de barras',
      render: (item) => <span>{item.barcode || '-'}</span>,
    },
    {
      accessor: 'category',
      label: 'Categoría',
      render: (item) => <span>{item.category || 'Sin categoría'}</span>,
    },
    {
      accessor: 'quantity',
      label: 'Cantidad',
      align: 'right',
      render: (item) => <span>{item.quantity}</span>,
    },
    {
      accessor: 'precio_promedio',
      label: 'Precio Prom.',
      align: 'right',
      render: (item) => <span>${item.precio_promedio?.toFixed(2) || '0.00'}</span>,
    },
    {
      accessor: 'costo_promedio',
      label: 'Costo Prom.',
      align: 'right',
      render: (item) => <span>${item.costo_promedio?.toFixed(2) || '0.00'}</span>,
    },
    {
      accessor: 'total_ventas',
      label: 'Total Ventas',
      align: 'right',
      render: (item) => <span style={{ fontWeight: 500 }}>${item.total_ventas?.toFixed(2) || '0.00'}</span>,
    },
    {
      accessor: 'total_costo',
      label: 'Costo FIFO',
      align: 'right',
      render: (item) => <span>${item.total_costo?.toFixed(2) || '0.00'}</span>,
    },
    {
      accessor: 'total_ganancia',
      label: 'Ganancia',
      align: 'right',
      render: (item) => (
        <span
          style={{
            fontWeight: 600,
            color: item.total_ganancia >= 0 ? 'var(--success)' : 'var(--danger)',
          }}
        >
          ${item.total_ganancia?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      accessor: 'margen',
      label: 'Margen %',
      align: 'right',
      render: (item) => (
        <span
          style={{
            fontWeight: 600,
            color: item.margen >= 0 ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {item.margen?.toFixed(1) || '0.0'}%
        </span>
      ),
    },
  ], []);

  // ─── Footer para tabla de productos ──────────────────────────────────────
  const profitFooter = useMemo(() => {
    if (!profitDetail?.summary) return null;
    const s = profitDetail.summary;
    return (
      <tr className="table-footer-totals">
        <td><strong>TOTAL</strong></td>
        <td></td>
        <td></td>
        <td className="text-right"></td>
        <td className="text-right"></td>
        <td className="text-right"></td>
        <td className="text-right">
          <strong style={{ color: 'var(--text-primary)' }}>${s.total_ventas?.toFixed(2) || '0.00'}</strong>
        </td>
        <td className="text-right">
          <strong style={{ color: 'var(--text-primary)' }}>${s.total_costo?.toFixed(2) || '0.00'}</strong>
        </td>
        <td className="text-right">
          <strong style={{ color: 'var(--success)' }}>${s.total_ganancia?.toFixed(2) || '0.00'}</strong>
        </td>
        <td className="text-right">
          <strong style={{ color: 'var(--success)' }}>{s.margen_promedio?.toFixed(1) || '0.0'}%</strong>
        </td>
      </tr>
    );
  }, [profitDetail]);

  // ─── Footer para tabla de ventas ──────────────────────────────────────────
  const tableFooter = useMemo(() => {
    if (!filteredData.length) return null;
    return (
      <tr className="table-footer-totals">
        <td><strong>TOTALES</strong></td>
        <td className="text-right">
          <strong style={{ color: 'var(--text-primary)' }}>
            ${totals.totalVentas.toFixed(2)}
          </strong>
        </td>
        <td className="text-right">
          <strong style={{ color: 'var(--text-primary)' }}>
            ${totals.totalCosto.toFixed(2)}
          </strong>
        </td>
        <td className={`text-right ${totals.gananciaNeta >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>${totals.gananciaBruta.toFixed(2)}</strong>
        </td>
        <td className="text-right">
          <strong style={{ color: 'var(--text-primary)' }}>
            ${totals.totalGastos.toFixed(2)}
          </strong>
        </td>
        <td className={`text-right ${totals.gananciaNeta >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>${totals.gananciaNeta.toFixed(2)}</strong>
        </td>
        <td className={`text-right ${totals.margen >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>{totals.margen.toFixed(1)}%</strong>
        </td>
      </tr>
    );
  }, [filteredData, totals]);

  // ─── Items per page ───────────────────────────────────────────────────────
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="REPORTE DE GANANCIAS"
      subtitle="Análisis de ventas, costos y rentabilidad"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      <div className="reports-advanced-container custom-dashboard">
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

        {/* FILTROS */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Agrupar por</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="day">Día</option>
              <option value="month">Mes</option>
              <option value="year">Año</option>
            </select>
          </div>

          {(groupBy === 'day' || groupBy === 'month') && (
            <div className="filter-group">
              <label>{groupBy === 'month' ? 'Mes Desde' : 'Fecha Desde'}</label>
              <input
                type={groupBy === 'month' ? 'month' : 'date'}
                value={groupBy === 'month' ? dateRange.from?.slice(0, 7) : dateRange.from}
                onChange={(e) => {
                  const val = e.target.value;
                  if (groupBy === 'month') {
                    setDateRange({
                      ...dateRange,
                      from: val ? `${val}-01` : '',
                      to: val
                        ? `${val}-${new Date(new Date(val).getFullYear(), new Date(val).getMonth() + 1, 0).getDate()}`
                        : '',
                    });
                  } else {
                    setDateRange({ ...dateRange, from: val });
                  }
                }}
              />
            </div>
          )}

          {(groupBy === 'day' || groupBy === 'month') && (
            <div className="filter-group">
              <label>{groupBy === 'month' ? 'Mes Hasta' : 'Fecha Hasta'}</label>
              <input
                type={groupBy === 'month' ? 'month' : 'date'}
                value={groupBy === 'month' ? dateRange.to?.slice(0, 7) : dateRange.to}
                onChange={(e) => {
                  const val = e.target.value;
                  if (groupBy === 'month') {
                    setDateRange({
                      ...dateRange,
                      to: val
                        ? `${val}-${new Date(new Date(val).getFullYear(), new Date(val).getMonth() + 1, 0).getDate()}`
                        : '',
                    });
                  } else {
                    setDateRange({ ...dateRange, to: val });
                  }
                }}
              />
            </div>
          )}

          {groupBy === 'year' && (
            <div className="filter-group">
              <label>Año</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Filtro de categoría (solo afecta a la tabla de productos) */}
          <div className="filter-group" style={{ minWidth: 160 }}>
            <label>Categoría (productos)</label>
            <CustomCombobox
              options={[
                { value: '', label: 'Todas las categorías' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
              value={filterCategory || ''}
              onChange={(val) => setFilterCategory(val || null)}
              placeholder="Todas las categorías"
              filterable={true}
              style={{ minWidth: 150 }}
            />
          </div>
        </div>

        {/* KPIs */}
        {data && (
          <div className="stat-cards-row">
            <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
                <TrendingUp size={24} color="var(--text-primary)" />
              </div>
              <div>
                <div className="stat-card-label">Ventas Totales</div>
                <div className="stat-card-value">${totals.totalVentas.toFixed(2)}</div>
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
                <TrendingDown size={24} color="var(--text-primary)" />
              </div>
              <div>
                <div className="stat-card-label">Costo de Ventas (FIFO)</div>
                <div className="stat-card-value">${totals.totalCosto.toFixed(2)}</div>
              </div>
            </div>

            <div
              className="stat-card"
              style={{
                borderLeft: `4px solid ${totals.gananciaNeta >= 0 ? 'var(--success)' : 'var(--danger)'}`,
              }}
            >
              <div
                className="stat-card-icon"
                style={{
                  background: totals.gananciaNeta >= 0 ? 'var(--bg-success)' : 'var(--bg-danger)',
                }}
              >
                <DollarSign
                  size={24}
                  color={totals.gananciaNeta >= 0 ? 'var(--success)' : 'var(--danger)'}
                />
              </div>
              <div>
                <div className="stat-card-label">Ganancia Neta</div>
                <div
                  className="stat-card-value"
                  style={{ color: totals.gananciaNeta >= 0 ? 'var(--success)' : 'var(--danger)' }}
                >
                  ${totals.gananciaNeta.toFixed(2)}
                </div>
              </div>
            </div>

            <div
              className="stat-card"
              style={{
                borderLeft: `4px solid ${totals.margen >= 0 ? 'var(--success)' : 'var(--danger)'}`,
              }}
            >
              <div
                className="stat-card-icon"
                style={{
                  background: totals.margen >= 0 ? 'var(--bg-success)' : 'var(--bg-danger)',
                }}
              >
                <TrendingUp
                  size={24}
                  color={totals.margen >= 0 ? 'var(--success)' : 'var(--danger)'}
                />
              </div>
              <div>
                <div className="stat-card-label">Margen de Ganancia</div>
                <div
                  className="stat-card-value"
                  style={{ color: totals.margen >= 0 ? 'var(--success)' : 'var(--danger)' }}
                >
                  {totals.margen.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
              Cargando reporte...
            </p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* GRÁFICO */}
            {chartData.length > 0 && (
              <div className="dashboard-graph-card" ref={chartLineRef}>
                <h3 className="dashboard-graph-title">
                  {groupBy === 'year' ? 'Ventas vs Costo FIFO vs Gastos (Mensual)' : 'Ventas vs Costo FIFO vs Gastos'}
                </h3>
                <ResponsiveContainer width="100%" height={420}>
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 10,
                      bottom: groupBy === 'year' ? 30 : 60,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-color)"
                    />
                    <XAxis
                      dataKey="dateFormatted"
                      stroke="var(--text-muted)"
                      interval={0}
                      angle={groupBy === 'year' ? 0 : -45}
                      textAnchor={groupBy === 'year' ? 'middle' : 'end'}
                      height={groupBy === 'year' ? 40 : 70}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                      labelFormatter={(label) => `${groupBy === 'year' ? 'Mes' : 'Fecha'}: ${label}`}
                      formatter={(value) => `$${Number(value).toFixed(2)}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Ventas"
                      name="Ventas"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="CostoFIFO"
                      name="Costo FIFO"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Gastos"
                      name="Gastos"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="GananciaNeta"
                      name="Ganancia Neta"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* TABLA DE VENTAS */}
            <div className="roles-table-container">
              <Table
                data={filteredData}
                columns={columns}
                keyField="id"
                title="Detalle de Ventas"
                subtitle={`${filteredData.length} ${filteredData.length === 1 ? 'registro' : 'registros'} encontrados`}
                toolbar={toolbar}
                searchable={false}
                pagination={true}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={[10, 15, 20, 50]}
                onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
                loading={loading}
                emptyMessage={
                  searchTerm
                    ? 'No hay registros que coincidan con la búsqueda'
                    : 'No hay datos para el período seleccionado'
                }
                striped={true}
                hoverable={true}
                bordered={false}
                compact={false}
                footer={tableFooter}
              />
            </div>

            {/* TABLA DE GANANCIAS POR PRODUCTO */}
            {profitTableData.length > 0 && (
              <div className="roles-table-container" style={{ marginTop: 24 }}>
                <Table
                  data={filteredProfitData}
                  columns={profitColumns}
                  keyField="id"
                  title="Ganancias por Producto"
                  subtitle={`${profitTableData.length} ${profitTableData.length === 1 ? 'producto' : 'productos'} vendidos`}
                  searchable={false}
                  pagination={false}
                  striped={true}
                  hoverable={true}
                  bordered={false}
                  compact={false}
                  footer={profitFooter}
                />
              </div>
            )}
          </>
        )}
      </div>
    </PageTemplate>
  );
}