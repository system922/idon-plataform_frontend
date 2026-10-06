// src/pages/business/ReportsCollaborators.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import { ButtonGroup } from '../../components/General/Button';
import SearchInput from '../../components/General/SearchInput';
import CustomCombobox from '../../components/General/CustomCombobox';
import {
  TrendingUp, TrendingDown, DollarSign, Award,
  AlertCircle, Check
} from 'react-feather';
import { FiRefreshCw } from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

import ReportPdfButton from '../../components/ReportPdfGenerator';
import ReportExcelButton from '../../components/ReportExcelGenerator';

// ─── Helpers ────────────────────────────────────────────────────────────────
const ECUADOR_TIME_ZONE = 'America/Guayaquil';
const ECUADOR_DATE_FORMATTER = new Intl.DateTimeFormat('es-EC', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: ECUADOR_TIME_ZONE,
});

const formatDate = (dateValue) => {
  if (!dateValue) return '';
  const date = typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ? new Date(`${dateValue}T12:00:00.000Z`)
    : dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(date.getTime())) return String(dateValue);
  return ECUADOR_DATE_FORMATTER.format(date);
};

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Rango de fechas por período ───────────────────────────────────────
const getDateRangeFromPeriod = (period, customStart, customEnd) => {
  const todayParts = Object.fromEntries(
    new Intl.DateTimeFormat('en', {
      timeZone: ECUADOR_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, Number(value)])
  );
  const today = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));
  let from = new Date(today);
  let to = new Date(today);

  if (period === 'all') {
    from = new Date(Date.UTC(2020, 0, 1));
  } else if (period === 'day') {
    // hoy
  } else if (period === 'week') {
    from.setUTCDate(from.getUTCDate() - 6);
  } else if (period === 'month') {
    from = new Date(Date.UTC(todayParts.year, todayParts.month - 1, 1));
    to = new Date(Date.UTC(todayParts.year, todayParts.month, 0));
  } else if (period === 'quarter') {
    const quarterStartMonth = Math.floor((todayParts.month - 1) / 3) * 3;
    from = new Date(Date.UTC(todayParts.year, quarterStartMonth, 1));
    to = new Date(Date.UTC(todayParts.year, quarterStartMonth + 3, 0));
  } else if (period === 'year') {
    from = new Date(Date.UTC(todayParts.year, 0, 1));
    to = new Date(Date.UTC(todayParts.year, 11, 31));
  } else if (period === 'custom') {
    if (customStart && customEnd) {
      return { from: customStart, to: customEnd };
    } else return { from: null, to: null };
  }

  const fmtISO = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  return { from: fmtISO(from), to: fmtISO(to) };
};

// ─── Position Badge (sin emojis) ───────────────────────────────────────
const PositionBadge = ({ index }) => {
  const colors = [
    { bg: '#fef3c7', fg: '#b45309' }, // 1° oro
    { bg: '#e5e7eb', fg: '#374151' }, // 2° plata
    { bg: '#fde68a', fg: '#92400e' }, // 3° bronce
  ];
  const color = colors[index] || { bg: 'var(--bg-tertiary, #f1f5f9)', fg: 'var(--text-secondary, #475569)' };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 32,
      height: 32,
      padding: '0 8px',
      borderRadius: 8,
      background: color.bg,
      color: color.fg,
      fontWeight: 700,
      fontSize: 13,
    }}>
      {index + 1}
    </span>
  );
};

