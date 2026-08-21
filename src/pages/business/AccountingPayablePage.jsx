import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from '../../context/SessionContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import ExcelJS from 'exceljs';
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import SearchInput from '../../components/General/SearchInput';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { fetchWithAuth } from '../../config/api';
import {
  Home, FileText, RefreshCw,
  Download,
  Eye, Clock, AlertCircle, CheckCircle, CreditCard, X, Plus,
  Truck, Zap, Server
} from 'react-feather';

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
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const canSave = form.supplier_name.trim() && form.amount > 0 && form.due_date;

  const typeOptions = [
    { value: 'purchase', label: 'Compra' },
    { value: 'service', label: 'Servicio' },
    { value: 'rent', label: 'Alquiler' },
    { value: 'tax', label: 'Impuesto' },
    { value: 'utility', label: 'Servicio básico' },
    { value: 'other', label: 'Otro' }
  ];

  const handleSubmit = () => {
    if (!canSave) {
      setError('Complete los campos requeridos');
      return;
    }
    setError('');
    onSave(form);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Nueva Cuenta por Pagar"
      subtitle="Registrar una nueva obligación con proveedor"
      size="lg"
      footer={
        <ButtonGroup>
          <IconTextButton 
            variant="secondary" 
            size="md" 
            onClick={onClose} 
            disabled={saving}
          >
            Cancelar
          </IconTextButton>
          <IconTextButton 
            variant="primary" 
            size="md" 
            onClick={handleSubmit} 
            disabled={saving || !canSave}
            loading={saving}
          >
            {saving ? 'Guardando...' : 'Crear Cuenta'}
          </IconTextButton>
        </ButtonGroup>
      }
    >
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Proveedor *</label>
          <input 
            type="text" 
            value={form.supplier_name} 
            onChange={e => set('supplier_name', e.target.value)} 
            placeholder="Nombre del proveedor" 
          />
        </div>
        <div className="form-group">
          <label>N° Factura</label>
          <input 
            type="text" 
            value={form.invoice_number} 
            onChange={e => set('invoice_number', e.target.value)} 
            placeholder="Número de factura" 
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Monto *</label>
          <input 
            type="number" 
            step="0.01" 
            value={form.amount} 
            onChange={e => set('amount', e.target.value)} 
            placeholder="0.00" 
          />
        </div>
        <div className="form-group">
          <label>Tipo</label>
          <CustomCombobox
            options={typeOptions}
            value={form.type}
            onChange={value => set('type', value)}
            placeholder="Seleccionar tipo"
            filterable={false}
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Fecha emisión</label>
          <input 
            type="date" 
            value={form.issue_date} 
            onChange={e => set('issue_date', e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Fecha vencimiento *</label>
          <input 
            type="date" 
            value={form.due_date} 
            onChange={e => set('due_date', e.target.value)} 
          />
        </div>
      </div>
      
      <div className="form-group">
        <label>Categoría</label>
        <input 
          type="text" 
          value={form.category} 
          onChange={e => set('category', e.target.value)} 
          placeholder="Ej: Insumos, Servicios, etc." 
        />
      </div>
      
      <div className="form-group">
        <label>Descripción</label>
        <textarea 
          value={form.description} 
          onChange={e => set('description', e.target.value)} 
          rows={2} 
          placeholder="Descripción de la obligación" 
        />
      </div>
      
      <div className="form-group">
        <label>Notas</label>
        <textarea 
          value={form.notes} 
          onChange={e => set('notes', e.target.value)} 
          rows={2} 
          placeholder="Notas adicionales" 
        />
      </div>
    </Modal>
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
  const [error, setError] = useState('');
  const canSave = form.amount > 0 && form.amount <= (payable?.balance || 0);

  const paymentMethodOptions = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'check', label: 'Cheque' }
  ];

  const handleSubmit = () => {
    if (!canSave) {
      setError(`El monto no puede superar el saldo pendiente: ${formatCurrency(payable?.balance || 0)}`);
      return;
    }
    setError('');
    onSave(form);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Registrar Pago"
      subtitle={`Factura #${payable?.invoice_number || 'N/A'} - ${payable?.supplier_name}`}
      size="md"
      footer={
        <ButtonGroup>
          <IconTextButton 
            variant="secondary" 
            size="md" 
            onClick={onClose} 
            disabled={saving}
          >
            Cancelar
          </IconTextButton>
          <IconTextButton 
            variant="primary" 
            size="md" 
            onClick={handleSubmit} 
            disabled={saving || !canSave}
            loading={saving}
          >
            {saving ? 'Procesando...' : 'Registrar Pago'}
          </IconTextButton>
        </ButtonGroup>
      }
    >
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="payment-info" style={{ marginBottom: '16px' }}>
        <div className="info-row">
          <span>Saldo pendiente:</span>
          <strong className="amount">{formatCurrency(payable?.balance || 0)}</strong>
        </div>
      </div>

      <div className="form-group">
        <label>Método de pago</label>
        <CustomCombobox
          options={paymentMethodOptions}
          value={form.payment_method}
          onChange={value => setForm({ ...form, payment_method: value })}
          placeholder="Seleccionar método"
          filterable={false}
        />
      </div>

      <div className="form-group">
        <label>Monto a pagar</label>
        <input 
          type="number" 
          step="0.01" 
          value={form.amount} 
          onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} 
          placeholder="0.00" 
        />
      </div>

      <div className="form-group">
        <label>Fecha de pago</label>
        <input 
          type="date" 
          value={form.payment_date} 
          onChange={e => setForm({ ...form, payment_date: e.target.value })} 
        />
      </div>

      {form.payment_method !== 'cash' && (
        <div className="form-group">
          <label>Número de referencia</label>
          <input 
            type="text" 
            value={form.reference_number} 
            onChange={e => setForm({ ...form, reference_number: e.target.value })} 
            placeholder="Número de transacción" 
          />
        </div>
      )}
    </Modal>
  );
}

