import { useState, useEffect, useCallback } from 'react';
import ExcelJS from 'exceljs';
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import { 
  Search, DollarSign, Home, FileText, Calendar, RefreshCw, 
  TrendingUp, Download, Printer, ChevronLeft, ChevronRight,
  Eye, Clock, AlertCircle, CheckCircle, CreditCard, X, Plus,
  Truck, Zap, Server
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/AccountingPayablePage.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toNumber = (val) => Number(val) || 0;
const formatCurrency = (value) => `$${toNumber(value).toFixed(2)}`;
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-EC');
};

// ─── Modal de nueva cuenta por pagar ────────────────────────────────────────
function CreatePayableModal({ onClose, onSave, saving }) {
  const [form, setForm] = useState({
    supplier_name: '',
    invoice_number: '',
    amount: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    type: 'purchase',
    description: '',
    category: '',
    notes: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const canSave = form.supplier_name.trim() && form.amount > 0 && form.due_date;

  return (
    <div className="payable-modal-overlay" onClick={onClose}>
      <div className="payable-modal" onClick={e => e.stopPropagation()}>
        <div className="payable-modal-header">
          <div><h3>Nueva Cuenta por Pagar</h3><p>Registrar una nueva obligación con proveedor</p></div>
          <button className="btn-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="payable-modal-body">
          <div className="form-row">
            <div className="form-group"><label>Proveedor *</label><input type="text" value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} placeholder="Nombre del proveedor" /></div>
            <div className="form-group"><label>N° Factura</label><input type="text" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} placeholder="Número de factura" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Monto *</label><input type="number" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" /></div>
            <div className="form-group"><label>Tipo</label><select value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="purchase">Compra</option><option value="service">Servicio</option><option value="rent">Alquiler</option>
              <option value="tax">Impuesto</option><option value="utility">Servicio básico</option><option value="other">Otro</option>
            </select></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Fecha emisión</label><input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} /></div>
            <div className="form-group"><label>Fecha vencimiento *</label><input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Categoría</label><input type="text" value={form.category} onChange={e => set('category', e.target.value)} placeholder="Ej: Insumos, Servicios, etc." /></div>
          <div className="form-group"><label>Descripción</label><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Descripción de la obligación" /></div>
          <div className="form-group"><label>Notas</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Notas adicionales" /></div>
        </div>
        <div className="payable-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={saving || !canSave}>{saving ? 'Guardando...' : 'Crear Cuenta'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de registro de pago ─────────────────────────────────────────────
function PaymentModal({ payable, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    payment_method: 'cash',
    amount: payable?.balance || 0,
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0]
  });
  const canSave = form.amount > 0 && form.amount <= (payable?.balance || 0);
  return (
    <div className="payable-modal-overlay" onClick={onClose}>
      <div className="payable-modal payment-modal" onClick={e => e.stopPropagation()}>
        <div className="payable-modal-header">
          <div><h3>Registrar Pago</h3><p>Factura #{payable?.invoice_number || 'N/A'} - {payable?.supplier_name}</p></div>
          <button className="btn-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="payable-modal-body">
          <div className="payment-info"><div className="info-row"><span>Saldo pendiente:</span><strong className="amount">{formatCurrency(payable?.balance || 0)}</strong></div></div>
          <div className="form-group"><label>Método de pago</label><select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
            <option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="check">Cheque</option>
          </select></div>
          <div className="form-group"><label>Monto a pagar</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
          <div className="form-group"><label>Fecha de pago</label><input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} /></div>
          {form.payment_method !== 'cash' && (<div className="form-group"><label>Número de referencia</label><input type="text" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="Número de transacción" /></div>)}
        </div>
        <div className="payable-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={saving || !canSave}>{saving ? 'Procesando...' : 'Registrar Pago'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de detalle ──────────────────────────────────────────────────────