// ─── Componente principal ───────────────────────────────────────────────
export default function ReportsCollaborators() {
  const { user } = useSession();

  const [dateRange, setDateRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const chartBarRef = useRef(null);

  const dateOptions = useMemo(() => ([
    { value: 'all',     label: 'Todas las fechas' },
    { value: 'day',     label: 'Hoy' },
    { value: 'week',    label: 'Esta semana' },
    { value: 'month',   label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year',    label: 'Este año' },
    { value: 'custom',  label: 'Personalizado' }
  ]), []);

  // ─── Cargar reporte ────────────────────────────────────────────────
  const loadReport = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { from, to } = getDateRangeFromPeriod(dateRange, customStartDate, customEndDate);
      if (!from || !to) { setLoading(false); return; }

      const url = `/reports/collaborators?from=${from}&to=${to}`;
      const res = await fetchWithAuth(url);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
      setData(result);
    } catch (err) {
      setError(err.message || 'Error desconocido al cargar reporte');
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  }, [loadReport]);

  // ─── Totales ──────────────────────────────────────────────────────
  const totals = useMemo(() => {
    if (!data?.totals) {
      return {
        totalVentas: 0, totalCosto: 0, gananciaNeta: 0, margen: 0,
        totalOrdenes: 0, totalColaboradores: 0, totalItems: 0,
        ticketPromedio: 0, topColaborador: '—',
      };
    }
    const t = data.totals;
    return {
      totalVentas: Number(t.total_ventas) || 0,
      totalCosto: Number(t.total_costo) || 0,
      gananciaNeta: Number(t.total_ganancia) || 0,
      margen: Number(t.margen) || 0,
      totalOrdenes: Number(t.total_ordenes) || 0,
      totalColaboradores: Number(t.total_colaboradores) || 0,
      totalItems: Number(t.total_items) || 0,
      ticketPromedio: Number(t.ticket_promedio) || 0,
      topColaborador: t.top_colaborador || '—',
    };
  }, [data]);

  // ─── Datos de tabla por colaborador ────────────────────────────────
  const collaboratorsData = useMemo(() => {
    if (!data?.collaborators || !Array.isArray(data.collaborators)) return [];
    return data.collaborators.map((c) => ({
      id: c.collaborator_id,
      collaborator_id: c.collaborator_id,
      name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Sin nombre',
      email: c.email || '',
      position: c.position || '',
      orders: Number(c.orders) || 0,
      itemsSold: Number(c.items_sold) || 0,
      ventas: Number(c.total_sales) || 0,
      costo: Number(c.total_cost) || 0,
      ganancia: Number(c.total_profit) || 0,
      margen: Number(c.margin) || 0,
      ticketPromedio: Number(c.ticket_promedio) || 0,
      iva: Number(c.total_iva) || 0,
      discounts: Number(c.total_discounts) || 0,
      firstSale: c.first_sale || null,
      lastSale: c.last_sale || null,
    }));
  }, [data]);

  // ─── Datos de tabla por día ────────────────────────────────────────
  const dailyData = useMemo(() => {
    if (!data?.timeline || !Array.isArray(data.timeline)) return [];
    return data.timeline.map((d) => ({
      id: d.date,
      dateKey: d.date,
      dateFormatted: formatDate(d.date),
      orders: Number(d.orders) || 0,
      ventas: Number(d.total_sales) || 0,
      costo: Number(d.total_cost) || 0,
      ganancia: Number(d.total_profit) || 0,
      margen: Number(d.margin) || 0,
      ticketPromedio: Number(d.ticket_promedio) || 0,
      collaborators: Number(d.distinct_collaborators) || 0,
    }));
  }, [data]);

  // ─── Datos para chart horizontal apilado ────────────────────────
  const chartData = useMemo(() => {
    if (!collaboratorsData.length) return [];
    return collaboratorsData.slice(0, 15).map((c) => ({
      fullName: c.name,
      Ventas: c.ventas,
      CostoFIFO: c.costo,
      Ganancia: c.ganancia,
    }));
  }, [collaboratorsData]);

  // ─── Filtro ──────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!searchTerm) return collaboratorsData;
    const term = searchTerm.toLowerCase();
    return collaboratorsData.filter(row =>
      row.name.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term)
    );
  }, [collaboratorsData, searchTerm]);

  // ─── Período como texto ──────────────────────────────────────────
  const getPeriodText = useCallback(() => {
    const { from, to } = getDateRangeFromPeriod(dateRange, customStartDate, customEndDate);
    if (!from || !to) return 'Sin fecha';
    const fromFormatted = formatDate(from);
    const toFormatted = formatDate(to);
    if (dateRange === 'day') return fromFormatted;
    if (dateRange === 'month') {
      const [year, month] = from.split('-');
      return `${MONTHS[parseInt(month) - 1]} ${year}`;
    }
    if (dateRange === 'year') return from.split('-')[0];
    if (dateRange === 'quarter') {
      const [year, month] = from.split('-');
      const q = Math.floor((parseInt(month) - 1) / 3) + 1;
      return `Q${q} ${year}`;
    }
    return `${fromFormatted} al ${toFormatted}`;
  }, [dateRange, customStartDate, customEndDate]);

  const getFilename = useCallback(() => {
    const { from, to } = getDateRangeFromPeriod(dateRange, customStartDate, customEndDate);
    const fromShort = from ? from.split('-').reverse().join('/') : 'all';
    const toShort = to ? to.split('-').reverse().join('/') : 'all';
    return `reporte_colaboradores_${fromShort}--${toShort}`;
  }, [dateRange, customStartDate, customEndDate]);

  // ─── EXCEL ──────────────────────────────────────────────────────
  const excelConfig = useMemo(() => {
    if (!data) return null;
    const periodText = getPeriodText();
    const filename = getFilename();

    const columnsCollab = [
      { label: 'Colaborador', key: 'name', align: 'left', width: 24 },
      { label: 'Email', key: 'email', align: 'left', width: 22 },
      { label: 'Órdenes', key: 'orders', align: 'right', width: 8, numFmt: '#,##0', total: true },
      { label: 'Items', key: 'itemsSold', align: 'right', width: 8, numFmt: '#,##0', total: true },
      { label: 'Ventas ($)', key: 'ventas', align: 'right', width: 10, numFmt: '"$"#,##0.00', total: true },
      { label: 'Costo FIFO ($)', key: 'costo', align: 'right', width: 12, numFmt: '"$"#,##0.00', total: true },
      { label: 'Ganancia ($)', key: 'ganancia', align: 'right', width: 12, numFmt: '"$"#,##0.00', total: true },
      { label: 'Margen (%)', key: 'margen', align: 'right', width: 10, numFmt: '0.0"%"' },
      { label: 'Ticket Prom. ($)', key: 'ticketPromedio', align: 'right', width: 12, numFmt: '"$"#,##0.00' },
    ];

    const columnsTimeline = [
      { label: 'Fecha', key: 'dateFormatted', align: 'left', width: 12 },
      { label: 'Colaboradores', key: 'collaborators', align: 'right', width: 12, numFmt: '#,##0' },
      { label: 'Órdenes', key: 'orders', align: 'right', width: 8, numFmt: '#,##0', total: true },
      { label: 'Ventas ($)', key: 'ventas', align: 'right', width: 10, numFmt: '"$"#,##0.00', total: true },
      { label: 'Costo FIFO ($)', key: 'costo', align: 'right', width: 12, numFmt: '"$"#,##0.00', total: true },
      { label: 'Ganancia ($)', key: 'ganancia', align: 'right', width: 12, numFmt: '"$"#,##0.00', total: true },
      { label: 'Margen (%)', key: 'margen', align: 'right', width: 10, numFmt: '0.0"%"' },
      { label: 'Ticket Prom. ($)', key: 'ticketPromedio', align: 'right', width: 12, numFmt: '"$"#,##0.00' },
    ];

    return {
      columns: columnsCollab,
      title: 'REPORTE DE VENTAS POR COLABORADOR',
      subtitle: 'Desempeño individual del equipo de ventas',
      period: periodText,
      filename,
      confidential: true,

      kpis: [
        { label: 'Ventas Totales', value: totals.totalVentas, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Costo de Ventas (FIFO)', value: totals.totalCosto, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Ganancia Neta', value: totals.gananciaNeta, formatter: (v) => `$${Number(v).toFixed(2)}`, bold: true },
        { label: 'Margen de Ganancia', value: totals.margen, formatter: (v) => `${Number(v).toFixed(1)}%`, bold: true },
      ],

      sections: [
        ...(collaboratorsData.length ? [{
          title: 'DESEMPEÑO POR COLABORADOR',
          columns: columnsCollab,
          rows: collaboratorsData,
          showTotals: true,
        }] : []),
        ...(dailyData.length ? [{
          title: 'DETALLE DIARIO',
          columns: columnsTimeline,
          rows: dailyData,
          showTotals: true,
        }] : []),
      ],
    };
  }, [data, collaboratorsData, dailyData, totals, getPeriodText, getFilename]);

  // ─── PDF ─────────────────────────────────────────────────────────
  const reportConfig = useMemo(() => {
    if (!data) return null;
    const periodText = getPeriodText();
    const filename = getFilename();

    return {
      title: 'REPORTE DE VENTAS POR COLABORADOR',
      subtitle: 'Desempeño individual del equipo de ventas',
      period: periodText,
      filename,
      confidential: true,
      landscape: false,

      kpis: [
        { label: 'Ventas Totales', value: totals.totalVentas, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Costo de Ventas (FIFO)', value: totals.totalCosto, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Ganancia Neta', value: totals.gananciaNeta, formatter: (v) => `$${Number(v).toFixed(2)}`, bold: true },
        { label: 'Margen de Ganancia', value: totals.margen, formatter: (v) => `${Number(v).toFixed(1)}%`, bold: true },
      ],

      sections: [
        ...(collaboratorsData.length ? [{
          title: 'DESEMPEÑO POR COLABORADOR',
          columns: [
            { label: 'Colaborador', key: 'name', align: 'left' },
            { label: 'Órdenes', key: 'orders', align: 'right', total: true },
            { label: 'Ventas ($)', key: 'ventas', align: 'right', formatter: (v) => `$${Number(v).toFixed(2)}`, total: true },
            { label: 'Costo FIFO ($)', key: 'costo', align: 'right', formatter: (v) => `$${Number(v).toFixed(2)}`, total: true },
            { label: 'Ganancia ($)', key: 'ganancia', align: 'right', formatter: (v) => `$${Number(v).toFixed(2)}`, total: true },
            { label: 'Margen', key: 'margen', align: 'right', formatter: (v) => `${Number(v).toFixed(1)}%` },
          ],
          rows: collaboratorsData,
          showTotals: true,
        }] : []),
        ...(dailyData.length ? [{
          title: 'DETALLE DIARIO',
          columns: [
            { label: 'Fecha', key: 'dateFormatted', align: 'left' },
            { label: 'Órdenes', key: 'orders', align: 'right', total: true },
            { label: 'Ventas ($)', key: 'ventas', align: 'right', formatter: (v) => `$${Number(v).toFixed(2)}`, total: true },
            { label: 'Costo FIFO ($)', key: 'costo', align: 'right', formatter: (v) => `$${Number(v).toFixed(2)}`, total: true },
            { label: 'Ganancia ($)', key: 'ganancia', align: 'right', formatter: (v) => `$${Number(v).toFixed(2)}`, total: true },
            { label: 'Margen', key: 'margen', align: 'right', formatter: (v) => `${Number(v).toFixed(1)}%` },
          ],
          rows: dailyData,
          showTotals: true,
        }] : []),
      ],

      chartRefs: [chartBarRef],

      observations: [
        `Reporte generado para el período ${periodText}.`,
        `Total de colaboradores con ventas: ${totals.totalColaboradores}.`,
        `Margen general: ${totals.margen.toFixed(1)}%.`,
        `Colaborador destacado: ${totals.topColaborador}.`,
      ],

      signatures: [
        { name: user?.firstName || user?.nombre || 'Usuario', role: 'Responsable del Reporte', date: new Date().toISOString() },
        { name: 'Gerencia', role: 'Aprobación', date: new Date().toISOString() },
      ],
    };
  }, [data, collaboratorsData, dailyData, totals, user, getPeriodText, getFilename, chartBarRef]);

  // ─── Toolbar ──────────────────────────────────────────────────────
  const toolbar = useMemo(() => (
    <div className="users-toolbar">
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar colaborador..."
        size="md"
        variant="bordered"
        className="users-search-input"
        onClear={() => setSearchTerm('')}
        autoFocus={false}
      />
      <ButtonGroup>
        <ReportExcelButton
          config={excelConfig}
          onSuccess={() => { setSuccess('Excel generado correctamente'); setTimeout(() => setSuccess(''), 3000); }}
          onError={(err) => { setError('Error al generar Excel: ' + err.message); setTimeout(() => setError(''), 5000); }}
        />
        <ReportPdfButton
          customConfig={reportConfig}
          dateRange={{ from: customStartDate || dateRange, to: customEndDate || new Date().toISOString().split('T')[0] }}
          onSuccess={() => { setSuccess('PDF generado correctamente'); setTimeout(() => setSuccess(''), 3000); }}
          onError={(err) => { setError('Error al generar PDF: ' + err.message); setTimeout(() => setError(''), 5000); }}
        />
      </ButtonGroup>
    </div>
  ), [searchTerm, excelConfig, reportConfig, dateRange, customStartDate, customEndDate]);

  const refreshButton = useMemo(() => (
    <button onClick={handleRefresh} className="dashboard-refresh-btn-header" disabled={refreshing} title="Actualizar datos">
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  ), [handleRefresh, refreshing]);

  // ─── Columnas tabla colaboradores ─────────────────────────────────
  const columns = useMemo(() => [
    { accessor: 'name', label: 'Colaborador', render: (item) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 500 }}>{item.name}</span>
          {item.email && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.email}</span>}
        </div>
      ) },
    { accessor: 'orders', label: 'Órdenes', align: 'right', render: (item) => <span>{item.orders}</span> },
    { accessor: 'ventas', label: 'Ventas ($)', align: 'right', render: (item) => (
        <span style={{ fontWeight: 600, color: 'var(--success)' }}>${item.ventas.toFixed(2)}</span>
      ) },
    { accessor: 'costo', label: 'Costo FIFO ($)', align: 'right', render: (item) => (
        <span>${item.costo.toFixed(2)}</span>
      ) },
    { accessor: 'ganancia', label: 'Ganancia ($)', align: 'right', render: (item) => (
        <span style={{ fontWeight: 600, color: item.ganancia >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          ${item.ganancia.toFixed(2)}
        </span>
      ) },
    { accessor: 'margen', label: 'Margen (%)', align: 'right', render: (item) => (
        <span style={{ fontWeight: 600, color: item.margen >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {item.margen.toFixed(1)}%
        </span>
      ) },
    { accessor: 'ticketPromedio', label: 'Ticket Prom.', align: 'right', render: (item) => (
        <span>${item.ticketPromedio.toFixed(2)}</span>
      ) },
    { accessor: 'lastSale', label: 'Última venta', align: 'right', render: (item) => (
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.lastSale ? formatDate(item.lastSale) : '—'}</span>
      ) },
  ], []);

  // ─── Columnas tabla timeline ──────────────────────────────────────
  const timelineColumns = useMemo(() => [
    { accessor: 'dateFormatted', label: 'Fecha', render: (item) => <span>{item.dateFormatted}</span> },
    { accessor: 'collaborators', label: 'Colaboradores', align: 'right', render: (item) => <span>{item.collaborators}</span> },
    { accessor: 'orders', label: 'Órdenes', align: 'right', render: (item) => <span>{item.orders}</span> },
    { accessor: 'ventas', label: 'Ventas ($)', align: 'right', render: (item) => (
        <span style={{ fontWeight: 600, color: 'var(--success)' }}>${item.ventas.toFixed(2)}</span>
      ) },
    { accessor: 'costo', label: 'Costo FIFO ($)', align: 'right', render: (item) => (
        <span>${item.costo.toFixed(2)}</span>
      ) },
    { accessor: 'ganancia', label: 'Ganancia ($)', align: 'right', render: (item) => (
        <span style={{ fontWeight: 600, color: item.ganancia >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          ${item.ganancia.toFixed(2)}
        </span>
      ) },
    { accessor: 'margen', label: 'Margen (%)', align: 'right', render: (item) => (
        <span style={{ fontWeight: 600, color: item.margen >= 0 ? 'var(--success)' : 'var(--danger)' }}>
          {item.margen.toFixed(1)}%
        </span>
      ) },
  ], []);

  const collaboratorsFooter = useMemo(() => {
    if (!collaboratorsData.length) return null;
    return (
      <tr className="table-footer-totals">
        <td><strong>TOTALES</strong></td>
        <td className="text-right"><strong>{totals.totalOrdenes}</strong></td>
        <td className="text-right"><strong style={{ color: 'var(--success)' }}>${totals.totalVentas.toFixed(2)}</strong></td>
        <td className="text-right"><strong>${totals.totalCosto.toFixed(2)}</strong></td>
        <td className={`text-right ${totals.gananciaNeta >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>${totals.gananciaNeta.toFixed(2)}</strong>
        </td>
        <td className={`text-right ${totals.margen >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>{totals.margen.toFixed(1)}%</strong>
        </td>
        <td className="text-right"><strong>${totals.ticketPromedio.toFixed(2)}</strong></td>
        <td></td>
      </tr>
    );
  }, [collaboratorsData, totals]);

  const dailyFooter = useMemo(() => {
    if (!dailyData.length) return null;
    const sumVentas = dailyData.reduce((s, d) => s + d.ventas, 0);
    const sumCosto = dailyData.reduce((s, d) => s + d.costo, 0);
    const sumGanancia = dailyData.reduce((s, d) => s + d.ganancia, 0);
    const sumOrdenes = dailyData.reduce((s, d) => s + d.orders, 0);
    const margenGlobal = sumVentas > 0 ? (sumGanancia / sumVentas) * 100 : 0;
    return (
      <tr className="table-footer-totals">
        <td><strong>TOTALES</strong></td>
        <td></td>
        <td className="text-right"><strong>{sumOrdenes}</strong></td>
        <td className="text-right"><strong style={{ color: 'var(--success)' }}>${sumVentas.toFixed(2)}</strong></td>
        <td className="text-right"><strong>${sumCosto.toFixed(2)}</strong></td>
        <td className={`text-right ${sumGanancia >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>${sumGanancia.toFixed(2)}</strong>
        </td>
        <td className={`text-right ${margenGlobal >= 0 ? 'text-success' : 'text-danger'}`}>
          <strong>{margenGlobal.toFixed(1)}%</strong>
        </td>
      </tr>
    );
  }, [dailyData]);

  // ─── DateRangePicker ─────────────────────────────────────────────
  function DateRangePicker({ startDate, endDate, onApply, onClose }) {
    const [localStart, setLocalStart] = useState(startDate || '');
    const [localEnd, setLocalEnd] = useState(endDate || '');
    const handleApply = () => { if (localStart && localEnd) onApply(localStart, localEnd); };
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

  // ─── Altura dinámica del chart ────────────────────────────────────
  const chartHeight = useMemo(() => {
    return Math.max(280, chartData.length * 70 + 80);
  }, [chartData.length]);

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="REPORTES POR COLABORADOR"
      subtitle="Desempeño individual del equipo de ventas"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      <div className="reports-advanced-container custom-dashboard">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        {/* FILTROS */}
        <div className="filters-bar">
          <div className="filter-group" style={{ flex: '0 0 auto', minWidth: '140px' }}>
            <label>Período</label>
            <CustomCombobox
              options={dateOptions}
              value={dateRange}
              onChange={(value) => {
                setDateRange(value);
                if (value === 'custom') setShowCustomDate(true);
                else { setShowCustomDate(false); setCustomStartDate(''); setCustomEndDate(''); }
              }}
              placeholder="Todas las fechas"
              filterable={false}
              forceDropup={false}
              style={{ minWidth: '140px', width: '100%' }}
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

            <div className="stat-card" style={{ borderLeft: `4px solid ${totals.gananciaNeta >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
              <div className="stat-card-icon" style={{ background: totals.gananciaNeta >= 0 ? 'var(--bg-success)' : 'var(--bg-danger)' }}>
                <DollarSign size={24} color={totals.gananciaNeta >= 0 ? 'var(--success)' : 'var(--danger)'} />
              </div>
              <div>
                <div className="stat-card-label">Ganancia Neta</div>
                <div className="stat-card-value" style={{ color: totals.gananciaNeta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  ${totals.gananciaNeta.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ borderLeft: `4px solid ${totals.margen >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
              <div className="stat-card-icon" style={{ background: totals.margen >= 0 ? 'var(--bg-success)' : 'var(--bg-danger)' }}>
                <TrendingUp size={24} color={totals.margen >= 0 ? 'var(--success)' : 'var(--danger)'} />
              </div>
              <div>
                <div className="stat-card-label">Margen de Ganancia</div>
                <div className="stat-card-value" style={{ color: totals.margen >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {totals.margen.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Cargando reporte...</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* RANKING */}
            {collaboratorsData.length > 0 && (
              <div className="dashboard-graph-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Award size={18} color="var(--primary)" />
                  <h3 className="dashboard-graph-title" style={{ margin: 0 }}>Ranking de colaboradores</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                  {collaboratorsData.slice(0, 10).map((c, i) => {
                    const maxVenta = collaboratorsData[0]?.ventas || 1;
                    const pct = (c.ventas / maxVenta) * 100;
                    return (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <PositionBadge index={i} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 12 }}>
                            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.name}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                              ${c.ventas.toFixed(2)}
                            </span>
                          </div>
                          <div style={{
                            height: 10,
                            background: 'var(--bg-tertiary, #f1f5f9)',
                            borderRadius: 6,
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                              borderRadius: 6,
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', marginTop: 4, flexWrap: 'wrap' }}>
                            <span>{c.orders} órdenes</span>
                            <span>•</span>
                            <span>{c.itemsSold} items</span>
                            <span>•</span>
                            <span style={{ color: c.margen >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              Margen {c.margen.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GRÁFICO HORIZONTAL APILADO */}
            {chartData.length > 0 && (
              <div className="dashboard-graph-card" ref={chartBarRef} style={{ marginTop: 24 }}>
                <h3 className="dashboard-graph-title">Ventas desglosadas: Costo FIFO + Ganancia</h3>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 10, right: 60, left: 180, bottom: 10 }}
                    barCategoryGap={18}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                    <XAxis type="number" stroke="var(--text-muted)" tickFormatter={(v) => `$${v}`} />
                    <YAxis
                      type="category"
                      dataKey="fullName"
                      stroke="var(--text-muted)"
                      width={170}
                      tick={{ fontSize: 12 }}
                      interval={0}
                    />
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="CostoFIFO" stackId="a" fill="#ef4444" name="Costo FIFO" radius={[6, 0, 0, 6]} />
                    <Bar dataKey="Ganancia" stackId="a" fill="#3b82f6" name="Ganancia" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* TABLA COLABORADORES */}
            <div className="roles-table-container" style={{ marginTop: 24 }}>
              <Table
                data={filteredData}
                columns={columns}
                keyField="id"
                title="Desempeño por Colaborador"
                subtitle={`${filteredData.length} ${filteredData.length === 1 ? 'colaborador' : 'colaboradores'}`}
                toolbar={toolbar}
                searchable={false}
                pagination={true}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={[10, 15, 20, 50]}
                onItemsPerPageChange={(n) => setItemsPerPage(n)}
                loading={loading}
                emptyMessage={searchTerm ? 'No hay colaboradores que coincidan' : 'Sin datos en el período'}
                striped={true}
                hoverable={true}
                bordered={false}
                compact={false}
                footer={collaboratorsFooter}
              />
            </div>

            {/* TIMELINE DIARIO */}
            {dailyData.length > 0 && (
              <div className="roles-table-container" style={{ marginTop: 24 }}>
                <Table
                  data={dailyData}
                  columns={timelineColumns}
                  keyField="id"
                  title="Detalle diario"
                  subtitle={`${dailyData.length} ${dailyData.length === 1 ? 'día' : 'días'} con actividad`}
                  searchable={false}
                  pagination={false}
                  striped={true}
                  hoverable={true}
                  bordered={false}
                  compact={false}
                  footer={dailyFooter}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal fechas */}
      {showCustomDate && (
        <Modal closeOnOverlayClick={false} isOpen={true} onClose={() => setShowCustomDate(false)} title="Seleccionar fechas" size="sm">
          <DateRangePicker
            startDate={customStartDate}
            endDate={customEndDate}
            onApply={(start, end) => {
              setCustomStartDate(start); setCustomEndDate(end);
              setDateRange('custom'); setShowCustomDate(false);
            }}
            onClose={() => setShowCustomDate(false)}
          />
        </Modal>
      )}
    </PageTemplate>
  );
}