// ─── Modal de detalle ──────────────────────────────────────────────────────
function DetailModal({ payable, onClose }) {
  const typeIcons = { 
    purchase: <Truck size={14} />, 
    service: <Server size={14} />, 
    rent: <Home size={14} />, 
    tax: <AlertCircle size={14} />, 
    utility: <Zap size={14} />, 
    other: <FileText size={14} /> 
  };
  const typeLabels = { 
    purchase: 'Compra', 
    service: 'Servicio', 
    rent: 'Alquiler', 
    tax: 'Impuesto', 
    utility: 'Servicio básico', 
    other: 'Otro' 
  };
  
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Detalle de Cuenta por Pagar"
      subtitle={`${typeIcons[payable?.type]} ${typeLabels[payable?.type] || payable?.type}`}
      size="md"
      footer={
        <ButtonGroup>
          <IconTextButton 
            variant="secondary" 
            size="md" 
            onClick={onClose}
          >
            Cerrar
          </IconTextButton>
        </ButtonGroup>
      }
    >
      <div className="detail-grid">
        <div className="detail-item">
          <label>Proveedor</label>
          <span>{payable?.supplier_name}</span>
        </div>
        <div className="detail-item">
          <label>N° Factura</label>
          <span>{payable?.invoice_number || '-'}</span>
        </div>
        <div className="detail-item">
          <label>Fecha emisión</label>
          <span>{formatDate(payable?.issue_date)}</span>
        </div>
        <div className="detail-item">
          <label>Fecha vencimiento</label>
          <span className={payable?.days_overdue > 0 ? 'overdue-text' : ''}>
            {formatDate(payable?.due_date)}
            {payable?.days_overdue > 0 && ` (${payable.days_overdue} días vencido)`}
          </span>
        </div>
        <div className="detail-item">
          <label>Monto total</label>
          <span className="amount-detail">{formatCurrency(payable?.amount)}</span>
        </div>
        <div className="detail-item">
          <label>Pagado</label>
          <span className="paid-text">{formatCurrency(payable?.paid_amount)}</span>
        </div>
        <div className="detail-item">
          <label>Saldo pendiente</label>
          <span className="balance-text">{formatCurrency(payable?.balance)}</span>
        </div>
        <div className="detail-item">
          <label>Estado</label>
          <span className={`status-badge status-${payable?.payable_status || payable?.status}`}>
            {payable?.status === 'paid' ? 'Pagada' : (payable?.payable_status === 'overdue' ? 'Vencida' : 'Pendiente')}
          </span>
        </div>
      </div>
      
      {payable?.description && (
        <div className="detail-section">
          <label>Descripción</label>
          <p>{payable.description}</p>
        </div>
      )}
      
      {payable?.notes && (
        <div className="detail-section">
          <label>Notas</label>
          <p>{payable.notes}</p>
        </div>
      )}
      
      {payable?.payments && payable.payments.length > 0 && (
        <div className="detail-section">
          <label>Historial de pagos</label>
          <div className="payments-list">
            {payable.payments.map(p => (
              <div key={p.id} className="payment-item">
                <div className="payment-date">{formatDate(p.payment_date)}</div>
                <div className="payment-amount">{formatCurrency(p.amount)}</div>
                <div className="payment-method">{p.payment_method}</div>
                {p.reference_number && <div className="payment-ref">{p.reference_number}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function AccountingPayablePage() {
  const { user } = useSession();
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

  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [summary, setSummary] = useState(null);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [error, setError] = useState('');

  // ─── Cargar cuentas por pagar ─────────────────────────────────────────────
  const loadPayables = useCallback(async () => {
    if (!businessId) {
      setPayables([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      let url = `/accounting-payable/payable?page=${currentPage}&limit=15&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (typeFilter !== 'all') url += `&type=${typeFilter}`;
      // ✅ Asegurar que businessId se envía
      url += `&businessId=${businessId}`;
      
      const response = await fetchWithAuth(url);
      const data = await response.json();
      
      if (data.success) {
        setPayables(data.data || []);
        setSummary(data.summary);
      } else if (Array.isArray(data)) {
        setPayables(data);
        setSummary(null);
      } else {
        setPayables([]);
        setSummary(null);
      }
    } catch (err) {
      setError(err.message);
      await alert.error('Error al cargar cuentas por pagar');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, currentPage, statusFilter, typeFilter, search]);

  // ─── useEffect con carga inicial ──────────────────────────────────────────
  useEffect(() => {
    if (businessId) {
      loadPayables();
    } else {
      setLoading(false);
    }
  }, [businessId, loadPayables]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => { 
    setRefreshing(true); 
    await loadPayables(); 
    await alert.success('Datos actualizados');
  }, [loadPayables, alert]);
  
  const handleResetFilters = useCallback(async () => { 
    setStatusFilter('pending'); 
    setTypeFilter('all'); 
    setSearch(''); 
    setCurrentPage(1); 
    await alert.success('Filtros restablecidos');
    loadPayables();
  }, [alert, loadPayables]);

  const handleCreatePayable = async (form) => {
    setSaving(true);
    try {
      const res = await fetchWithAuth('/accounting-payable/payable', { 
        method: 'POST', 
        body: JSON.stringify({ ...form, businessId }) 
      });
      const data = await res.json();
      if (data.success) {
        await alert.success('Cuenta creada exitosamente');
        setShowCreateModal(false);
        loadPayables();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      await alert.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterPayment = async (paymentData) => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/accounting-payable/payable/${selectedPayable.id}/register-payment`, { 
        method: 'POST', 
        body: JSON.stringify({ ...paymentData, businessId }) 
      });
      const data = await res.json();
      if (data.success) {
        await alert.success('Pago registrado exitosamente');
        setShowPaymentModal(false);
        setSelectedPayable(null);
        loadPayables();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      await alert.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayable = async (payable) => {
    if (payable.status === 'paid') {
      await alert.warning('No se puede eliminar una cuenta que ya está pagada');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar la cuenta por pagar "${payable.supplier_name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });

    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetchWithAuth(`/accounting-payable/payable/${payable.id}?businessId=${businessId}`, { 
        method: 'DELETE' 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      
      await alert.success('Cuenta eliminada correctamente');
      loadPayables();
    } catch (err) {
      await alert.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Exportación a Excel ──────────────────────────────────────────────────
  const handleExportXLSX = useCallback(async () => {
    if (!payables.length) { 
      await alert.warning('No hay datos para exportar'); 
      return; 
    }
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Contabilidad';
      wb.created = new Date();

      const COLORS = {
        headerBg: '1E2840',
        sectionBg: '2563EB',
        colHeaderBg: 'DBEAFE',
        totalsBg: '1E40AF',
        rowAlt: 'F0F7FF',
        white: 'FFFFFF',
        black: '000000'
      };
      
      const border = {
        top: { style: 'thin', color: { argb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
        left: { style: 'thin', color: { argb: 'D1D5DB' } },
        right: { style: 'thin', color: { argb: 'D1D5DB' } }
      };
      
      const applyStyle = (cell, style) => { cell.style = style; };
      
      const styleHeader = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } },
          font: { bold: true, size: 14, color: { argb: COLORS.white }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: 'center' }
        });
      };
      
      const styleSection = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } },
          font: { bold: true, size: 10, color: { argb: COLORS.white }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: 'left' },
          border
        });
      };
      
      const styleColHeader = (cell, text) => {
        cell.value = text;
        applyStyle(cell, {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.colHeaderBg } },
          font: { bold: true, size: 9, color: { argb: '1E3A5F' }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border
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
          border
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
            top: { style: 'medium', color: { argb: COLORS.white } },
            bottom: { style: 'medium', color: { argb: COLORS.white } },
            left: { style: 'thin', color: { argb: '3B82F6' } },
            right: { style: 'thin', color: { argb: '3B82F6' } }
          }
        };
        if (numFmt) style.numFmt = numFmt;
        applyStyle(cell, style);
      };

      const ws = wb.addWorksheet('Cuentas por Pagar', { 
        views: [{ showGridLines: false }], 
        pageSetup: { paperSize: 9, orientation: 'landscape' } 
      });
      
      ws.columns = [
        { key: 'proveedor', width: 30 },
        { key: 'factura', width: 18 },
        { key: 'fecha', width: 14 },
        { key: 'vencimiento', width: 14 },
        { key: 'monto', width: 15 },
        { key: 'pagado', width: 15 },
        { key: 'saldo', width: 15 },
        { key: 'estado', width: 12 }
      ];
      
      ws.mergeCells('A1:H1');
      styleHeader(ws.getCell('A1'), 'CUENTAS POR PAGAR');
      ws.getRow(1).height = 28;
      
      ws.getRow(2).height = 6;
      ws.mergeCells('A3:H3');
      styleSection(ws.getCell('A3'), '  LISTADO DE OBLIGACIONES CON PROVEEDORES');
      ws.getRow(3).height = 18;

      const headers = ['Proveedor', 'N° Factura', 'Fecha Emisión', 'Vencimiento', 'Monto Total', 'Pagado', 'Saldo Pendiente', 'Estado'];
      headers.forEach((h, i) => styleColHeader(ws.getCell(4, i + 1), h));
      ws.getRow(4).height = 16;

      let sumMonto = 0, sumPagado = 0, sumSaldo = 0;
      
      payables.forEach((p, idx) => {
        const alt = idx % 2 === 1;
        const monto = toNumber(p.amount);
        const pagado = toNumber(p.paid_amount);
        const saldo = toNumber(p.balance);
        sumMonto += monto;
        sumPagado += pagado;
        sumSaldo += saldo;
        
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
      [2, 3, 4].forEach(c => styleTotals(ws.getCell(lastRow, c), ''));
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
      await alert.success('Exportado a Excel');
    } catch (err) {
      setError('Error al exportar a Excel');
      await alert.error('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  }, [payables, alert]);

  // ─── Configuración para PDF ────────────────────────────────────────────────
  const pdfConfig = useMemo(() => {
    if (!payables.length) return null;
    return {
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
    };
  }, [payables, summary]);

  // ─── Columnas de la tabla ──────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      accessor: 'issue_date',
      label: 'F. Registro',
      render: (item) => <span>{formatDate(item.issue_date)}</span>
    },
    {
      accessor: 'supplier_name',
      label: 'Proveedor',
      render: (item) => (
        <span className="supplier-cell">
          {item.supplier_name}
        </span>
      )
    },
    {
      accessor: 'invoice_number',
      label: 'N° Factura',
      render: (item) => <span className="invoice-number">{item.invoice_number || '-'}</span>
    },
    {
      accessor: 'amount',
      label: 'Monto',
      align: 'right',
      render: (item) => <span className="amount">{formatCurrency(item.amount)}</span>
    },
    {
      accessor: 'paid_amount',
      label: 'Pagado',
      align: 'right',
      render: (item) => <span className="paid">{formatCurrency(item.paid_amount)}</span>
    },
    {
      accessor: 'balance',
      label: 'Saldo',
      align: 'right',
      render: (item) => <span className="balance">{formatCurrency(item.balance)}</span>
    },
    {
      accessor: 'due_date',
      label: 'Vencimiento',
      align: 'center',
      render: (item) => (
        <span className={item.days_overdue > 0 ? 'date-overdue' : 'date-normal'}>
          {formatDate(item.due_date)}
        </span>
      )
    },
    {
      accessor: 'status',
      label: 'Estado',
      align: 'center',
      render: (item) => {
        const status = item.status === 'paid' ? 'paid' : (item.payable_status === 'overdue' ? 'overdue' : 'pending');
        const label = item.status === 'paid' ? 'Pagada' : (item.payable_status === 'overdue' ? 'Vencida' : 'Pendiente');
        return <span className={`status-badge status-${status}`}>{label}</span>;
      }
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="info"
            size="sm"
            inline={true}
            icon={<Eye size={14} />}
            onClick={() => { setSelectedPayable(item); setShowDetailModal(true); }}
            title="Ver detalle"
          />
          {item.status !== 'paid' && (
            <IconTextButton
              variant="success"
              size="sm"
              inline={true}
              icon={<CreditCard size={14} />}
              onClick={() => { setSelectedPayable(item); setShowPaymentModal(true); }}
              title="Registrar pago"
            />
          )}
          <IconTextButton
            variant=""
            size="sm"
            inline={true}
            icon={<X size={14} />}
            onClick={() => handleDeletePayable(item)}
            title="Eliminar"
            disabled={item.status === 'paid'}
          />
        </ButtonGroup>
      )
    }
  ], [handleDeletePayable]);

  // ─── Estadísticas ──────────────────────────────────────────────────────────
  const stats = useMemo(() => [
    { 
      label: 'Por Pagar', 
      value: formatCurrency(summary?.total_pending || 0), 
      icon: <Clock size={20} />, 
      color: 'var(--warning)', 
      subtext: `${summary?.pending_count || 0} facturas` 
    },
    { 
      label: 'Vencidas', 
      value: formatCurrency(summary?.total_overdue || 0), 
      icon: <AlertCircle size={20} />, 
      color: 'var(--danger)', 
      subtext: `${summary?.overdue_count || 0} facturas` 
    },
    { 
      label: 'Pagadas', 
      value: formatCurrency(summary?.total_paid || 0), 
      icon: <CheckCircle size={20} />, 
      color: 'var(--success)', 
      subtext: `${summary?.paid_count || 0} facturas` 
    },
  ], [summary]);

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = useMemo(() => (
    <div className="users-toolbar">
      <CustomCombobox
        options={[
          { value: 'pending', label: 'Pendientes' },
          { value: 'overdue', label: 'Vencidas' },
          { value: 'paid', label: 'Pagadas' },
          { value: 'all', label: 'Todas' }
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
        placeholder="Filtrar por estado"
        filterable={false}
        forceDropup={false}
        className="combobox-compact"
      />
      <CustomCombobox
        options={[
          { value: 'all', label: 'Todos los tipos' },
          { value: 'purchase', label: 'Compras' },
          { value: 'service', label: 'Servicios' },
          { value: 'rent', label: 'Alquiler' },
          { value: 'tax', label: 'Impuestos' },
          { value: 'utility', label: 'Servicios básicos' },
          { value: 'other', label: 'Otros' }
        ]}
        value={typeFilter}
        onChange={setTypeFilter}
        placeholder="Filtrar por tipo"
        filterable={false}
        className="combobox-compact"
      />
      <IconTextButton
        variant=""
        size="md"
        icon={<RefreshCw size={14} />}
        onClick={handleResetFilters}
      >
        Limpiar
      </IconTextButton>
      <ButtonGroup>
        <IconTextButton
          variant="primary"
          size="md"
          icon={<Plus size={14} />}
          onClick={() => setShowCreateModal(true)}
        >
          Nueva Cuenta
        </IconTextButton>
        <IconTextButton
          variant="success"
          size="md"
          icon={<Download size={14} />}
          onClick={handleExportXLSX}
          disabled={exporting || !payables.length}
          loading={exporting}
        >
          Excel
        </IconTextButton>
        <ReportPdfButton customConfig={pdfConfig} />
      </ButtonGroup>
    </div>
  ), [search, statusFilter, typeFilter, payables, exporting, pdfConfig]);

  // ─── Botón de refrescar ──────────────────────────────────────────────────
  const refreshButton = useMemo(() => (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  ), [handleRefresh, refreshing]);

  // ─── Footer de la tabla ───────────────────────────────────────────────────
  const tableFooter = useMemo(() => {
    if (!payables.length) return null;
    const totalMonto = payables.reduce((sum, p) => sum + toNumber(p.amount), 0);
    const totalPagado = payables.reduce((sum, p) => sum + toNumber(p.paid_amount), 0);
    const totalSaldo = payables.reduce((sum, p) => sum + toNumber(p.balance), 0);
    
    return (
      <tr className="table-footer-totals">
        <td colSpan="3"><strong>TOTALES</strong></td>
        <td className="text-right"><strong>{formatCurrency(totalMonto)}</strong></td>
        <td className="text-right"><strong>{formatCurrency(totalPagado)}</strong></td>
        <td className="text-right"><strong>{formatCurrency(totalSaldo)}</strong></td>
        <td colSpan="2"></td>
        <td></td>
      </tr>
    );
  }, [payables]);

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="CUENTAS POR PAGAR"
      subtitle="Gestión de obligaciones con proveedores"
      theme="business"
      loading={loading}
      error={error}
      onRetry={loadPayables}
      headerAction={refreshButton}
    >
      {/* Estadísticas */}
      <div className="stat-cards-row">
        {stats.map((stat, index) => {
          const borderColor = index === 1 ? 'var(--danger)' : index === 0 ? 'var(--warning)' : 'var(--success)';
          const iconBackground = index === 1 ? 'var(--danger-bg)' : 'var(--bg-primary)';
          const iconColor = index === 1 ? 'var(--danger)' : index === 0 ? 'var(--warning)' : 'var(--success)';

          return (
            <div key={stat.label} className="stat-card" style={{ borderLeft: `4px solid ${borderColor}` }}>
              <div className="stat-card-icon" style={{ background: iconBackground }}>
                {React.cloneElement(stat.icon, { color: iconColor })}
              </div>
              <div>
                <div className="stat-card-label">{stat.label}</div>
                <div className="stat-card-value" style={{ color: index === 1 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {stat.value}
                </div>
                <div className="stat-card-subtext">{stat.subtext}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabla */}
      <Table
        data={payables}
        columns={columns}
        keyField="id"
        title="Cuentas por Pagar"
        subtitle={`${payables.length} ${payables.length === 1 ? 'obligación' : 'obligaciones'}`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder='Buscar por proveedor'
        pagination={true}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 15]}
        onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
        loading={loading}
        emptyMessage={
          search || statusFilter !== 'pending' || typeFilter !== 'all'
            ? 'No hay cuentas que coincidan con los filtros aplicados'
            : 'No hay cuentas por pagar registradas'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
        footer={tableFooter}
      />

      {/* Modales */}
      {showCreateModal && (
        <CreatePayableModal 
          onClose={() => setShowCreateModal(false)} 
          onSave={handleCreatePayable} 
          saving={saving} 
        />
      )}
      
      {showPaymentModal && selectedPayable && (
        <PaymentModal 
          payable={selectedPayable} 
          onClose={() => { 
            setShowPaymentModal(false); 
            setSelectedPayable(null); 
          }} 
          onSave={handleRegisterPayment} 
          saving={saving} 
        />
      )}
      
      {showDetailModal && selectedPayable && (
        <DetailModal 
          payable={selectedPayable} 
          onClose={() => { 
            setShowDetailModal(false); 
            setSelectedPayable(null); 
          }} 
        />
      )}
    </PageTemplate>
  );
}