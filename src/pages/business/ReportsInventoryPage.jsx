// src/pages/ReportsInventoryPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from '../../context/SessionContext';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import { ButtonGroup } from '../../components/General/Button';
import CustomCombobox from '../../components/General/CustomCombobox';
import Modal from '../../components/General/Modal';
import {
  FiRefreshCw, FiPackage, FiAlertCircle, FiCheck,
  FiTrendingUp, FiDollarSign, FiEye, FiCalendar, FiChevronDown
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api';
import ReportPdfButton from '../../components/ReportPdfGenerator';
import ReportExcelButton from '../../components/ReportExcelGenerator';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import '../../styles/ReportsInventoryPage.css';

// ─── Helpers ──────────────────────────────────────────────────────────────
const formatDate = (isoDate) => {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const fmtCurrency = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtNumber = (n) => Number(n || 0).toLocaleString();

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// ─── Helper de fechas ─────────────────────────────────────────────────────
const getDateRangeFromPeriod = (period, customStart, customEnd) => {
  const now = new Date();
  let from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let to = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'all') {
    from = new Date(2020, 0, 1);
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'day') {
    // hoy
  } else if (period === 'week') {
    from = new Date(now);
    from.setDate(now.getDate() - 6);
    to = new Date(now);
  } else if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (period === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3);
    from = new Date(now.getFullYear(), quarter * 3, 1);
    to = new Date(now.getFullYear(), quarter * 3 + 3, 0);
  } else if (period === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
    to = new Date(now.getFullYear(), 11, 31);
  } else if (period === 'custom') {
    if (customStart && customEnd) {
      from = new Date(customStart);
      to = new Date(customEnd);
    } else {
      return { from: null, to: null };
    }
  }

  const formatDateISO = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    from: formatDateISO(from),
    to: formatDateISO(to)
  };
};

// ─── Filtrado de fechas local ──────────────────────────────────────────
const filterByDateRange = (items, from, to, dateField = 'created_at') => {
  if (!from || !to) return items;
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  return items.filter(item => {
    const d = new Date(item[dateField]);
    return d >= start && d <= end;
  });
};

