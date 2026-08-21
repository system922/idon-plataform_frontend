import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from '../../context/SessionContext'; 
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import ExcelJS from 'exceljs';
import {
  FiDollarSign, FiEdit2, FiTrash2, FiRefreshCw,
  FiAlertCircle, FiDownload, FiCheckCircle, FiClock,
  FiAlertTriangle
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { fetchWithAuth } from '../../config/api'; 

// ─── Helper para formatear fechas ────────────────────────────────────────────
const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-EC');
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
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

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
        />
        <span>a</span>
        <input
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
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

// ─── Helper para convertir a número seguro ───────────────────────────────────
const toNumber = (val) => Number(val) || 0;

// ─── Modal de Edición de Cuenta por Cobrar ──────────────────────────────────
function ReceivableEditModal({ receivable, customers, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    customer_id: '',
    customer_cedula: '',
    amount: '',
    description: '',
    due_date: '',
    invoice_number: '',
    status: 'pending',
    notes: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (receivable) {
      setForm({
        customer_id: receivable.customer_id || '',
        customer_cedula: receivable.customer_cedula || '',
        amount: receivable.amount || '',
        description: receivable.description || '',
        due_date: receivable.due_date?.split('T')[0] || '',
        invoice_number: receivable.invoice_number || '',
        status: receivable.status || 'pending',
        notes: receivable.notes || ''
      });
    }
  }, [receivable]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) {
      setError('Seleccione un cliente');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    if (!form.description.trim()) {
      setError('La descripción es requerida');
      return;
    }
    if (!form.due_date) {
      setError('La fecha de vencimiento es requerida');
      return;
    }
    
    onSave({
      ...form,
      amount: parseFloat(form.amount),
      customer_cedula: form.customer_cedula
    });
  };

  const selectedCustomer = customers.find(c => c.id === form.customer_id);
  const customerName = selectedCustomer?.name || '';
  const isPaid = receivable?.status === 'paid';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Editar cuenta por cobrar"
      size="lg"
      footer={
        <ButtonGroup>
          <IconTextButton 
            variant="secondary" 
            size="md" 
            onClick={onClose} 
            disabled={saving}>
            Cancelar
          </IconTextButton>
          <IconTextButton 
            variant="primary" 
            size="md" 
            type="submit" 
            disabled={saving || isPaid} 
            loading={saving} 
            form="receivable-edit-form">
            {isPaid ? 'Cuenta pagada - No editable' : (saving ? 'Guardando...' : 'Guardar cambios')}
          </IconTextButton>
        </ButtonGroup>
      }
    >
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {isPaid && (
        <div className="alert alert-info" style={{ marginBottom: '16px' }}>
          <FiCheckCircle size={16} /> Esta cuenta ya está pagada y no se puede modificar.
        </div>
      )}

      <form id="receivable-edit-form" onSubmit={handleSubmit} style={{ padding: '0' }}>
        {/* Fila 1: N° Factura y Cliente */}
        <div className="form-row">
          <div className="form-group">
            <label>N° Factura/Comprobante</label>
            <input
              type="text"
              value={form.invoice_number}
              disabled={true}
              placeholder="Factura #"
            />
          </div>
          <div className="form-group">
            <label>Cliente *</label>
            <input
              type="text"
              value={customerName}
              disabled={true}
              placeholder="Cliente"
            />
          </div>
        </div>

        {/* Fila 2: Monto y Descripción */}
        <div className="form-row">
          <div className="form-group">
            <label>Monto *</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              disabled={true}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label>Descripción *</label>
            <input
              type="text"
              value={form.description}
              disabled={true}
              placeholder="Ej: Venta de productos, Servicio..."
            />
          </div>
        </div>

        {/* Fila 3: Fecha de vencimiento y Estado */}
        <div className="form-row">
          <div className="form-group">
            <label>Fecha de vencimiento *</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
              disabled={isPaid}
            />
          </div>
          <div className="form-group">
            <label>Estado</label>
            <input
              type="text"
              value={
                form.status === 'pending' ? 'Pendiente' :
                form.status === 'partial' ? 'Pago parcial' :
                form.status === 'paid' ? 'Pagado' :
                form.status === 'overdue' ? 'Vencido' : 'Pendiente'
              }
              disabled={true}
              placeholder="Estado"
            />
          </div>
        </div>

        {/* Notas (opcional) */}
        <div className="form-group">
          <label>Notas (opcional)</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Notas adicionales..."
            disabled={isPaid}
          />
        </div>
      </form>
    </Modal>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AccountingReceivablePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { showConfirm } = useConfirm();
  const alert = useAlert();

  // ─── Obtener businessId de forma robusta (igual que en RolesPage) ──────────
  const getBusinessId = useCallback(() => {
    try {
      const fromSession = sessionStorage.getItem('business_id');
      if (fromSession) {
        return fromSession;
      }
      if (user?.businessId) {
        return user.businessId;
      }
      return null;
    } catch {
      return null;
    }
  }, [user]);

  const businessId = getBusinessId();

  const [receivables, setReceivables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ─── Cargar cuentas por cobrar ──────────────────────────────────────────
  const loadReceivables = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!businessId) {
        setReceivables([]);
        return;
      }

      const response = await fetchWithAuth(`/accounting-receivable/receivables?businessId=${businessId}`);
      const data = await response.json();
      const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setReceivables(rows);
    } catch (err) {
      setReceivables([]);
      setError(err.message || 'Error al cargar cuentas por cobrar');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // ─── Cargar clientes ──────────────────────────────────────────────────────
  const loadCustomers = useCallback(async () => {
    try {
      if (!businessId) {
        setCustomers([]);
        return;
      }

      const response = await fetchWithAuth(`/customers?businessId=${businessId}`);
      const data = await response.json();
      const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setCustomers(rows);
    } catch (err) {
      setCustomers([]);
    }
  }, [businessId]);

  // ─── Cargar datos al montar y cuando cambie businessId ──────────────────
  useEffect(() => {
    if (businessId) {
      loadReceivables();
      loadCustomers();
    } else {
      setLoading(false);
    }
  }, [businessId, loadReceivables, loadCustomers]);

  // ─── Opciones de fecha y estado ──────────────────────────────────────────
  const dateOptions = useMemo(() => ([
    { value: 'all', label: 'Todas' },
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Este trimestre' },
    { value: 'year', label: 'Este año' },
    { value: 'custom', label: 'Personalizado' }
  ]), []);

  const statusOptions = useMemo(() => ([
    { value: 'all', label: 'Todos los estados' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'partial', label: 'Pago parcial' },
    { value: 'paid', label: 'Pagado' },
    { value: 'overdue', label: 'Vencido' }
  ]), []);

  const handleDateRangeChange = useCallback((value) => {
    setDateRange(value);
    if (value !== 'custom') {
      setShowCustomDate(false);
      setCustomStartDate('');
      setCustomEndDate('');
    }
    if (value === 'custom') {
      setShowCustomDate(true);
    }
  }, []);

  const handleApplyCustomDate = useCallback((start, end) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setDateRange('custom');
    setShowCustomDate(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('all');
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowCustomDate(false);
  }, []);

  // ─── Filtrado de cuentas ──────────────────────────────────────────────────
  const filteredReceivables = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let rangeStart = null;
    let rangeEnd = null;

    if (dateRange === 'day') {
      rangeStart = today;
      rangeEnd = today;
    } else if (dateRange === 'week') {
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const diff = day === 0 ? 6 : day - 1;
      weekStart.setDate(weekStart.getDate() - diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      rangeStart = weekStart;
      rangeEnd = weekEnd;
    } else if (dateRange === 'month') {
      rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
      rangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (dateRange === 'quarter') {
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      rangeStart = new Date(today.getFullYear(), quarterStartMonth, 1);
      rangeEnd = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
    } else if (dateRange === 'year') {
      rangeStart = new Date(today.getFullYear(), 0, 1);
      rangeEnd = new Date(today.getFullYear(), 11, 31);
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      rangeStart = new Date(`${customStartDate}T00:00:00`);
      rangeEnd = new Date(`${customEndDate}T23:59:59`);
    }

    return receivables.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (searchTerm) {
        const searchable = [item.customer_name, item.description, item.invoice_number, item.customer_cedula]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(searchTerm)) return false;
      }

      if (rangeStart && rangeEnd) {
        const dueDate = normalizeDate(item.due_date);
        if (!dueDate) return false;
        const due = new Date(`${dueDate}T00:00:00`);
        if (due < rangeStart || due > rangeEnd) return false;
      }

      return true;
    });
  }, [receivables, search, statusFilter, dateRange, customStartDate, customEndDate]);

  // ─── Estadísticas ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalReceivable = filteredReceivables.reduce((sum, r) => sum + toNumber(r.amount), 0);
    const totalPaid = filteredReceivables
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + toNumber(r.amount), 0);
    const totalPending = filteredReceivables
      .filter(r => r.status === 'pending' || r.status === 'partial')
      .reduce((sum, r) => sum + toNumber(r.balance !== undefined ? r.balance : r.amount), 0);
    const totalOverdue = filteredReceivables
      .filter(r => r.status === 'overdue')
      .reduce((sum, r) => sum + toNumber(r.balance !== undefined ? r.balance : r.amount), 0);

    return {
      total_receivable: totalReceivable,
      total_paid: totalPaid,
      total_pending: totalPending,
      total_overdue: totalOverdue,
    };
  }, [filteredReceivables]);

  // ─── Exportar a Excel ──────────────────────────────────────────────────────
  const handleExportXLSX = useCallback(async () => {
    setExporting(true);
    setError('');
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Plataforma';
      wb.created = new Date();

      const applyStyle = (cell, style) => {
        cell.style = { ...cell.style, ...style };
      };

      const styleHeader = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          font: { bold: true, color: { argb: 'FFFFFF' }, size: 14 },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: {
            top: { style: 'thin', color: { argb: '1E40AF' } },
            bottom: { style: 'thin', color: { argb: '1E40AF' } },
            left: { style: 'thin', color: { argb: '1E40AF' } },
            right: { style: 'thin', color: { argb: '1E40AF' } },
          },
        });
      };

      const styleSection = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          font: { bold: true, color: { argb: 'FFFFFF' }, size: 11 },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } },
          alignment: { vertical: 'middle', horizontal: 'left' },
        });
      };

      const styleColHeader = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          font: { bold: true, color: { argb: 'FFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: {
            top: { style: 'thin', color: { argb: '3B82F6' } },
            bottom: { style: 'thin', color: { argb: '3B82F6' } },
            left: { style: 'thin', color: { argb: '3B82F6' } },
            right: { style: 'thin', color: { argb: '3B82F6' } },
          },
        });
      };

      const styleData = (cell, value, align = 'left', alt = false, numFmt = null) => {
        cell.value = value;
        const style = {
          alignment: { horizontal: align, vertical: 'middle' },
          border: {
            top: { style: 'thin', color: { argb: 'D1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
            left: { style: 'thin', color: { argb: 'D1D5DB' } },
            right: { style: 'thin', color: { argb: 'D1D5DB' } },
          },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? 'F8FAFC' : 'FFFFFF' } },
        };
        if (numFmt) style.numFmt = numFmt;
        applyStyle(cell, style);
      };

      const styleTotals = (cell, value, align = 'left', numFmt = null) => {
        cell.value = value;
        const style = {
          font: { bold: true },
          alignment: { horizontal: align, vertical: 'middle' },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } },
          border: {
            top: { style: 'thin', color: { argb: '3B82F6' } },
            bottom: { style: 'thin', color: { argb: '3B82F6' } },
            left: { style: 'thin', color: { argb: '3B82F6' } },
            right: { style: 'thin', color: { argb: '3B82F6' } },
          },
        };
        if (numFmt) style.numFmt = numFmt;
        applyStyle(cell, style);
      };

      const ws = wb.addWorksheet('Cuentas por Cobrar', {
        views: [{ showGridLines: false }],
        pageSetup: { paperSize: 9, orientation: 'landscape' }
      });

      ws.columns = [
        { key: 'cliente', width: 30 },
        { key: 'descripcion', width: 35 },
        { key: 'factura', width: 15 },
        { key: 'vencimiento', width: 15 },
        { key: 'estado', width: 15 },
        { key: 'monto', width: 15 },
        { key: 'saldo', width: 15 },
      ];

      ws.mergeCells('A1:G1');
      styleHeader(ws.getCell('A1'), 'CUENTAS POR COBRAR');
      ws.getRow(1).height = 28;
      ws.getRow(2).height = 6;
      ws.mergeCells('A3:G3');
      styleSection(ws.getCell('A3'), '  LISTADO DE CUENTAS ACTIVAS');
      ws.getRow(3).height = 18;

      const headers = ['Cliente', 'Descripción', 'N° Factura', 'Vencimiento', 'Estado', 'Monto Total', 'Saldo Pendiente'];
      headers.forEach((h, i) => styleColHeader(ws.getCell(4, i + 1), h));
      ws.getRow(4).height = 16;

      let sumMonto = 0;
      let sumSaldo = 0;
      filteredReceivables.forEach((r, idx) => {
        const alt = idx % 2 === 1;
        const monto = toNumber(r.amount);
        const saldo = toNumber(r.balance !== undefined ? r.balance : r.amount);
        sumMonto += monto;
        sumSaldo += saldo;
        const rowNum = 5 + idx;
        ws.getRow(rowNum).height = 15;
        styleData(ws.getCell(rowNum, 1), r.customer_name || 'Sin cliente', 'left', alt);
        styleData(ws.getCell(rowNum, 2), r.description || '-', 'left', alt);
        styleData(ws.getCell(rowNum, 3), r.invoice_number || '-', 'center', alt);
        styleData(ws.getCell(rowNum, 4), formatDate(r.due_date), 'center', alt);
        const estado = r.status === 'paid' ? 'Pagado' : (r.status === 'overdue' ? 'Vencido' : (r.status === 'partial' ? 'Pago parcial' : 'Pendiente'));
        styleData(ws.getCell(rowNum, 5), estado, 'center', alt);
        styleData(ws.getCell(rowNum, 6), monto, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(rowNum, 7), saldo, 'right', alt, '"$"#,##0.00');
      });

      const lastRow = 5 + filteredReceivables.length;
      ws.getRow(lastRow).height = 18;
      styleTotals(ws.getCell(lastRow, 1), 'TOTALES', 'left');
      [2, 3, 4, 5].forEach(c => styleTotals(ws.getCell(lastRow, c), ''));
      styleTotals(ws.getCell(lastRow, 6), sumMonto, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(lastRow, 7), sumSaldo, 'right', '"$"#,##0.00');

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cuentas_por_cobrar_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  }, [filteredReceivables]);

  // ─── Configuración para PDF ──────────────────────────────────────────────
  const pdfConfig = useMemo(() => {
    if (!filteredReceivables.length) return null;
    return {
      title: 'Cuentas por Cobrar',
      kpis: [
        { label: 'Total por cobrar', value: stats.total_receivable, formatter: (v) => `$${toNumber(v).toFixed(2)}` },
        { label: 'Pagado', value: stats.total_paid, formatter: (v) => `$${toNumber(v).toFixed(2)}` },
        { label: 'Pendiente', value: stats.total_pending, formatter: (v) => `$${toNumber(v).toFixed(2)}` },
        { label: 'Vencido', value: stats.total_overdue, formatter: (v) => `$${toNumber(v).toFixed(2)}` }
      ],
      sections: [{
        title: 'Listado de Cuentas por Cobrar',
        columns: [
          { label: 'Cliente', key: 'cliente', width: 30 },
          { label: 'Descripción', key: 'descripcion', width: 35 },
          { label: 'N° Factura', key: 'factura', width: 15 },
          { label: 'Vencimiento', key: 'vencimiento', width: 15, formatter: (v) => formatDate(v) },
          { label: 'Monto Total', key: 'monto', width: 15, formatter: (v) => `$${toNumber(v).toFixed(2)}` },
          { label: 'Saldo Pendiente', key: 'saldo', width: 15, formatter: (v) => `$${toNumber(v).toFixed(2)}` }
        ],
        rows: filteredReceivables.map(r => ({
          cliente: r.customer_name || 'Sin cliente',
          descripcion: r.description || '-',
          factura: r.invoice_number || '-',
          vencimiento: r.due_date,
          monto: toNumber(r.amount),
          saldo: toNumber(r.balance !== undefined ? r.balance : r.amount)
        }))
      }]
    };
  }, [filteredReceivables, stats]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReceivables();
    await loadCustomers();
    setRefreshing(false);
  }, [loadReceivables, loadCustomers]);

  const handleSaveReceivable = async (form) => {
    setSaving(true);
    setError('');
    try {
      const url = `/accounting-receivable/receivables/${editingReceivable.id}`;
      const method = 'PUT';
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setShowEditModal(false);
      setEditingReceivable(null);
      loadReceivables();
      await alert.success('Cuenta por cobrar actualizada correctamente');
    } catch (e) {
      setError(e.message);
      await alert.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Eliminar con confirmación y auditoría ──────────────────────────────
  const handleDeleteReceivable = useCallback(async (receivable) => {
    if (receivable.status === 'paid') {
      await alert.warning('No se puede eliminar una cuenta que ya está pagada');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar la cuenta por cobrar "${receivable.description || 'sin descripción'}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      const userId = user?.id || user?.userId || null;
      const userName = user?.firstName || user?.first_name || user?.nombre || user?.name || 'Usuario';
      const userEmail = user?.email || '';

      const descriptionText = receivable.description || 'sin descripción';
      const customerName = receivable.customer_name || 'Sin cliente';
      const invoiceNumber = receivable.invoice_number || '';
      const orderNumber = receivable.order_number || '';
      const amount = toNumber(receivable.amount).toFixed(2);
      
      let auditDescription = `Cuenta por cobrar eliminada: ${descriptionText}`;
      if (orderNumber) auditDescription += ` - Orden #${orderNumber}`;
      if (invoiceNumber && invoiceNumber !== orderNumber) auditDescription += ` - Factura #${invoiceNumber}`;
      auditDescription += ` - Cliente: ${customerName}`;

      const auditPayload = {
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        table_name: 'accounts_receivable',
        action: 'DELETE',
        record_id: null,
        old_values: {
          id: receivable.id,
          customer_id: receivable.customer_id,
          customer_name: receivable.customer_name,
          customer_cedula: receivable.customer_cedula,
          amount: receivable.amount,
          description: receivable.description,
          due_date: receivable.due_date,
          status: receivable.status,
          invoice_number: receivable.invoice_number,
          order_number: receivable.order_number,
          notes: receivable.notes
        },
        new_values: null,
        description: auditDescription
      };

      const auditResponse = await fetchWithAuth('/audit-log', {
        method: 'POST',
        body: JSON.stringify(auditPayload),
      });

      if (!auditResponse.ok) {
        const auditError = await auditResponse.json().catch(() => ({}));
        throw new Error(`Error al registrar auditoría: ${auditError.detail || auditError.error || 'Error desconocido'}`);
      }

      const res = await fetchWithAuth(`/accounting-receivable/receivables/${receivable.id}`, { 
        method: 'DELETE',
        body: JSON.stringify({
          user_id: userId,
          user_name: userName,
          user_email: userEmail
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      
      loadReceivables();
      
      await alert.success(
        `Cuenta por cobrar eliminada: ${descriptionText}`,
        'Cuenta Eliminada'
      );
    } catch (e) {
      setError(e.message);
      await alert.error(e.message);
    } finally {
      setSaving(false);
    }
  }, [user, showConfirm, alert, loadReceivables]);

  // ─── Navegación a POS para cobro ──────────────────────────────────────────
  const handleNavigateToPayment = useCallback((receivable) => {
    const orderNum = receivable.order_number || receivable.invoice_number;
    const cedula = receivable.customer_cedula || receivable.customer_document || '9999999999';
    const nombre = receivable.customer_name || 'CONSUMIDOR FINAL';
    const email = receivable.customer_email || '';
    const telefono = receivable.customer_phone || '';
    const direccion = receivable.customer_address || '';
    
    navigate('/app/pos/pos.sales', { 
      state: { 
        orderNumber: orderNum, 
        customerCedula: cedula,
        customerName: nombre,
        customerEmail: email,
        customerPhone: telefono,
        customerAddress: direccion,
        fromReceivable: true
      } 
    });
  }, [navigate]);

  // ─── Abrir modal de edición ──────────────────────────────────────────────
  const openEditReceivable = useCallback((receivable) => {
    if (receivable.status === 'paid') {
      alert.warning('No se puede editar una cuenta que ya está pagada');
      return;
    }
    setEditingReceivable(receivable);
    setError('');
    setShowEditModal(true);
  }, [alert]);

  // ─── Badge de estado ──────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pendiente', icon: <FiClock size={12} />, class: 'pending' },
      partial: { label: 'Pago parcial', icon: <FiAlertTriangle size={12} />, class: 'partial' },
      paid: { label: 'Pagado', icon: <FiCheckCircle size={12} />, class: 'paid' },
      overdue: { label: 'Vencido', icon: <FiAlertCircle size={12} />, class: 'overdue' }
    };
    const c = config[status] || config.pending;
    return (<span className={`status-badge status-${c.class}`}>{c.icon} {c.label}</span>);
  };

  // ─── Columnas de la tabla ──────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      accessor: 'customer_name',
      label: 'Cliente',
      render: (item) => (
        <div className="customer-cell">
          <strong>{item.customer_name}</strong>
          {item.customer_phone && <small>{item.customer_phone}</small>}
        </div>
      )
    },
    {
      accessor: 'description',
      label: 'Descripción',
      render: (item) => <span>{item.description}</span>
    },
    {
      accessor: 'invoice_number',
      label: 'N° Factura',
      render: (item) => <span>{item.invoice_number || '—'}</span>
    },
    {
      accessor: 'due_date',
      label: 'Fecha vencimiento',
      align: 'center',
      render: (item) => {
        const isOverdue = new Date(item.due_date) < new Date() && item.status !== 'paid';
        return <span className={isOverdue ? 'overdue-date' : ''}>{formatDate(item.due_date)}</span>;
      }
    },
    {
      accessor: 'status',
      label: 'Estado',
      align: 'center',
      render: (item) => getStatusBadge(item.status)
    },
    {
      accessor: 'amount',
      label: 'Monto total',
      align: 'right',
      render: (item) => <span>${toNumber(item.amount).toFixed(2)}</span>
    },
    {
      accessor: 'balance',
      label: 'Saldo pendiente',
      align: 'right',
      render: (item) => {
        const remaining = toNumber(item.balance !== undefined ? item.balance : item.amount);
        return <span className="pending-amount">${remaining.toFixed(2)}</span>;
      }
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => {
        const isPaid = item.status === 'paid';
        return (
          <div className="action-buttons" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            {!isPaid && (
              <IconTextButton
                variant="success"
                size="sm"
                inline={true}
                icon={<FiDollarSign size={14} />}
                onClick={() => handleNavigateToPayment(item)}
                title="Ir a cobrar"
              />
            )}
            <IconTextButton
              variant="info"
              size="sm"
              inline={true}
              icon={<FiEdit2 size={14} />}
              onClick={() => openEditReceivable(item)}
              title={isPaid ? "Cuenta pagada - No editable" : "Editar"}
              disabled={isPaid}
            />
            <IconTextButton
              variant="danger"
              size="sm"
              inline={true}
              icon={<FiTrash2 size={14} />}
              onClick={() => handleDeleteReceivable(item)}
              title={isPaid ? "Cuenta pagada - No se puede eliminar" : "Eliminar"}
              disabled={isPaid}
            />
          </div>
        );
      }
    }
  ], [handleDeleteReceivable, handleNavigateToPayment, openEditReceivable]);

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = useMemo(() => (
    <div className="products-toolbar-right">
      <div className="products-filter-actions">
        <CustomCombobox
          options={dateOptions}
          value={dateRange}
          onChange={handleDateRangeChange}
          placeholder="Todas las fechas"
          filterable={false}
          forceDropup={false}
          className="combobox-compact"
        />
        <CustomCombobox
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Todos los estados"
          filterable={false}
          forceDropup={false}
          className="combobox-compact"
        />
        <button onClick={handleClearFilters} className="report-btn-cancel-sm">
          <FiRefreshCw size={14} /> Limpiar
        </button>
      </div>
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiDownload size={14} />}
          onClick={handleExportXLSX}
          disabled={exporting || !filteredReceivables.length}
          loading={exporting}
        >
          Excel
        </IconTextButton>
        <ReportPdfButton customConfig={pdfConfig} />
      </ButtonGroup>
    </div>
  ), [search, statusFilter, filteredReceivables, exporting, pdfConfig, handleExportXLSX, dateRange, dateOptions, statusOptions, handleClearFilters, handleDateRangeChange]);

  // ─── Botón de refrescar ──────────────────────────────────────────────────
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

  // ─── Footer de la tabla ───────────────────────────────────────────────────
  const tableFooter = useMemo(() => {
    if (!filteredReceivables.length) return null;
    const totalMonto = filteredReceivables.reduce((sum, r) => sum + toNumber(r.amount), 0);
    const totalSaldo = filteredReceivables.reduce((sum, r) => sum + toNumber(r.balance !== undefined ? r.balance : r.amount), 0);
    
    return (
      <tr className="table-footer-totals">
        <td colSpan="5"><strong>TOTALES</strong></td>
        <td className="text-right"><strong>${totalMonto.toFixed(2)}</strong></td>
        <td className="text-right"><strong>${totalSaldo.toFixed(2)}</strong></td>
        <td></td>
      </tr>
    );
  }, [filteredReceivables]);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="CUENTAS POR COBRAR"
      subtitle="Gestión de créditos y cobranzas a clientes"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <div className="stat-cards-row">
        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
            <FiDollarSign size={24} color="var(--text-primary)" />
          </div>
          <div>
            <div className="stat-card-label">Total por cobrar</div>
            <div className="stat-card-value" style={{ color: 'var(--text-primary)' }}>${stats.total_receivable.toFixed(2)}</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
            <FiCheckCircle size={24} color="var(--text-primary)" />
          </div>
          <div>
            <div className="stat-card-label">Pagado</div>
            <div className="stat-card-value" style={{ color: 'var(--text-primary)' }}>${stats.total_paid.toFixed(2)}</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="stat-card-icon" style={{ background: 'var(--bg-primary)' }}>
            <FiClock size={24} color="var(--text-primary)" />
          </div>
          <div>
            <div className="stat-card-label">Pendiente</div>
            <div className="stat-card-value" style={{ color: 'var(--text-primary)' }}>${stats.total_pending.toFixed(2)}</div>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="stat-card-icon" style={{ background: 'var(--danger-bg)' }}>
            <FiAlertTriangle size={24} color="var(--text-primary)" />
          </div>
          <div>
            <div className="stat-card-label">Vencido</div>
            <div className="stat-card-value" style={{ color: 'var(--danger)' }}>${stats.total_overdue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <Table
        data={filteredReceivables}
        columns={columns}
        keyField="id"
        title="Cuentas por Cobrar"
        subtitle={`${filteredReceivables.length} ${filteredReceivables.length === 1 ? 'cuenta' : 'cuentas'}`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar por cliente, descripción o factura..."
        pagination={true}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 15]}
        onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
        loading={loading}
        emptyMessage={
          search || statusFilter !== 'all' || dateRange !== 'all' || customStartDate || customEndDate
            ? 'No hay cuentas que coincidan con los filtros aplicados'
            : 'No hay cuentas por cobrar registradas'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
        footer={tableFooter}
      />

      {/* Modales */}
      {showEditModal && (
        <ReceivableEditModal
          receivable={editingReceivable}
          customers={customers}
          onClose={() => { setShowEditModal(false); setEditingReceivable(null); }}
          onSave={handleSaveReceivable}
          saving={saving}
        />
      )}

      {showCustomDate && (
        <Modal
          isOpen={true}
          onClose={() => setShowCustomDate(false)}
          title="Seleccionar fechas"
          size="sm"
        >
          <DateRangePicker
            startDate={customStartDate}
            endDate={customEndDate}
            onApply={handleApplyCustomDate}
            onClose={() => setShowCustomDate(false)}
          />
        </Modal>
      )}
    </PageTemplate>
  );
}