function DetailModal({ payable, onClose }) {
  const typeIcons = { purchase: <Truck size={14} />, service: <Server size={14} />, rent: <Home size={14} />, tax: <AlertCircle size={14} />, utility: <Zap size={14} />, other: <FileText size={14} /> };
  const typeLabels = { purchase: 'Compra', service: 'Servicio', rent: 'Alquiler', tax: 'Impuesto', utility: 'Servicio básico', other: 'Otro' };
  return (
    <div className="payable-modal-overlay" onClick={onClose}>
      <div className="payable-modal detail-modal" onClick={e => e.stopPropagation()}>
        <div className="payable-modal-header">
          <div><h3>Detalle de Cuenta por Pagar</h3><p>{typeIcons[payable?.type]} {typeLabels[payable?.type] || payable?.type}</p></div>
          <button className="btn-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="payable-modal-body">
          <div className="detail-grid">
            <div className="detail-item"><label>Proveedor</label><span>{payable?.supplier_name}</span></div>
            <div className="detail-item"><label>N° Factura</label><span>{payable?.invoice_number || '-'}</span></div>
            <div className="detail-item"><label>Fecha emisión</label><span>{formatDate(payable?.issue_date)}</span></div>
            <div className="detail-item"><label>Fecha vencimiento</label><span className={payable?.days_overdue > 0 ? 'overdue-text' : ''}>{formatDate(payable?.due_date)}{payable?.days_overdue > 0 && ` (${payable.days_overdue} días vencido)`}</span></div>
            <div className="detail-item"><label>Monto total</label><span className="amount-detail">{formatCurrency(payable?.amount)}</span></div>
            <div className="detail-item"><label>Pagado</label><span className="paid-text">{formatCurrency(payable?.paid_amount)}</span></div>
            <div className="detail-item"><label>Saldo pendiente</label><span className="balance-text">{formatCurrency(payable?.balance)}</span></div>
            <div className="detail-item"><label>Estado</label><span className={`status-badge status-${payable?.payable_status || payable?.status}`}>{payable?.status === 'paid' ? 'Pagada' : (payable?.payable_status === 'overdue' ? 'Vencida' : 'Pendiente')}</span></div>
          </div>
          {payable?.description && <div className="detail-section"><label>Descripción</label><p>{payable.description}</p></div>}
          {payable?.notes && <div className="detail-section"><label>Notas</label><p>{payable.notes}</p></div>}
          {payable?.payments && payable.payments.length > 0 && (
            <div className="detail-section"><label>Historial de pagos</label><div className="payments-list">{payable.payments.map(p => (<div key={p.id} className="payment-item"><div className="payment-date">{formatDate(p.payment_date)}</div><div className="payment-amount">{formatCurrency(p.amount)}</div><div className="payment-method">{p.payment_method}</div>{p.reference_number && <div className="payment-ref">{p.reference_number}</div>}</div>))}</div></div>
          )}
        </div>
        <div className="payable-modal-footer"><button className="btn-secondary" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function AccountingPayablePage() {
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'info') => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3500); };

  // ─── Cargar cuentas por pagar (rutas corregidas) ─────────────────────────
  const loadPayables = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // 🔥 Ruta corregida: ahora usa /api/accounting-payable (coincide con backend)
      let url = `/api/accounting-payable?page=${currentPage}&limit=15&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (typeFilter !== 'all') url += `&type=${typeFilter}`;
      const response = await fetchWithAuth(url);
      const data = await response.json();
      if (data.success) {
        setPayables(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setSummary(data.summary);
      } else if (Array.isArray(data)) {
        setPayables(data);
        setSummary(null);
      } else {
        setPayables([]);
        setSummary(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
      showNotification('Error al cargar cuentas por pagar', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, statusFilter, typeFilter, search]);

  useEffect(() => { loadPayables(); }, [loadPayables]);

  const handleRefresh = () => { setRefreshing(true); loadPayables(); showNotification('Actualizando cuentas...', 'info'); };
  const handleResetFilters = () => { setStatusFilter('pending'); setTypeFilter('all'); setSearch(''); setCurrentPage(1); showNotification('Filtros restablecidos', 'success'); };

  const handleCreatePayable = async (form) => {
    setSaving(true);
    try {
      // 🔥 Ruta corregida
      const res = await fetchWithAuth('/api/accounting-payable', { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { showNotification('Cuenta creada exitosamente', 'success'); setShowCreateModal(false); loadPayables(); }
      else throw new Error(data.error);
    } catch (err) { showNotification(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const handleRegisterPayment = async (paymentData) => {
    setSaving(true);
    try {
      // 🔥 Ruta corregida
      const res = await fetchWithAuth(`/api/accounting-payable/${selectedPayable.id}/register-payment`, { method: 'POST', body: JSON.stringify(paymentData) });
      const data = await res.json();
      if (data.success) { showNotification('Pago registrado exitosamente', 'success'); setShowPaymentModal(false); setSelectedPayable(null); loadPayables(); }
      else throw new Error(data.error);
    } catch (err) { showNotification(err.message, 'error'); }
    finally { setSaving(false); }
  };

  // ─── Exportación a Excel (estilos profesionales) ──────────────────────────
  const handleExportXLSX = async () => {
    if (!payables.length) { showNotification('No hay datos para exportar', 'warning'); return; }
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Contabilidad';
      wb.created = new Date();

      const COLORS = {
        headerBg:   '1E2840', sectionBg:  '2563EB', colHeaderBg:'DBEAFE',
        totalsBg:   '1E40AF', rowAlt:     'F0F7FF', white: 'FFFFFF', black: '000000'
      };
      const border = { top: { style: 'thin', color: { argb: 'D1D5DB' } }, bottom: { style: 'thin', color: { argb: 'D1D5DB' } }, left: { style: 'thin', color: { argb: 'D1D5DB' } }, right: { style: 'thin', color: { argb: 'D1D5DB' } } };
      const applyStyle = (cell, style) => { cell.style = style; };
      const styleHeader = (cell, text) => {
        cell.value = text;
        applyStyle(cell, { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } }, font: { bold: true, size: 14, color: { argb: COLORS.white }, name: 'Calibri' }, alignment: { vertical: 'middle', horizontal: 'center' } });
      };
      const styleSection = (cell, text) => {
        cell.value = text;
        applyStyle(cell, { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } }, font: { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Calibri' }, alignment: { vertical: 'middle', horizontal: 'left' }, border });
      };
      const styleColHeader = (cell, text) => {
        cell.value = text;
        applyStyle(cell, { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.colHeaderBg } }, font: { bold: true, size: 9, color: { argb: '1E3A5F' }, name: 'Calibri' }, alignment: { vertical: 'middle', horizontal: 'center' }, border });
      };
      const styleData = (cell, value, align = 'left', altRow = false, numFmt = null) => {
        cell.value = value;
        const style = {
          fill: altRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowAlt } } : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } },
          font: { size: 9, name: 'Calibri', color: { argb: COLORS.black } },
          alignment: { vertical: 'middle', horizontal: align }, border
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
          border: { top: { style: 'medium', color: { argb: COLORS.white } }, bottom: { style: 'medium', color: { argb: COLORS.white } }, left: { style: 'thin', color: { argb: '3B82F6' } }, right: { style: 'thin', color: { argb: '3B82F6' } } }
        };
        if (numFmt) style.numFmt = numFmt;
        applyStyle(cell, style);
      };

      const ws = wb.addWorksheet('Cuentas por Pagar', { views: [{ showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'landscape' } });
      ws.columns = [
        { key: 'proveedor', width: 30 }, { key: 'factura', width: 18 }, { key: 'fecha', width: 14 },
        { key: 'vencimiento', width: 14 }, { key: 'monto', width: 15 }, { key: 'pagado', width: 15 },
        { key: 'saldo', width: 15 }, { key: 'estado', width: 12 }
      ];
      ws.mergeCells('A1:H1'); styleHeader(ws.getCell('A1'), 'CUENTAS POR PAGAR'); ws.getRow(1).height = 28;
      ws.getRow(2).height = 6;
      ws.mergeCells('A3:H3'); styleSection(ws.getCell('A3'), '  LISTADO DE OBLIGACIONES CON PROVEEDORES'); ws.getRow(3).height = 18;

      const headers = ['Proveedor', 'N° Factura', 'Fecha Emisión', 'Vencimiento', 'Monto Total', 'Pagado', 'Saldo Pendiente', 'Estado'];
      headers.forEach((h, i) => styleColHeader(ws.getCell(4, i + 1), h));
      ws.getRow(4).height = 16;

      let sumMonto = 0, sumPagado = 0, sumSaldo = 0;
      payables.forEach((p, idx) => {
        const alt = idx % 2 === 1;
        const monto = toNumber(p.amount);
        const pagado = toNumber(p.paid_amount);
        const saldo = toNumber(p.balance);
        sumMonto += monto; sumPagado += pagado; sumSaldo += saldo;
        const rowNum = 5 + idx;
        ws.getRow(rowNum).height = 15;
        styleData(ws.getCell(rowNum, 1), p.supplier_name || '-', 'left', alt);
        styleData(ws.getCell(rowNum, 2), p.invoice_number || '-', 'center', alt);
        styleData(ws.getCell(rowNum, 3), formatDate(p.issue_date), 'center', alt);
        styleData(ws.getCell(rowNum, 4), formatDate(p.due_date), 'center', alt);
        styleData(ws.getCell(rowNum, 5), monto, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(rowNum, 6), pagado, 'right', alt, '"$"#,##0.00');
        styleData(ws.getCell(rowNum, 7), saldo, 'right', alt, '"$"#,##0.00');
        const estado = p.status === 'paid' ? 'Pagada' : (p.payable_status === 'overdue' ? 'Vencida' : 'Pendiente');
        styleData(ws.getCell(rowNum, 8), estado, 'center', alt);
      });
      const lastRow = 5 + payables.length;
      ws.getRow(lastRow).height = 18;
      styleTotals(ws.getCell(lastRow, 1), 'TOTALES', 'left');
      [2,3,4].forEach(c => styleTotals(ws.getCell(lastRow, c), ''));
      styleTotals(ws.getCell(lastRow, 5), sumMonto, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(lastRow, 6), sumPagado, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(lastRow, 7), sumSaldo, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(lastRow, 8), '');

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cuentas_por_pagar_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Exportado a Excel', 'success');
    } catch (err) {
      console.error(err);
      setError('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  };

  // ─── Configuración para PDF (KPIs y tabla) ────────────────────────────────
  const pdfConfig = payables.length ? {
    title: 'Cuentas por Pagar',
    kpis: [
      { label: 'Por Pagar', value: summary?.total_pending || 0, formatter: (v) => formatCurrency(v) },
      { label: 'Vencidas', value: summary?.total_overdue || 0, formatter: (v) => formatCurrency(v), bold: true },
      { label: 'Pagadas', value: summary?.total_paid || 0, formatter: (v) => formatCurrency(v) }
    ],
    sections: [{
      title: 'Listado de Obligaciones',
      columns: [
        { label: 'Proveedor', key: 'proveedor', width: 30 },
        { label: 'N° Factura', key: 'factura', width: 16 },
        { label: 'Monto Total', key: 'monto', width: 15, formatter: (v) => formatCurrency(v) },
        { label: 'Pagado', key: 'pagado', width: 15, formatter: (v) => formatCurrency(v) },
        { label: 'Saldo', key: 'saldo', width: 15, formatter: (v) => formatCurrency(v) },
        { label: 'Vencimiento', key: 'vencimiento', width: 14 },
        { label: 'Estado', key: 'estado', width: 12 }
      ],
      rows: payables.map(p => ({
        proveedor: p.supplier_name || '-',
        factura: p.invoice_number || '-',
        monto: toNumber(p.amount),
        pagado: toNumber(p.paid_amount),
        saldo: toNumber(p.balance),
        vencimiento: formatDate(p.due_date),
        estado: p.status === 'paid' ? 'Pagada' : (p.payable_status === 'overdue' ? 'Vencida' : 'Pendiente')
      }))
    }]
  } : null;

  // ─── UI (estadísticas, filtros, tabla) ───────────────────────────────────
  const stats = [
    { label: 'Por Pagar', value: formatCurrency(summary?.total_pending || 0), icon: <Clock size={20} />, color: '#f59e0b', subtext: `${summary?.pending_count || 0} facturas` },
    { label: 'Vencidas', value: formatCurrency(summary?.total_overdue || 0), icon: <AlertCircle size={20} />, color: '#ef4444', subtext: `${summary?.overdue_count || 0} facturas` },
    { label: 'Pagadas', value: formatCurrency(summary?.total_paid || 0), icon: <CheckCircle size={20} />, color: '#10b981', subtext: `${summary?.paid_count || 0} facturas` },
  ];

  const headerAction = (
    <div className="payable-header-actions">
      <button className="btn-create" onClick={() => setShowCreateModal(true)}><Plus size={16} /> Nueva Cuenta</button>
      <button className="btn-export" onClick={handleExportXLSX} disabled={exporting || !payables.length}>{exporting ? 'Exportando...' : 'Excel'}</button>
      <ReportPdfButton customConfig={pdfConfig} className="btn-export" />
      <button className="btn-refresh" onClick={handleRefresh} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Actualizar</button>
    </div>
  );

  return (
    <PageTemplate title="Cuentas por Pagar" subtitle="Gestión de obligaciones con proveedores" loading={loading} error={error} onRetry={loadPayables} headerAction={headerAction}>
      {notification && <div className={`payable-notification ${notification.type}`}>{notification.msg}</div>}
      <div className="payable-stats-grid">{stats.map(stat => (<div key={stat.label} className="payable-stat-card"><div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>{stat.icon}</div><div className="stat-info"><span className="stat-value">{stat.value}</span><span className="stat-label">{stat.label}</span><span className="stat-sub">{stat.subtext}</span></div></div>))}</div>
      <div className="payable-filters">
        <div className="filter-search"><Search size={16} /><input type="text" placeholder="Buscar por proveedor o #factura..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="filter-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="pending">Pendientes</option><option value="overdue">Vencidas</option><option value="paid">Pagadas</option><option value="all">Todas</option></select>
        <select className="filter-type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="all">Todos los tipos</option><option value="purchase">Compras</option><option value="service">Servicios</option><option value="rent">Alquiler</option><option value="tax">Impuestos</option><option value="utility">Servicios básicos</option><option value="other">Otros</option></select>
        <button className="btn-reset" onClick={handleResetFilters}>Limpiar filtros</button>
      </div>
      <div className="payable-table-container">
        <table className="payable-table">
          <thead><tr><th>Fecha</th><th>Proveedor</th><th>N° Factura</th><th className="center">Monto</th><th className="center">Pagado</th><th className="center">Saldo</th><th className="center">Vencimiento</th><th className="center">Estado</th><th className="center">Acciones</th></tr></thead>
          <tbody>
            {payables.length === 0 && !loading && (
              <tr><td colSpan={9} className="empty-state"><FileText size={32} /><p>No hay cuentas por pagar</p><span>Haz clic en "Nueva Cuenta" para registrar una obligación</span></td></tr>
            )}
            {payables.map(payable => (
              <tr key={payable.id} className={payable.payable_status === 'overdue' ? 'overdue-row' : ''}>
                <td>{formatDate(payable.issue_date)}</td>
                <td className="supplier-cell"><Home size={12} />{payable.supplier_name}</td>
                <td className="invoice-number">{payable.invoice_number || '-'}</td>
                <td className="center amount">{formatCurrency(payable.amount)}</td>
                <td className="center paid">{formatCurrency(payable.paid_amount)}</td>
                <td className="center balance">{formatCurrency(payable.balance)}</td>
                <td className="center"><span className={payable.days_overdue > 0 ? 'date-overdue' : 'date-normal'}>{formatDate(payable.due_date)}</span></td>
                <td className="center"><span className={`status-badge status-${payable.payable_status === 'overdue' ? 'overdue' : payable.status}`}>{payable.status === 'paid' ? 'Pagada' : (payable.payable_status === 'overdue' ? 'Vencida' : 'Pendiente')}</span></td>
                <td className="center"><div className="action-buttons"><button className="btn-view" onClick={() => { setSelectedPayable(payable); setShowDetailModal(true); }} title="Ver detalle"><Eye size={14} /></button>{payable.status !== 'paid' && <button className="btn-pay" onClick={() => { setSelectedPayable(payable); setShowPaymentModal(true); }} title="Registrar pago"><CreditCard size={14} /></button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && <div className="payable-pagination"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={14} /> Anterior</button><span>Página {currentPage} de {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente <ChevronRight size={14} /></button></div>}
        {payables.length > 0 && <div className="payable-table-info">Mostrando {payables.length} cuentas</div>}
      </div>
      {showCreateModal && <CreatePayableModal onClose={() => setShowCreateModal(false)} onSave={handleCreatePayable} saving={saving} />}
      {showPaymentModal && selectedPayable && <PaymentModal payable={selectedPayable} onClose={() => { setShowPaymentModal(false); setSelectedPayable(null); }} onSave={handleRegisterPayment} saving={saving} />}
      {showDetailModal && selectedPayable && <DetailModal payable={selectedPayable} onClose={() => { setShowDetailModal(false); setSelectedPayable(null); }} />}
    </PageTemplate>
  );
}