// ─── Componente de selector de fechas personalizadas ───────────────────
function DateRangePicker({ startDate, endDate, onApply, onClose }) {
  const [localStart, setLocalStart] = useState(startDate || '');
  const [localEnd, setLocalEnd] = useState(endDate || '');

  const handleApply = () => {
    if (localStart && localEnd) onApply(localStart, localEnd);
  };

  return (
    <div className="report-date-range-picker">
      <div className="report-date-range-inputs">
        <input
          type="date"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          placeholder="Fecha inicial"
        />
        <span>a</span>
        <input
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          placeholder="Fecha final"
        />
      </div>
      <div className="report-date-range-actions">
        <button onClick={onClose} className="report-btn-cancel">Cancelar</button>
        <button onClick={handleApply} className="report-btn-apply" disabled={!localStart || !localEnd}>
          Aplicar
        </button>
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────
export default function ReportsInventoryPage() {
  const { user } = useSession();

  // ─── Estados de datos ────────────────────────────────────────────────
  const [movements, setMovements] = useState([]);
  const [closedInventories, setClosedInventories] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ─── Estados de filtros globales ─────────────────────────────────────
  const [dateRange, setDateRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // ─── Estados de pestañas ─────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('kardex');

  // ─── Filtros por pestaña ─────────────────────────────────────────────
  const [inventorySearch, setInventorySearch] = useState('');
  const [kardexProductFilter, setKardexProductFilter] = useState(null);
  const [kardexCategoryFilter, setKardexCategoryFilter] = useState(null);
  const [kardexSearch, setKardexSearch] = useState('');

  // ─── Estados de modales ──────────────────────────────────────────────
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [showInventoryDetail, setShowInventoryDetail] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductMovements, setShowProductMovements] = useState(false);
  const [productMovements, setProductMovements] = useState([]);

  const chartRef = useRef(null);

  // ─── Estado para almacenar ítems de inventarios ──────────────────────
  const [inventoryItemsMap, setInventoryItemsMap] = useState({});

  // ─── Opciones ──────────────────────────────────────────────────────────
  const dateOptions = useMemo(() => ([
    { value: 'all', label: 'Todas las fechas' },
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este año' },
    { value: 'custom', label: 'Personalizado' }
  ]), []);

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Todas las categorías' },
    ...categories.map(c => ({ value: String(c.id), label: c.name }))
  ], [categories]);

  // ─── Carga de datos ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [movRes, invRes, prodRes, catRes] = await Promise.all([
        fetchWithAuth('/inventory/movements'),
        fetchWithAuth('/inventory/physical'),
        fetchWithAuth('/products'),
        fetchWithAuth('/categories')
      ]);

      const [movData, invData, prodData, catData] = await Promise.all([
        movRes.json(),
        invRes.json(),
        prodRes.json(),
        catRes.json()
      ]);

      setMovements(Array.isArray(movData) ? movData : []);
      
      const allInventories = Array.isArray(invData) ? invData : [];
      const closed = allInventories.filter(inv => inv.status === 'closed');
      
      const enrichedClosed = [];
      const itemsMap = {};
      for (const inv of closed) {
        try {
          const detailRes = await fetchWithAuth(`/inventory/closed/${inv.id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            const inventory = detailData.inventory || {};
            const items = detailData.items || [];
            
            const pendingCount = items.filter(i => i.status === 'pending').length;
            const diffCount = items.filter(i => i.difference !== 0).length;
            
            enrichedClosed.push({
              ...inv,
              name: inventory.name || inv.name || '—',
              total_items: inventory.total_items ?? inv.total_items ?? 0,
              items_with_difference: diffCount,
              pending_items: pendingCount
            });
            
            itemsMap[inv.id] = items;
          } else {
            enrichedClosed.push({
              ...inv,
              name: inv.name || '—',
              total_items: inv.total_items || 0,
              items_with_difference: 0,
              pending_items: 0
            });
            itemsMap[inv.id] = [];
          }
        } catch {
          enrichedClosed.push({
            ...inv,
            name: inv.name || '—',
            total_items: inv.total_items || 0,
            items_with_difference: 0,
            pending_items: 0
          });
          itemsMap[inv.id] = [];
        }
      }
      
      setClosedInventories(enrichedClosed);
      setInventoryItemsMap(itemsMap);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useRealtimeSync(['inventory', 'movements', 'products', 'inventory_physical'], loadData);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ─── Filtrado de fechas locales ─────────────────────────────────────
  const { from, to } = getDateRangeFromPeriod(dateRange, customStartDate, customEndDate);

  // ─── Datos filtrados por pestaña ─────────────────────────────────────

  const filteredInventories = useMemo(() => {
    let items = closedInventories;
    if (from && to) {
      items = filterByDateRange(items, from, to, 'closed_date');
    }
    if (inventorySearch) {
      const s = inventorySearch.toLowerCase();
      items = items.filter(inv =>
        inv.closed_by_name?.toLowerCase().includes(s) ||
        inv.name?.toLowerCase().includes(s) ||
        String(inv.id).includes(s)
      );
    }
    return items;
  }, [closedInventories, from, to, inventorySearch]);

  const filteredKardex = useMemo(() => {
    let items = movements;
    if (from && to) {
      items = filterByDateRange(items, from, to, 'created_at');
    }
    if (kardexProductFilter) {
      items = items.filter(m => m.product_id === kardexProductFilter);
    }
    if (kardexCategoryFilter) {
      const categoryId = parseInt(kardexCategoryFilter);
      items = items.filter(m => {
        const prod = products.find(p => p.id === m.product_id);
        return prod && prod.category_id === categoryId;
      });
    }
    if (kardexSearch) {
      const s = kardexSearch.toLowerCase();
      items = items.filter(m =>
        m.product_name?.toLowerCase().includes(s) ||
        m.product_code?.toLowerCase().includes(s) ||
        m.barcode?.toLowerCase().includes(s) ||
        m.notes?.toLowerCase().includes(s)
      );
    }
    return items;
  }, [movements, products, from, to, kardexProductFilter, kardexCategoryFilter, kardexSearch]);

  // ─── Procesamiento de Kardex (agrupado por producto) ──────────────────
  const kardexProducts = useMemo(() => {
    const movs = filteredKardex;
    if (movs.length === 0) return [];

    const grouped = {};
    for (const m of movs) {
      if (!grouped[m.product_id]) {
        grouped[m.product_id] = {
          product_id: m.product_id,
          product_name: m.product_name,
          product_desc: null,
          product_code: m.product_code,
          barcode: m.barcode || null,
          last_movement_date: m.created_at,
          movements: []
        };
      }
      if (m.barcode && !grouped[m.product_id].barcode) {
        grouped[m.product_id].barcode = m.barcode;
      }
      if (new Date(m.created_at) > new Date(grouped[m.product_id].last_movement_date)) {
        grouped[m.product_id].last_movement_date = m.created_at;
      }
      grouped[m.product_id].movements.push(m);
    }

    const result = Object.values(grouped).map(item => {
      const prod = products.find(p => p.id === item.product_id);
      const finalBarcode = item.barcode || prod?.barcode || item.product_code || '—';
      return {
        ...item,
        stock: prod?.stock || 0,
        product_desc: prod?.description || '—',
        barcode: finalBarcode,
        last_movement_formatted: formatDate(item.last_movement_date),
        category_id: prod?.category_id || null
      };
    });

    if (kardexSearch) {
      const s = kardexSearch.toLowerCase();
      return result.filter(p =>
        p.product_name?.toLowerCase().includes(s) ||
        p.product_code?.toLowerCase().includes(s) ||
        p.barcode?.toLowerCase().includes(s) ||
        p.product_desc?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [filteredKardex, products, kardexSearch]);

  // ─── Estadísticas ────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalMovements: movements.length,
    totalInventories: closedInventories.length,
    totalProducts: products.length,
  }), [movements, closedInventories, products]);

  // ─── Ver detalle de inventario ──────────────────────────────────────
  const viewInventoryDetail = async (inventoryId) => {
    try {
      const res = await fetchWithAuth(`/inventory/closed/${inventoryId}`);
      if (!res.ok) throw new Error('Error al cargar detalle');
      const data = await res.json();
      setInventoryItems(data.items || []);
      setSelectedInventory(data.inventory || {});
      setShowInventoryDetail(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── 🔧 CORRECCIÓN: Ver kardex de producto (siempre usando todos los movimientos) ──
  const viewProductKardex = (kardexItem) => {
    // Filtramos todos los movimientos por product_id (comparando como string)
    const movs = movements.filter(m => String(m.product_id) === String(kardexItem.product_id));
    
    setSelectedProduct({
      id: kardexItem.product_id,
      name: kardexItem.product_name,
      barcode: kardexItem.barcode,
      stock: kardexItem.stock,
      category_id: kardexItem.category_id
    });
    setProductMovements(movs);
    setShowProductMovements(true);
  };

  // ─── Generar nombre de archivo ──────────────────────────────────────
  const getFilename = useCallback((baseName = 'reporte') => {
    const period = dateRange;
    const { from: f, to: t } = getDateRangeFromPeriod(dateRange, customStartDate, customEndDate);
    if (!f || !t) return `${baseName}_${period}`;

    const formatShort = (dateStr) => {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    if (period === 'day') return `${baseName}_${formatShort(f)}`;
    if (period === 'week') return `${baseName}_${formatShort(f)}--${formatShort(t)}`;
    if (period === 'month') {
      const [year, month] = f.split('-');
      const monthName = MONTHS[parseInt(month) - 1];
      return `${baseName}_${monthName}-${year}`;
    }
    if (period === 'quarter') {
      const [year, month] = f.split('-');
      const quarter = Math.floor((parseInt(month) - 1) / 3) + 1;
      return `${baseName}_Q${quarter}-${year}`;
    }
    if (period === 'year') {
      const [year] = f.split('-');
      return `${baseName}_${year}`;
    }
    if (period === 'custom') {
      return `${baseName}_${formatShort(f)}--${formatShort(t)}`;
    }
    return `${baseName}_${period}`;
  }, [dateRange, customStartDate, customEndDate]);

  // ─── Configuraciones de reportes memoizadas ──────────────────────────

  // Inventarios - Excel
  const excelConfigInventories = useMemo(() => {
    const periodText = dateOptions.find(o => o.value === dateRange)?.label || dateRange;
    const filename = getFilename('reporte_inventarios');

    const summaryColumns = [
      { label: 'ID', key: 'id', align: 'left', width: 13, formatter: (v) => String(v || '—') },
      { label: 'Descripción', key: 'name', align: 'left', width: 20, formatter: (v) => String(v || '—') },
      // ← CORREGIDO: eliminado el formatter porque ya aplicamos formatDate en las filas
      { label: 'Fecha cierre', key: 'closed_date', align: 'left', width: 20 },
      { label: 'Cerrado por', key: 'closed_by_name', align: 'left', width: 15, formatter: (v) => String(v || '—') },
      { label: 'T. items', key: 'total_items', align: 'right', width: 13, numFmt: '#,##0', formatter: (v) => String(Number(v || 0).toLocaleString()) },
      { label: 'Con diff.', key: 'items_with_difference', align: 'right', width: 8, numFmt: '#,##0', formatter: (v) => String(Number(v || 0).toLocaleString()) },
      { label: 'Pendientes', key: 'pending_items', align: 'right', width: 10, numFmt: '#,##0', formatter: (v) => String(Number(v || 0).toLocaleString()) }
    ];

    // ← CORREGIDO: aplicamos formatDate a la fecha
    const summaryRows = filteredInventories.map(inv => ({
      id: inv.id,
      name: inv.name || '—',
      closed_date: formatDate(inv.closed_date),
      closed_by_name: inv.closed_by_name || '—',
      total_items: inv.total_items || 0,
      items_with_difference: inv.items_with_difference || 0,
      pending_items: inv.pending_items || 0
    }));

    const detailColumns = [
      { label: 'Cód. barras', key: 'product_barcode', align: 'left', width: 13 },
      { label: 'Producto', key: 'product_name', align: 'left', width: 20 },
      { label: 'Categoría', key: 'category_name', align: 'left', width: 12 },
      { label: 'Stock sistema', key: 'system_stock', align: 'right', width: 15, numFmt: '#,##0' },
      { label: 'Stock contado', key: 'counted_stock', align: 'right', width: 13, numFmt: '#,##0' },
      {
        label: 'Diferencia',
        key: 'difference',
        align: 'right',
        width: 12,
        numFmt: '#,##0;[Red]-#,##0',
        formatter: (v) => String(Number(v || 0).toLocaleString())
      },
      { label: 'Estado', key: 'status', align: 'left', width: 10 }
    ];

    const statusMap = { adjusted: 'Ajustado', counted: 'Contado', pending: 'Pendiente' };

    const detailRows = [];
    filteredInventories.forEach(inv => {
      const items = inventoryItemsMap[inv.id] || [];
      items.forEach(item => {
        detailRows.push({
          inventory_id: inv.id,
          name: inv.name || '—',
          // ← CORREGIDO: aplicamos formatDate a la fecha
          inventory_date: formatDate(inv.closed_date),
          closed_by_name: inv.closed_by_name || '—',
          product_name: item.product_name || '—',
          product_barcode: item.product_barcode || '—',
          category_name: item.category_name || '—',
          system_stock: item.system_stock || 0,
          counted_stock: item.counted_stock || 0,
          difference: item.difference || 0,
          status: statusMap[item.status] || item.status || 'Pendiente'
        });
      });
    });

    const kpis = [
      { label: 'Total items', value: filteredInventories.reduce((sum, inv) => sum + (inv.total_items || 0), 0), formatter: (v) => String(v) },
      { label: 'Items con diferencias', value: filteredInventories.reduce((sum, inv) => sum + (inv.items_with_difference || 0), 0), formatter: (v) => String(v) },
      { label: 'Items Pendientes', value: filteredInventories.reduce((sum, inv) => sum + (inv.pending_items || 0), 0), formatter: (v) => String(v) },
    ];

    return {
      title: 'REPORTE DE INVENTARIO',
      subtitle: 'Detalle de productos contados',
      period: `Período: ${periodText}`,
      filename,
      confidential: true,
      kpis,
      sections: [
        {
          title: 'RESUMEN DE INVENTARIO',
          columns: summaryColumns,
          rows: summaryRows,
          showTotals: true
        },
        {
          title: 'DETALLE DE PRODUCTOS CONTADOS',
          columns: detailColumns,
          rows: detailRows,
          showTotals: false
        }
      ],
      observations: [
        `Reporte generado para el período ${periodText}.`,
        `Total de productos contados: ${detailRows.length}.`,
        'Los pendientes son items con diferencia que aún no han sido ajustados.'
      ],
      chartRefs: [chartRef]
    };
  }, [filteredInventories, inventoryItemsMap, dateRange, getFilename, dateOptions]);

  // Inventarios - PDF
  const pdfConfigInventories = useMemo(() => {
    const periodText = dateOptions.find(o => o.value === dateRange)?.label || dateRange;
    const filename = getFilename('reporte_inventario');

    const summaryColumns = [
      { label: 'ID', key: 'id', align: 'center', width: 8, formatter: (v) => String(v || '—') },
      { label: 'Descripción', key: 'name', align: 'center', width: 20, formatter: (v) => String(v || '—') },
      { label: 'Fecha cierre', key: 'closed_date', align: 'center', width: 15, formatter: (v) => formatDate(v) },
      { label: 'Cerrado por', key: 'closed_by_name', align: 'center', width: 20, formatter: (v) => String(v || '—') },
      { label: 'Total items', key: 'total_items', align: 'center', width: 8, formatter: (v) => String(Number(v || 0).toLocaleString()) },
      { label: 'Items con diferencias.', key: 'items_with_difference', align: 'center', width: 10, formatter: (v) => String(Number(v || 0).toLocaleString()) },
    ];

    const summaryRows = filteredInventories.map(inv => ({
      id: inv.id,
      name: inv.name || '—',
      closed_date: inv.closed_date,
      closed_by_name: inv.closed_by_name || '—',
      total_items: inv.total_items || 0,
      items_with_difference: inv.items_with_difference || 0,
      pending_items: inv.pending_items || 0
    }));

    const detailColumns = [
      { label: 'Cód. barras', key: 'product_barcode', align: 'center', width: 12 },
      { label: 'Producto', key: 'product_name', align: 'center', width: 18 },
      { label: 'Categoría', key: 'category_name', align: 'center', width: 10 },
      { label: 'Sistema', key: 'system_stock', align: 'center', width: 6 },
      { label: 'Contado', key: 'counted_stock', align: 'center', width: 6 },
      { label: 'Diferencia', key: 'difference', align: 'center', width: 6 },
      { label: 'Estado', key: 'status', align: 'center', width: 8, formatter: (v) => {
          const map = { adjusted: 'Ajustado', counted: 'Contado', pending: 'Pendiente' };
          return map[v] || v;
        }
      }
    ];

    const detailRows = [];
    filteredInventories.forEach(inv => {
      const items = inventoryItemsMap[inv.id] || [];
      items.forEach(item => {
        detailRows.push({
          inventory_id: inv.id,
          name: inv.name || '—',
          inventory_date: inv.closed_date,
          closed_by_name: inv.closed_by_name || '—',
          product_name: item.product_name || '—',
          product_barcode: item.product_barcode || '—',
          category_name: item.category_name || '—',
          system_stock: item.system_stock || 0,
          counted_stock: item.counted_stock || 0,
          difference: item.difference || 0,
          status: item.status || 'pending'
        });
      });
    });

    const kpis = [
      { label: 'Total items', value: filteredInventories.reduce((sum, inv) => sum + (inv.total_items || 0), 0), formatter: (v) => String(v) },
      { label: 'Items con diferencias.', value: filteredInventories.reduce((sum, inv) => sum + (inv.items_with_difference || 0), 0), formatter: (v) => String(v) },
      { label: 'Pendientes', value: filteredInventories.reduce((sum, inv) => sum + (inv.pending_items || 0), 0), formatter: (v) => String(v) },
    ];

    return {
      title: 'REPORTE DE INVENTARIO',
      subtitle: 'Detalle de productos contados',
      period: `Período: ${periodText}`,
      filename,
      confidential: true,
      landscape: false,
      kpis,
      sections: [
        {
          title: 'RESUMEN DE INVENTARIO',
          columns: summaryColumns,
          rows: summaryRows,
          showTotals: true
        },
        {
          title: 'DETALLE DE PRODUCTOS CONTADOS',
          columns: detailColumns,
          rows: detailRows,
          showTotals: false
        }
      ],
      observations: [
        `Reporte generado para el período ${periodText}.`,
        `Total de inventarios: ${filteredInventories.length}.`,
        `Total de productos contados: ${detailRows.length}.`,
        'Los pendientes son items con diferencia que aún no han sido ajustados.'
      ],
      chartRefs: [chartRef]
    };
  }, [filteredInventories, inventoryItemsMap, dateRange, getFilename, dateOptions]);

  // Kardex - Excel
  const excelConfigKardex = useMemo(() => {
    const periodText = dateOptions.find(o => o.value === dateRange)?.label || dateRange;
    const filename = getFilename('reporte_kardex');

    const columns = [
      { label: 'Cód. barra', key: 'barcode', align: 'center', width: 13, formatter: (v) => String(v || '—') },
      { label: 'Producto', key: 'product_name', align: 'center', width: 20, formatter: (v) => String(v || '—') },
      { label: 'Categoría', key: 'category_name', align: 'center', width: 10, formatter: (v) => String(v || '—') },
      // ← CORREGIDO: la columna ya recibe el valor formateado en rows, no necesita formatter
      { label: 'F. movimiento', key: 'created_at', align: 'center', width: 20 },
      { label: 'Tipo', key: 'type', align: 'center', width: 10, formatter: (v) => {
          const map = { entrada: 'Entrada', salida: 'Salida', adjustment: 'Ajuste', venta: 'Venta' };
          return map[v] || v;
        }
      },
      { label: 'Cant.', key: 'quantity', align: 'center', width: 8, numFmt: '#,##0', formatter: (v) => String(Number(v || 0).toLocaleString()) },
      { label: 'Notas', key: 'notes', align: 'left', width: 75, formatter: (v) => String(v || '—') }
    ];

    // ← CORREGIDO: aplicamos formatDate a la fecha
    const rows = filteredKardex.map(m => {
      const prod = products.find(p => p.id === m.product_id);
      const barcode = m.barcode || prod?.barcode || m.product_code || '—';
      return {
        barcode: barcode,
        product_name: m.product_name || '—',
        product_code: m.product_code || prod?.code || '—',
        category_name: prod ? categories.find(c => c.id === prod.category_id)?.name || '—' : '—',
        created_at: formatDate(m.created_at),
        type: m.type,
        quantity: Math.abs(Number(m.quantity) || 0),
        unit_cost: Number(m.unit_cost) || 0,
        notes: m.notes || ''
      };
    });

    const kpis = [
      { label: 'T. movimientos', value: filteredKardex.length, formatter: (v) => String(v) },
      { label: 'T. Productos', value: new Set(filteredKardex.map(m => m.product_id)).size, formatter: (v) => String(v) },
      { label: 'T. Entradas', value: filteredKardex.filter(m => m.type === 'entrada').length, formatter: (v) => String(v) },
      { label: 'T. Salidas', value: filteredKardex.filter(m => m.type === 'salida' || m.type === 'venta').length, formatter: (v) => String(v) },
    ];

    return {
      title: 'REPORTE DE KARDEX',
      subtitle: 'Movimientos de inventario por producto',
      period: `Período: ${periodText}`,
      filename,
      confidential: true,
      kpis,
      sections: [{ title: 'DETALLE DE MOVIMIENTOS', columns, rows, showTotals: true }],
      observations: [
        `Reporte generado para el período ${periodText}.`,
        `Total de registros: ${rows.length}.`,
        'Las cifras están expresadas en dólares americanos (USD).'
      ],
      chartRefs: [chartRef]
    };
  }, [filteredKardex, products, categories, dateRange, getFilename, dateOptions]);

  // Kardex - PDF
  const pdfConfigKardex = useMemo(() => {
    const periodText = dateOptions.find(o => o.value === dateRange)?.label || dateRange;
    const filename = getFilename('reporte_kardex');

    const columns = [
      { label: 'Cód. barra', key: 'barcode', align: 'center', width: 12 },
      { label: 'Producto', key: 'product_name', align: 'center', width: 18 },
      { label: 'Categoría', key: 'category_name', align: 'center', width: 8 },
      { label: 'Fecha', key: 'created_at', align: 'center', width: 15, formatter: (v) => formatDate(v) },
      { label: 'Tipo', key: 'type', align: 'center', width: 8, formatter: (v) => {
          const map = { entrada: 'Entrada', salida: 'Salida', adjustment: 'Ajuste', venta: 'Venta' };
          return map[v] || v;
        }
      },
      { label: 'Cant.', key: 'quantity', align: 'center', width: 6, formatter: (v) => String(Number(v || 0).toLocaleString()) },
      { label: 'C. unit.', key: 'unit_cost', align: 'center', width: 6, formatter: (v) => Number(v || 0) > 0 ? `$${Number(v).toFixed(2)}` : '—' },
      { label: 'Notas', key: 'notes', align: 'justify', width: 40 }
    ];

    const rows = filteredKardex.map(m => {
      const prod = products.find(p => p.id === m.product_id);
      const barcode = m.barcode || prod?.barcode || m.product_code || '—';
      return {
        barcode: barcode,
        product_name: m.product_name || '—',
        product_code: m.product_code || prod?.code || '—',
        category_name: prod ? categories.find(c => c.id === prod.category_id)?.name || '—' : '—',
        created_at: formatDate(m.created_at),
        type: m.type,
        quantity: Math.abs(Number(m.quantity) || 0),
        unit_cost: Number(m.unit_cost) || 0,
        notes: m.notes || ''
      };
    });

    const kpis = [
      { label: 'Total movimientos', value: filteredKardex.length, formatter: (v) => String(v) },
      { label: 'Productos distintos', value: new Set(filteredKardex.map(m => m.product_id)).size, formatter: (v) => String(v) },
      { label: 'Entradas', value: filteredKardex.filter(m => m.type === 'entrada').length, formatter: (v) => String(v) },
      { label: 'Salidas', value: filteredKardex.filter(m => m.type === 'salida' || m.type === 'venta').length, formatter: (v) => String(v) },
    ];

    return {
      title: 'REPORTE DE KARDEX',
      subtitle: 'Movimientos de inventario por producto',
      period: `Período: ${periodText}`,
      filename,
      confidential: true,
      landscape: true,
      kpis,
      sections: [{ title: 'DETALLE DE MOVIMIENTOS', columns, rows, showTotals: true }],
      observations: [
        `Reporte generado para el período ${periodText}.`,
        `Total de registros: ${rows.length}.`,
        'Las cifras están expresadas en dólares americanos (USD).'
      ],
      chartRefs: [chartRef]
    };
  }, [filteredKardex, products, categories, dateRange, getFilename, dateOptions]);

  // ─── Refresh button ────────────────────────────────────────────────────
  const refreshButton = useMemo(
    () => (
      <button
        onClick={handleRefresh}
        className="dashboard-refresh-btn-header"
        disabled={refreshing}
        title="Actualizar datos"
      >
        <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
        <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
      </button>
    ),
    [handleRefresh, refreshing]
  );

  // ─── Columnas para inventarios ──────────────────────────────────────
  const inventoryColumns = useMemo(() => [
    {
      accessor: 'name',
      label: 'Descripción',
      render: (item) => <span>{item.name || '—'}</span>
    },
    {
      accessor: 'closed_date',
      label: 'Fecha cierre',
      render: (item) => <span>{formatDate(item.closed_date)}</span>
    },
    {
      accessor: 'closed_by_name',
      label: 'Cerrado por',
      render: (item) => <span>{item.closed_by_name || '—'}</span>
    },
    {
      accessor: 'total_items',
      label: 'Total items',
      align: 'center',
      render: (item) => <span>{item.total_items || 0}</span>
    },
    {
      accessor: 'items_with_difference',
      label: 'Items con diff.',
      align: 'center',
      render: (item) => (
        <span style={{ color: item.items_with_difference > 0 ? '#f59e0b' : '#22c55e' }}>
          {item.items_with_difference || 0}
        </span>
      )
    },
    {
      accessor: 'pending_items',
      label: 'Pendientes',
      align: 'center',
      render: (item) => (
        <span style={{ color: item.pending_items > 0 ? '#ef4444' : '#22c55e' }}>
          {item.pending_items || 0}
        </span>
      )
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <button className="btn-icon" onClick={() => viewInventoryDetail(item.id)} title="Ver detalle">
          <FiEye size={16} />
        </button>
      )
    }
  ], []);

  // ─── Columnas para kardex ──────────────────────────────────────────
  const kardexColumns = useMemo(() => [
    {
      accessor: 'barcode',
      label: 'Cód. barras',
      render: (item) => <span>{item.barcode || '—'}</span>
    },
    {
      accessor: 'product_name',
      label: 'Producto',
      render: (item) => <span style={{ fontWeight: 500 }}>{item.product_name || '—'}</span>
    },
    {
      accessor: 'product_desc',
      label: 'Descripción',
      render: (item) => <span style={{ fontWeight: 500 }}>{item.product_desc || '—'}</span>
    },
    {
      accessor: 'last_movement_formatted',
      label: 'Último movimiento',
      render: (item) => <span>{item.last_movement_formatted || '—'}</span>
    },
    {
      accessor: 'stock',
      label: 'Stock actual',
      align: 'center',
      render: (item) => <span>{item.stock || 0}</span>
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <button className="btn-icon" onClick={() => viewProductKardex(item)} title="Ver kardex">
          <FiEye size={16} />
        </button>
      )
    }
  ], []);

  // ─── Toolbar ──────────────────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <div className="inventory-toolbar-left">
        {activeTab === 'kardex' && (
          <CustomCombobox
            options={categoryOptions}
            value={kardexCategoryFilter || ''}
            onChange={(val) => setKardexCategoryFilter(val || null)}
            placeholder="Todas las categorías"
            filterable={true}
            size="sm"
            forceDropup={false}
            style={{ minWidth: 140 }}
          />
        )}
      </div>

      {/* Dropdown de fechas */}
      <div className="report-dropdown">
        <button onClick={() => setShowDateDropdown(!showDateDropdown)} className="report-date-btn">
          <FiCalendar size={16} />
          {dateOptions.find(o => o.value === dateRange)?.label || 'Todas las fechas'}
          <FiChevronDown size={14} />
        </button>
        {showDateDropdown && (
          <div className="report-dropdown-menu">
            {dateOptions.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  if (option.value === 'custom') {
                    setShowCustomDate(true);
                  } else {
                    setDateRange(option.value);
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }
                  setShowDateDropdown(false);
                }}
                className={dateRange === option.value ? 'active' : ''}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ButtonGroup>
        {activeTab === 'inventories' && (
          <>
            <ReportExcelButton config={excelConfigInventories} />
            <ReportPdfButton customConfig={pdfConfigInventories} dateRange={{ from, to }} groupBy={null} />
          </>
        )}
        {activeTab === 'kardex' && (
          <>
            <ReportExcelButton config={excelConfigKardex} />
            <ReportPdfButton customConfig={pdfConfigKardex} dateRange={{ from, to }} groupBy={null} />
          </>
        )}
      </ButtonGroup>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="REPORTES DE INVENTARIO"
      subtitle="Kardex e inventarios realizados"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      <div className="reports-inventory-container">

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <div className="inventory-stats-grid">
          <div className="stat-card-mini">
            <div className="stat-card-mini-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
              <FiTrendingUp size={20} />
            </div>
            <div>
              <div className="stat-card-mini-label">Movimientos totales</div>
              <div className="stat-card-mini-value">{fmtNumber(stats.totalMovements)}</div>
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="stat-card-mini-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
              <FiCheck size={20} />
            </div>
            <div>
              <div className="stat-card-mini-label">Inventarios realizados</div>
              <div className="stat-card-mini-value">{fmtNumber(stats.totalInventories)}</div>
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="stat-card-mini-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
              <FiDollarSign size={20} />
            </div>
            <div>
              <div className="stat-card-mini-label">Productos</div>
              <div className="stat-card-mini-value">{fmtNumber(stats.totalProducts)}</div>
            </div>
          </div>
        </div>

        <div className="inventory-tabs">
          <button className={`inventory-tab ${activeTab === 'kardex' ? 'active' : ''}`} onClick={() => setActiveTab('kardex')}>
            <FiEye size={16} /> Kardex
          </button>
          <button className={`inventory-tab ${activeTab === 'inventories' ? 'active' : ''}`} onClick={() => setActiveTab('inventories')}>
            <FiPackage size={16} /> Inventarios realizados
          </button>
        </div>

        <div className="inventory-table-container">
          {activeTab === 'inventories' && (
            <Table
              data={filteredInventories}
              columns={inventoryColumns}
              keyField="id"
              title="Inventarios realizados"
              subtitle={`${filteredInventories.length} inventarios`}
              toolbar={toolbar}
              searchable={true}
              searchPlaceholder="Ej: Inventario Agosto"
              pagination={true}
              itemsPerPage={10}
              itemsPerPageOptions={[10, 15, 30]}
              loading={loading}
              emptyMessage="No hay inventarios cerrados en este período."
              striped={true}
              hoverable={true}
              bordered={false}
              compact={false}
            />
          )}

          {activeTab === 'kardex' && (
            <Table
              data={kardexProducts}
              columns={kardexColumns}
              keyField="product_id"
              title="Kardex de productos"
              subtitle={`${kardexProducts.length} productos con movimientos`}
              toolbar={toolbar}
              searchable={true}
              searchPlaceholder="Ej: Producto A, 6855555475209"
              pagination={true}
              itemsPerPage={15}
              itemsPerPageOptions={[10, 15, 30, 50]}
              loading={loading}
              emptyMessage="No hay movimientos en este período."
              striped={true}
              hoverable={true}
              bordered={false}
              compact={false}
            />
          )}
        </div>

        {/* Modal de detalle de inventario */}
        <Modal
          closeOnOverlayClick={false}
          isOpen={showInventoryDetail}
          onClose={() => setShowInventoryDetail(false)}
          title={`Detalle de inventario #${String(selectedInventory?.id || '').slice(0, 8)}`}
          size="full"
        >
          <div className="inventory-detail-body">
            <div className="inventory-detail-info">
              <div><strong>Descripción:</strong> {selectedInventory?.name || '—'}</div>
              <div><strong>Fecha cierre:</strong> {formatDate(selectedInventory?.closed_date)}</div>
              <div><strong>Cerrado por:</strong> {selectedInventory?.closed_by_name || '—'}</div>
              <div><strong>Total items:</strong> {selectedInventory?.total_items || 0}</div>
              <div><strong>Items con diferencia:</strong> {inventoryItems.filter(i => i.difference !== 0).length}</div>
            </div>
            <Table
              data={inventoryItems}
              columns={[
                { accessor: 'product_barcode', label: 'Cód. barras', render: (i) => <span>{i.product_barcode || '—'}</span> },
                { accessor: 'product_name', label: 'Producto', render: (i) => <span>{i.product_name}</span> },
                { accessor: 'category_name', label: 'Categoría', render: (i) => <span>{i.category_name || '—'}</span> },
                { accessor: 'system_stock', label: 'Cant. Sistema', align: 'right', render: (i) => <span>{i.system_stock}</span> },
                { accessor: 'counted_stock', label: 'Cant. Contado', align: 'right', render: (i) => <span>{i.counted_stock}</span> },
                { accessor: 'difference', label: 'Diferencia', align: 'right', render: (i) => <span style={{ color: i.difference > 0 ? '#22c55e' : i.difference < 0 ? '#ef4444' : '#6b7280' }}>{i.difference > 0 ? '+' : ''}{i.difference}</span> },
                { accessor: 'status', label: 'Estado', render: (i) => <span>{i.status === 'adjusted' ? '✅ Ajustado' : i.status === 'counted' ? 'Contado' : 'Pendiente'}</span> },
              ]}
              keyField="id"
              pagination={false}
              striped={true}
              hoverable={true}
              bordered={false}
              compact={true}
            />
          </div>
        </Modal>

        {/* Modal de kardex de producto */}
        <Modal
          closeOnOverlayClick={false}
          isOpen={showProductMovements}
          onClose={() => setShowProductMovements(false)}
          title={`Kardex - ${selectedProduct?.name || 'Producto'}`}
          size="xl"
        >
          <div className="product-kardex-body">
            <div className="product-kardex-info">
              <div><strong>Cód. barra:</strong> {selectedProduct?.barcode || '—'}</div>
              <div><strong>Categoría:</strong> {selectedProduct?.category_id ? categories.find(c => c.id === selectedProduct.category_id)?.name || '—' : '—'}</div>
              <div><strong>Stock actual:</strong> {selectedProduct?.stock || 0}</div>
              <div><strong>Total movimientos:</strong> {productMovements.length}</div>
            </div>
            <Table
              data={productMovements}
              columns={[
                { accessor: 'created_at', label: 'Fecha', render: (i) => <span>{formatDate(i.created_at)}</span> },
                { accessor: 'type', label: 'Tipo', render: (i) => {
                  const map = { entrada: 'Entrada', salida: 'Salida', adjustment: 'Ajuste', venta: 'Venta' };
                  return <span>{map[i.type] || i.type}</span>;
                }},
                { accessor: 'quantity', label: 'Cantidad', align: 'right', render: (i) => <span>{Math.abs(Number(i.quantity) || 0).toLocaleString()}</span> },
                { accessor: 'unit_cost', label: 'Costo unit.', align: 'right', render: (i) => <span>{i.unit_cost ? fmtCurrency(i.unit_cost) : '—'}</span> },
                { accessor: 'notes', label: 'Notas', render: (i) => <span>{i.notes || '—'}</span> },
              ]}
              keyField="id"
              pagination={true}
              itemsPerPage={15}
              striped={true}
              hoverable={true}
              bordered={false}
              compact={true}
            />
          </div>
        </Modal>

        {/* Modal de fechas personalizadas */}
        {showCustomDate && (
          <Modal
            closeOnOverlayClick={false}
            isOpen={true}
            onClose={() => setShowCustomDate(false)}
            title="Seleccionar fechas"
            size="sm"
          >
            <DateRangePicker
              startDate={customStartDate}
              endDate={customEndDate}
              onApply={(start, end) => {
                setCustomStartDate(start);
                setCustomEndDate(end);
                setDateRange('custom');
                setShowCustomDate(false);
              }}
              onClose={() => setShowCustomDate(false)}
            />
          </Modal>
        )}
      </div>
    </PageTemplate>
  );
}