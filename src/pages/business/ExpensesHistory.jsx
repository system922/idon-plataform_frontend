import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from '../../context/SessionContext'; // ✅ Única fuente de sesión
import ExcelJS from 'exceljs';
import {
  FiDollarSign, FiPlus, FiEdit2, FiTrash2, FiRefreshCw,
  FiAlertCircle, FiCalendar, FiChevronDown,
  FiDownload, FiX, FiTag, FiTrendingUp
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import { fetchWithAuth } from '../../config/api'; // ✅ Única fuente de llamadas API
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import SearchInput from '../../components/General/SearchInput';
import Input from '../../components/General/Input';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';

// ─── Helper para obtener fecha actual en Ecuador ────────────────────────────
function getTodayDateInEcuador() {
  const TZ = 'America/Guayaquil';
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: TZ });
}

// ─── Helper para formatear fecha ────────────────────────────────────────────
const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString('es-EC');
};

// ─── Helper para convertir a número seguro ───────────────────────────────────
const toNumber = (val) => Number(val) || 0;

// ─── Componente de tarjeta de resumen ─────────────────────────────────────────
function SummaryCard({ title, value, icon, color, subtitle }) {
  return (
    <div className="report-product-card">
      <div className="report-product-card-icon" style={{ color }}>
        {icon}
      </div>
      <div className="report-product-card-content">
        <div className="report-product-card-title">{title}</div>
        <div className="report-product-card-value">{value ?? '0'}</div>
        {subtitle && <div className="report-product-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Componente de selector de fechas personalizadas ─────────────────────────
function DateRangePicker({ startDate, endDate, onApply, onClose }) {
  const [localStart, setLocalStart] = useState(startDate || '');
  const [localEnd, setLocalEnd] = useState(endDate || '');

  const handleApply = () => {
    if (localStart && localEnd) {
      onApply(localStart, localEnd);
    }
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

// ─── Modal de Gastos ─────────────────────────────────────────────────────────
function ExpenseModal({ expense, categories, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category_id: '',
    date: getTodayDateInEcuador(),
    reference: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense) {
      const amountValue = expense.amount ? Number(expense.amount).toFixed(2) : '';
      setForm({
        description: expense.description || '',
        amount: amountValue,
        category_id: expense.category_id ? String(expense.category_id) : '',
        date: expense.date?.split('T')[0] || getTodayDateInEcuador(),
        reference: expense.reference || ''
      });
    }
  }, [expense]);

  const categoryOptions = useMemo(() => {
    return categories.map(cat => ({
      value: String(cat.id),
      label: cat.name
    }));
  }, [categories]);

  const formatMoneyRealtime = (value) => {
    if (!value) return '';
    let clean = value.toString().replace(/[^\d]/g, '');
    if (!clean) return '';
    const numberValue = parseInt(clean, 10);
    const realValue = numberValue / 100;
    return realValue.toFixed(2);
  };

  const handleAmountChange = (value) => {
    if (!value) {
      setForm(f => ({ ...f, amount: '' }));
      return;
    }
    const formatted = formatMoneyRealtime(value);
    setForm(f => ({ ...f, amount: formatted }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description.trim()) {
      setError('❌ La descripción es requerida');
      return;
    }
    const amountNumber = parseFloat(form.amount);
    if (!form.amount || isNaN(amountNumber) || amountNumber <= 0) {
      setError('❌ El monto debe ser mayor a 0');
      return;
    }
    if (!form.category_id) {
      setError('❌ La categoría es requerida');
      return;
    }
    onSave({
      ...form,
      amount: amountNumber
    });
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={expense ? 'Editar gasto' : 'Nuevo gasto'}
      size="md"
      footer={
        <>
          {error && (
            <div className="modal-error-text" style={{ color: 'var(--danger)', marginBottom: '12px' }}>
              <FiAlertCircle size={16} /> {error}
            </div>
          )}
          <ButtonGroup>
            <IconTextButton
              variant="danger"
              size="md"
              icon={<FiX size={14} />}
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              icon={<FiPlus size={14} />}
              onClick={handleSubmit}
              disabled={saving || !form.description.trim() || !form.amount || !form.category_id}
              loading={saving}
            >
              {saving ? 'Guardando...' : expense ? 'Guardar cambios' : 'Crear gasto'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
              Descripción *
            </label>
            <Input
              type="text"
              value={form.description}
              onChange={(value) => setForm(f => ({ ...f, description: value }))}
              placeholder="Ej: Compra de insumos, Pago de servicios..."
              size="md"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
              Monto *
            </label>
            <Input
              type="text"
              value={form.amount}
              onChange={handleAmountChange}
              onFocus={handleFocus}
              placeholder="0.00"
              size="md"
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
              Categoría *
            </label>
            <CustomCombobox
              options={categoryOptions}
              value={form.category_id || ''}
              onChange={(value) => setForm(f => ({ ...f, category_id: value }))}
              placeholder="Seleccionar categoría"
              filterable={true}
              size="md"
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
              Fecha *
            </label>
            <Input
              type="date"
              value={form.date}
              onChange={(value) => setForm(f => ({ ...f, date: value }))}
              size="md"
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
              Referencia/N°
            </label>
            <Input
              type="text"
              value={form.reference}
              onChange={(value) => setForm(f => ({ ...f, reference: value }))}
              placeholder="Factura #, comprobante..."
              size="md"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AccountingExpensesPage() {
  const { user } = useSession(); // ✅ Obtenemos usuario y su businessId
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ─── Obtener businessId (desde user o sessionStorage) ──────────────────
  const getBusinessId = useCallback(() => {
    try {
      const fromSession = sessionStorage.getItem('business_id');
      if (fromSession) return fromSession;
      if (user?.businessId) return user.businessId;
      return null;
    } catch {
      return null;
    }
  }, [user]);

  const businessId = getBusinessId();

  // ─── Opciones de período ───────────────────────────────────────────────────
  const dateOptions = useMemo(() => ([
    { value: 'all', label: 'Todo' },
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este año' },
    { value: 'custom', label: 'Personalizado' }
  ]), []);

  // ─── Opciones para categorías ─────────────────────────────────────────────
  const categoryOptions = useMemo(() => [
    { value: '', label: 'Todas las categorías' },
    ...categories.map(cat => ({ value: cat.id, label: cat.name }))
  ], [categories]);

  // ─── Calcular rango de fechas según selección ──────────────────────────────
  const getDateRange = useCallback(() => {
    if (dateRange === 'all') {
      return { startDate: null, endDate: null };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate = null;
    let endDate = null;

    if (dateRange === 'day') {
      startDate = new Date(today);
      endDate = new Date(today);
    } else if (dateRange === 'week') {
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const diff = day === 0 ? 6 : day - 1;
      weekStart.setDate(weekStart.getDate() - diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      startDate = weekStart;
      endDate = weekEnd;
    } else if (dateRange === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (dateRange === 'quarter') {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      startDate = new Date(today.getFullYear(), quarterStartMonth, 1);
      endDate = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
    } else if (dateRange === 'year') {
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    }

    return { startDate, endDate };
  }, [dateRange, customStartDate, customEndDate]);

  // ─── Cargar categorías ─────────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    if (!businessId) {
      setCategories([]);
      return;
    }
    try {
      const res = await fetchWithAuth(`/expense-categories?businessId=${businessId}`);
      if (!res.ok) throw new Error('Error al cargar categorías');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setCategories([]);
    }
  }, [businessId]);

  // ─── Cargar gastos con filtro de fechas ──────────────────────────────────
  const loadExpenses = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      params.append('businessId', businessId); // ✅ Añadimos businessId

      const { startDate, endDate } = getDateRange();
      
      if (startDate) {
        params.append('date_from', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        params.append('date_to', endDate.toISOString().split('T')[0]);
      }
      
      if (selectedCategory) {
        params.append('category_id', selectedCategory);
      }
      params.append('order_by', 'date');
      params.append('order_dir', 'DESC');
      params.append('limit', '9999');
      
      const url = `/expenses?${params.toString()}`;

      const res = await fetchWithAuth(url);
      
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
      
      const data = await res.json();

      let expensesList = [];
      if (Array.isArray(data)) {
        expensesList = data;
      } else if (data.data && Array.isArray(data.data)) {
        expensesList = data.data;
      } else if (data.expenses && Array.isArray(data.expenses)) {
        expensesList = data.expenses;
      }

      const formatted = expensesList.map((item) => ({
        id: item.id,
        date: item.date,
        description: item.description || 'Sin descripción',
        category_id: item.category_id,
        category_name: item.category_name || categories.find(c => c.id === item.category_id)?.name || 'Sin categoría',
        reference: item.reference || '-',
        amount: Number(item.amount) || 0
      }));
      
      setExpenses(formatted);
      
    } catch (err) {
      setError('Error al cargar los gastos: ' + (err.message || 'Error desconocido'));
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedCategory, categories, getDateRange]);

  // ─── Efectos ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (businessId) {
      loadCategories();
    }
  }, [businessId, loadCategories]);

  useEffect(() => {
    if (businessId) {
      loadExpenses();
    }
  }, [loadExpenses]);

  useRealtimeSync('expenses', loadExpenses);

  // ─── Datos filtrados por búsqueda ──────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    if (!search) return expenses;
    const term = search.toLowerCase();
    return expenses.filter(e =>
      e.description?.toLowerCase().includes(term) ||
      e.reference?.toLowerCase().includes(term)
    );
  }, [expenses, search]);

  // ─── Estadísticas ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const count = filteredExpenses.length;
    const average = count > 0 ? total / count : 0;
    
    return {
      total: total,
      average: average,
      count: count,
      categories: categories.length
    };
  }, [filteredExpenses, categories]);

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([loadExpenses(), loadCategories()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    setShowDateDropdown(false);
    if (value === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleApplyCustomDate = (start, end) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setDateRange('custom');
    setShowCustomDate(false);
    setShowDateDropdown(false);
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSearch('');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleSaveExpense = async (form) => {
    setSaving(true);
    setError('');
    try {
      const isEdit = !!editingExpense;
      const url = isEdit ? `/expenses/${editingExpense.id}` : '/expenses';
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        description: form.description,
        amount: parseFloat(form.amount),
        category_id: form.category_id,
        date: form.date,
        reference: form.reference || null,
        businessId: businessId, // ✅ Añadimos businessId al payload
        // created_by: user?.id // Opcional, si el backend lo requiere
      };
      
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al guardar');
      }
      
      setShowModal(false);
      setEditingExpense(null);
      loadExpenses();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (expense) => {
    // ✅ Confirmación con window.confirm (sin useConfirm)
    if (!window.confirm(`¿Eliminar el gasto "${expense.description}"?`)) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/expenses/${expense.id}?businessId=${businessId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      loadExpenses();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Exportar a Excel ──────────────────────────────────────────────────────
  const handleExportXLSX = async () => {
    if (!filteredExpenses.length) {
      setError('No hay datos para exportar');
      return;
    }

    setExporting(true);
    setError('');
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Gestion';
      wb.created = new Date();

      const ws = wb.addWorksheet('Gastos', {
        views: [{ showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      });

      ws.columns = [
        { header: 'Fecha', key: 'date', width: 18 },
        { header: 'Descripción', key: 'description', width: 35 },
        { header: 'Categoría', key: 'category', width: 20 },
        { header: 'Referencia', key: 'reference', width: 18 },
        { header: 'Monto', key: 'amount', width: 18 },
      ];

      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };

      const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      
      filteredExpenses.forEach(e => {
        ws.addRow({
          date: formatDate(e.date),
          description: e.description,
          category: e.category_name || 'Sin categoría',
          reference: e.reference || '-',
          amount: Number(e.amount) || 0
        });
      });

      const totalRow = ws.addRow({
        date: '',
        description: '',
        category: '',
        reference: 'TOTAL',
        amount: totalAmount
      });
      totalRow.font = { bold: true };

      ws.getColumn('amount').numFmt = '"$"#,##0.00';

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gastos_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  };

  // ─── Configuración para PDF ──────────────────────────────────────────────
  const pdfConfig = useMemo(() => {
    if (!filteredExpenses.length) return null;
    
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalCount = filteredExpenses.length;
    const average = totalCount > 0 ? totalAmount / totalCount : 0;
    
    return {
      title: 'Historial de Gastos',
      subtitle: `Período: ${dateOptions.find(o => o.value === dateRange)?.label || dateRange}`,
      kpis: [
        { label: 'Total Gastos', value: totalAmount, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Promedio', value: average, formatter: (v) => `$${Number(v).toFixed(2)}` },
        { label: 'Cantidad', value: totalCount },
        { label: 'Categorías', value: categories.length }
      ],
      sections: [{
        title: 'Detalle de Gastos',
        columns: [
          { label: 'Fecha', key: 'date', width: 18, formatter: (v) => formatDate(v) },
          { label: 'Descripción', key: 'description', width: 35 },
          { label: 'Categoría', key: 'category', width: 20 },
          { label: 'Referencia', key: 'reference', width: 18 },
          { label: 'Monto', key: 'amount', width: 18, formatter: (v) => `$${Number(v).toFixed(2)}` }
        ],
        rows: filteredExpenses.map(e => ({
          date: e.date,
          description: e.description,
          category: e.category_name || 'Sin categoría',
          reference: e.reference || '-',
          amount: Number(e.amount) || 0
        }))
      }]
    };
  }, [filteredExpenses, categories, dateRange, dateOptions]);

  // ─── Columnas de la tabla ──────────────────────────────────────────────
  const columns = [
    {
      accessor: 'date',
      label: 'Fecha',
      render: (item) => <span>{formatDate(item.date)}</span>,
    },
    {
      accessor: 'description',
      label: 'Descripción',
      render: (item) => <span>{item.description}</span>,
    },
    {
      accessor: 'category_name',
      label: 'Categoría',
      render: (item) => (
        <span className="report-product-category">{item.category_name || 'Sin categoría'}</span>
      ),
    },
    {
      accessor: 'reference',
      label: 'Referencia',
      render: (item) => <span className="report-product-sku">{item.reference || '—'}</span>,
    },
    {
      accessor: 'amount',
      label: 'Monto',
      align: 'center',
      render: (item) => <span>${Number(item.amount).toFixed(2)}</span>,
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="blue"
            size="sm"
            inline={true}
            icon={<FiEdit2 size={14} />}
            onClick={() => {
              setEditingExpense(item);
              setError('');
              setShowModal(true);
            }}
            tooltip="Editar gasto"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<FiTrash2 size={14} />}
            onClick={() => handleDeleteExpense(item)}
            tooltip="Eliminar gasto"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  // ─── Toolbar de la tabla ──────────────────────────────────────────────────
  const toolbar = (
    <div className="products-toolbar">
      <div className="products-toolbar-left" >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por descripción o referencia..."
          size="md"
          onClear={() => setSearch('')}
          autoFocus={false}
        />
      </div>
      <div className="products-toolbar-right">
        <div className="report-dropdown">
          <button onClick={() => setShowDateDropdown(!showDateDropdown)} className="report-date-btn">
            <FiCalendar size={16} />
            {dateOptions.find(o => o.value === dateRange)?.label || 'Todo'}
            <FiChevronDown size={14} />
          </button>
          {showDateDropdown && (
            <div className="report-dropdown-menu">
              {dateOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleDateRangeChange(option.value)}
                  className={dateRange === option.value ? 'active' : ''}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="products-filter-group">
          <CustomCombobox
            options={categoryOptions}
            value={selectedCategory || ''}
            onChange={setSelectedCategory}
            placeholder="Todas las categorías"
            filterable={true}
          />
        </div>
        <IconTextButton
          variant=""
          size="md"
          icon={<FiX size={14} />}
          onClick={handleClearFilters}
        >
          Limpiar
        </IconTextButton>
      </div>
    </div>
  );

  // ─── Botón de refrescar ───────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ─── Header Actions ─────────────────────────────────────────────────────
  const headerActions = (
    <div className="products-header-actions">
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={14} />}
          onClick={() => {
            setEditingExpense(null);
            setError('');
            setShowModal(true);
          }}
        >
          Nuevo gasto
        </IconTextButton>
        <IconTextButton
          variant="info"
          size="md"
          icon={<FiDownload size={14} />}
          onClick={handleExportXLSX}
          disabled={exporting || !filteredExpenses.length}
          loading={exporting}
        >
          Excel
        </IconTextButton>
        <ReportPdfButton customConfig={pdfConfig} />
        {refreshButton}
      </ButtonGroup>
    </div>
  );

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="HISTORIAL DE GASTOS"
      subtitle="Gestión y control de gastos contables"
      theme="business"
      loading={loading}
      headerAction={headerActions}
    >
      {!businessId && !loading && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> No se encontró un negocio activo.
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="report-summary-grid">
        <SummaryCard
          title="Total Gastos"
          value={`$${stats.total.toFixed(2)}`}
          icon={<FiDollarSign size={24} />}
          color="var(--text-primary)"
        />
        <SummaryCard
          title="Promedio"
          value={`$${stats.average.toFixed(2)}`}
          icon={<FiTrendingUp size={24} />}
          color="var(--text-primary)"
        />
        <SummaryCard
          title="Categorías"
          value={stats.categories}
          icon={<FiTag size={24} />}
          color="var(--text-primary)"
        />
        <SummaryCard
          title="Cantidad Gastos"
          value={stats.count}
          icon={<FiCalendar size={24} />}
          color="var(--text-primary)"
        />
      </div>

      {/* Tabla de gastos */}
      <div className="report-table-container">
        <Table
          data={filteredExpenses}
          columns={columns}
          keyField="id"
          title="Listado de gastos"
          subtitle={`${filteredExpenses.length} ${filteredExpenses.length === 1 ? 'gasto' : 'gastos'} registrados`}
          toolbar={toolbar}
          searchable={false}
          pagination={true}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 15]}
          onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
          loading={loading}
          emptyMessage={
            search || selectedCategory || dateRange !== 'all'
              ? 'No hay gastos que coincidan con los filtros aplicados'
              : 'No hay gastos registrados. ¡Registra tu primer gasto!'
          }
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
          footer={
            filteredExpenses.length > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', fontWeight: 'bold' }}>
                <span>Total: ${filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0).toFixed(2)}</span>
              </div>
            ) : null
          }
        />
      </div>

      {/* Modal de fechas personalizadas */}
      {showCustomDate && (
        <div className="report-modal-overlay" onClick={() => setShowCustomDate(false)}>
          <div className="report-modal-box" onClick={e => e.stopPropagation()}>
            <div className="report-modal-header">
              <h2>Seleccionar fechas</h2>
              <button type="button" onClick={() => setShowCustomDate(false)} className="report-modal-close">×</button>
            </div>
            <div className="report-modal-body">
              <DateRangePicker
                startDate={customStartDate}
                endDate={customEndDate}
                onApply={handleApplyCustomDate}
                onClose={() => setShowCustomDate(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de gasto */}
      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          categories={categories}
          onClose={() => { setShowModal(false); setEditingExpense(null); }}
          onSave={handleSaveExpense}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}