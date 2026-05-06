import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from 'exceljs';
import {
  FiDollarSign, FiPlus, FiEdit2, FiTrash2, FiRefreshCw,
  FiAlertCircle, FiSearch, FiCalendar, FiChevronDown,
  FiDownload, FiX, FiUsers, FiCheckCircle, FiClock,
  FiAlertTriangle, FiEye, FiMail, FiPhone
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import ReportPdfButton from '../../components/ReportPdfButton';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import "../../styles/AccountingReceivablePage.css";

// ─── Helper para formatear fechas ────────────────────────────────────────────
const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-EC');
};

// ─── Helper para convertir a número seguro ───────────────────────────────────
const toNumber = (val) => Number(val) || 0;

// ─── Modal de Cuenta por Cobrar (sin cambios significativos) ─────────────────
function ReceivableModal({ receivable, customers, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    customer_id: '',
    amount: '',
    description: '',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    invoice_number: '',
    status: 'pending',
    notes: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (receivable) {
      setForm({
        customer_id: receivable.customer_id || '',
        amount: receivable.amount || '',
        description: receivable.description || '',
        due_date: receivable.due_date?.split('T')[0] || '',
        invoice_number: receivable.invoice_number || '',
        status: receivable.status || 'pending',
        notes: receivable.notes || ''
      });
    } else {
      setForm({
        customer_id: '',
        amount: '',
        description: '',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        invoice_number: '',
        status: 'pending',
        notes: ''
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
      amount: parseFloat(form.amount)
    });
  };

  const statusOptions = [
    { value: 'pending', label: 'Pendiente', color: '#FFD700' },
    { value: 'partial', label: 'Pago parcial', color: '#FFA07A' },
    { value: 'paid', label: 'Pagado', color: '#A0E7C7' },
    { value: 'overdue', label: 'Vencido', color: '#FF6B6B' }
  ];

  return (
    <div className="receivable-modal-overlay" onClick={onClose}>
      <div className="receivable-modal-box" onClick={e => e.stopPropagation()}>
        <div className="receivable-modal-header">
          <h2>{receivable ? 'Editar cuenta por cobrar' : 'Nueva cuenta por cobrar'}</h2>
          <button type="button" onClick={onClose} className="receivable-modal-close">
            <FiX size={22} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="receivable-form-grid">
            <div className="receivable-form-group">
              <label>Cliente *</label>
              <select
                value={form.customer_id}
                onChange={e => setForm({ ...form, customer_id: e.target.value })}
                required
              >
                <option value="">Seleccionar cliente</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="receivable-form-group">
              <label>Monto *</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="receivable-form-group full-width">
              <label>Descripción *</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: Venta de productos, Servicio..."
              />
            </div>

            <div className="receivable-form-group">
              <label>Fecha de vencimiento *</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
              />
            </div>

            <div className="receivable-form-group">
              <label>N° Factura/Comprobante</label>
              <input
                type="text"
                value={form.invoice_number}
                onChange={e => setForm({ ...form, invoice_number: e.target.value })}
                placeholder="Factura #"
              />
            </div>

            <div className="receivable-form-group">
              <label>Estado</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="receivable-form-group full-width">
              <label>Notas (opcional)</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <div className="receivable-modal-footer">
            <button className="receivable-btn-cancel" type="button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button className="receivable-btn-save" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : receivable ? 'Guardar cambios' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de Pago (sin cambios) ─────────────────────────────────────────────
function PaymentModal({ receivable, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const remainingAmount = receivable ? receivable.remaining_amount || receivable.amount : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError('El monto del pago debe ser mayor a 0');
      return;
    }
    if (amount > remainingAmount) {
      setError(`El monto no puede superar el saldo pendiente: $${remainingAmount.toFixed(2)}`);
      return;
    }
    onSave(form);
  };

  return (
    <div className="receivable-modal-overlay" onClick={onClose}>
      <div className="receivable-modal-box receivable-modal-small" onClick={e => e.stopPropagation()}>
        <div className="receivable-modal-header">
          <h2>Registrar pago</h2>
          <button type="button" onClick={onClose} className="receivable-modal-close">
            <FiX size={22} />
          </button>
        </div>

        <div className="receivable-payment-info">
          <div className="receivable-payment-info-item">
            <span>Cliente:</span>
            <strong>{receivable?.customer_name}</strong>
          </div>
          <div className="receivable-payment-info-item">
            <span>Saldo pendiente:</span>
            <strong className="receivable-pending-amount">${remainingAmount.toFixed(2)}</strong>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="receivable-form-grid">
            <div className="receivable-form-group">
              <label>Monto a pagar *</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder={`Máx: ${remainingAmount.toFixed(2)}`}
                autoFocus
              />
            </div>

            <div className="receivable-form-group">
              <label>Fecha de pago *</label>
              <input
                type="date"
                value={form.payment_date}
                onChange={e => setForm({ ...form, payment_date: e.target.value })}
              />
            </div>

            <div className="receivable-form-group">
              <label>Método de pago</label>
              <select
                value={form.payment_method}
                onChange={e => setForm({ ...form, payment_method: e.target.value })}
              >
                <option value="cash">Efectivo</option>
                <option value="bank_transfer">Transferencia bancaria</option>
                <option value="credit_card">Tarjeta de crédito</option>
                <option value="debit_card">Tarjeta de débito</option>
                <option value="check">Cheque</option>
              </select>
            </div>

            <div className="receivable-form-group">
              <label>Referencia</label>
              <input
                type="text"
                value={form.reference}
                onChange={e => setForm({ ...form, reference: e.target.value })}
                placeholder="Comprobante #"
              />
            </div>

            <div className="receivable-form-group full-width">
              <label>Notas</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Notas del pago..."
              />
            </div>
          </div>

          <div className="receivable-modal-footer">
            <button className="receivable-btn-cancel" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="receivable-btn-save" type="submit" disabled={saving}>
              {saving ? 'Procesando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de Cliente (sin cambios) ──────────────────────────────────────────
function CustomerModal({ customer, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_id: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        tax_id: customer.tax_id || ''
      });
    }
  }, [customer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre del cliente es requerido');
      return;
    }
    onSave(form);
  };

  return (
    <div className="receivable-modal-overlay" onClick={onClose}>
      <div className="receivable-modal-box receivable-modal-small" onClick={e => e.stopPropagation()}>
        <div className="receivable-modal-header">
          <h2>{customer ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <button type="button" onClick={onClose} className="receivable-modal-close">
            <FiX size={22} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="receivable-form-group">
            <label>Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre del cliente"
              autoFocus
            />
          </div>

          <div className="receivable-form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="cliente@ejemplo.com"
            />
          </div>

          <div className="receivable-form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="(123) 456-7890"
            />
          </div>

          <div className="receivable-form-group">
            <label>Dirección</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Dirección del cliente"
            />
          </div>

          <div className="receivable-form-group">
            <label>RUC/Cédula</label>
            <input
              type="text"
              value={form.tax_id}
              onChange={e => setForm({ ...form, tax_id: e.target.value })}
              placeholder="Número de identificación"
            />
          </div>

          <div className="receivable-modal-footer">
            <button className="receivable-btn-cancel" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="receivable-btn-save" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : customer ? 'Guardar' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AccountingReceivablePage() {
  const { selectedBusiness } = useBusinessContext();
  const navigate = useNavigate();
  const [receivables, setReceivables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    total_receivable: 0,
    total_paid: 0,
    total_pending: 0,
    total_overdue: 0
  });

  // ─── Cargar clientes ──────────────────────────────────────────────────────
  const loadCustomers = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
      const res = await fetchWithAuth('/api/accounting-receivable/customers');
      const data = await res.json();
      setCustomers(Array.isArray(data.data) ? data.data : data.customers || []);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  }, [selectedBusiness]);

  // ─── Cargar cuentas por cobrar ────────────────────────────────────────────
  const loadReceivables = useCallback(async () => {
    if (!selectedBusiness?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);
      
      const res = await fetchWithAuth(`/api/accounting-receivable/receivables?${params}`);
      const data = await res.json();
      const receivablesList = Array.isArray(data.data) ? data.data : data.receivables || [];
      setReceivables(receivablesList);
      
      // Calcular estadísticas reales (a partir de los datos obtenidos)
      const total = receivablesList.reduce((sum, r) => sum + toNumber(r.amount), 0);
      const paid = receivablesList
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + toNumber(r.amount), 0);
      const pending = receivablesList
        .filter(r => r.status === 'pending' || r.status === 'partial')
        .reduce((sum, r) => sum + toNumber(r.balance !== undefined ? r.balance : r.amount), 0);
      const overdue = receivablesList
        .filter(r => r.status === 'overdue')
        .reduce((sum, r) => sum + toNumber(r.balance !== undefined ? r.balance : r.amount), 0);
      
      setStats({ total_receivable: total, total_paid: paid, total_pending: pending, total_overdue: overdue });
    } catch (err) {
      console.error('Error loading receivables:', err);
      setError('Error al cargar las cuentas por cobrar');
      setReceivables([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, statusFilter, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadReceivables();
  }, [loadReceivables]);

  // ─── Exportación a Excel (con estilos profesionales) ───────────────────────
  const handleExportXLSX = async () => {
    if (!receivables.length) {
      setError('No hay datos para exportar');
      return;
    }
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'IDON Contabilidad';
      wb.created = new Date();

      const COLORS = {
        headerBg:   '1E2840',
        sectionBg:  '2563EB',
        colHeaderBg:'DBEAFE',
        totalsBg:   '1E40AF',
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
          fill: altRow ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.rowAlt } } : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } },
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

      const ws = wb.addWorksheet('Cuentas por Cobrar', { views: [{ showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'landscape' } });
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

      // Cabeceras
      const headers = ['Cliente', 'Descripción', 'N° Factura', 'Vencimiento', 'Estado', 'Monto Total', 'Saldo Pendiente'];
      headers.forEach((h, i) => styleColHeader(ws.getCell(4, i + 1), h));
      ws.getRow(4).height = 16;

      let sumMonto = 0, sumSaldo = 0;
      receivables.forEach((r, idx) => {
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

      const lastRow = 5 + receivables.length;
      ws.getRow(lastRow).height = 18;
      styleTotals(ws.getCell(lastRow, 1), 'TOTALES', 'left');
      [2,3,4,5].forEach(c => styleTotals(ws.getCell(lastRow, c), ''));
      styleTotals(ws.getCell(lastRow, 6), sumMonto, 'right', '"$"#,##0.00');
      styleTotals(ws.getCell(lastRow, 7), sumSaldo, 'right', '"$"#,##0.00');

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cuentas_por_cobrar_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  };

  // ─── Configuración para PDF ───────────────────────────────────────────────
  const pdfConfig = receivables.length ? {
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
      rows: receivables.map(r => ({
        cliente: r.customer_name || 'Sin cliente',
        descripcion: r.description || '-',
        factura: r.invoice_number || '-',
        vencimiento: r.due_date,
        monto: toNumber(r.amount),
        saldo: toNumber(r.balance !== undefined ? r.balance : r.amount)
      }))
    }]
  } : null;

  // ─── Handlers (CRUD) ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReceivables();
    await loadCustomers();
    setRefreshing(false);
  };

  const handleSaveReceivable = async (form) => {
    setSaving(true);
    setError('');
    try {
      const isEdit = !!editingReceivable;
      const url = isEdit ? `/api/accounting-receivable/receivables/${editingReceivable.id}` : '/api/accounting-receivable/receivables';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setShowModal(false);
      setEditingReceivable(null);
      loadReceivables();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReceivable = async (receivable) => {
    if (!window.confirm(`¿Eliminar la cuenta por cobrar "${receivable.description}"?`)) return;
    setSaving(true);
    try {
      await fetchWithAuth(`/api/accounting-receivable/receivables/${receivable.id}`, { method: 'DELETE' });
      loadReceivables();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterPayment = async (paymentData) => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/accounting-receivable/receivables/${selectedReceivable.id}/payments`, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });
      if (!res.ok) throw new Error('Error al registrar pago');
      setShowPaymentModal(false);
      setSelectedReceivable(null);
      loadReceivables();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCustomer = async (form) => {
    setSaving(true);
    try {
      const isEdit = !!editingCustomer;
      const url = isEdit ? `/api/accounting-receivable/customers/${editingCustomer.id}` : '/api/accounting-receivable/customers';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Error al guardar cliente');
      setShowCustomerModal(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Navegación entre modales ─────────────────────────────────────────────
  const openCreateReceivable = () => {
    setEditingReceivable(null);
    setError('');
    setShowModal(true);
  };
  const openEditReceivable = (receivable) => {
    setEditingReceivable(receivable);
    setError('');
    setShowModal(true);
  };
  const openPaymentModal = (receivable) => {
    const orderNum = receivable.order_number || receivable.invoice_number;
    if (orderNum) {
      navigate('/app/pos/pos.sales', { state: { orderNumber: orderNum } });
      return;
    }
    setSelectedReceivable(receivable);
    setShowPaymentModal(true);
  };
  const openCreateCustomer = () => {
    setEditingCustomer(null);
    setShowCustomerModal(true);
  };

  // ─── Badge de estado ──────────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pendiente', icon: <FiClock size={12} />, class: 'pending' },
      partial: { label: 'Pago parcial', icon: <FiAlertTriangle size={12} />, class: 'partial' },
      paid: { label: 'Pagado', icon: <FiCheckCircle size={12} />, class: 'paid' },
      overdue: { label: 'Vencido', icon: <FiAlertCircle size={12} />, class: 'overdue' }
    };
    const c = config[status] || config.pending;
    return (<span className={`receivable-status-badge ${c.class}`}>{c.icon} {c.label}</span>);
  };

  // ─── Botones del header ───────────────────────────────────────────────────
  const refreshButton = (
    <button onClick={handleRefresh} className="receivable-refresh-btn" disabled={refreshing}>
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const excelButton = (
    <button onClick={handleExportXLSX} className="receivable-btn-secondary" disabled={exporting || !receivables.length}>
      <FiDownload size={16} /> {exporting ? 'Exportando...' : 'Excel'}
    </button>
  );

  const newReceivableButton = (
    <button onClick={openCreateReceivable} className="receivable-btn-primary">
      <FiPlus size={16} /> Nueva cuenta
    </button>
  );

  return (
    <PageTemplate
      title="CUENTAS POR COBRAR"
      subtitle="Gestión de créditos y cobranzas a clientes"
      theme="business"
      loading={loading}
      headerAction={
        <div className="receivable-header-actions">
          {newReceivableButton}
          {excelButton}
          <ReportPdfButton
            customConfig={pdfConfig}
            className="receivable-btn-secondary"
          />
          {refreshButton}
        </div>
      }
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="receivable-summary-grid">
        <div className="receivable-summary-card">
          <div className="receivable-summary-icon"><FiDollarSign size={24} /></div>
          <div className="receivable-summary-content">
            <div className="receivable-summary-title">Total por cobrar</div>
            <div className="receivable-summary-value">${stats.total_receivable.toFixed(2)}</div>
          </div>
        </div>
        <div className="receivable-summary-card">
          <div className="receivable-summary-icon paid"><FiCheckCircle size={24} /></div>
          <div className="receivable-summary-content">
            <div className="receivable-summary-title">Pagado</div>
            <div className="receivable-summary-value">${stats.total_paid.toFixed(2)}</div>
          </div>
        </div>
        <div className="receivable-summary-card">
          <div className="receivable-summary-icon pending"><FiClock size={24} /></div>
          <div className="receivable-summary-content">
            <div className="receivable-summary-title">Pendiente</div>
            <div className="receivable-summary-value">${stats.total_pending.toFixed(2)}</div>
          </div>
        </div>
        <div className="receivable-summary-card">
          <div className="receivable-summary-icon overdue"><FiAlertTriangle size={24} /></div>
          <div className="receivable-summary-content">
            <div className="receivable-summary-title">Vencido</div>
            <div className="receivable-summary-value">${stats.total_overdue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="receivable-filters-bar">
        <div className="receivable-search-wrapper">
          <FiSearch size={16} className="receivable-search-icon" />
          <input
            type="text"
            placeholder="Buscar por cliente, descripción o factura..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="receivable-search-input"
          />
        </div>
        <div className="receivable-filter-group">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="receivable-filter-select"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="partial">Pago parcial</option>
            <option value="overdue">Vencidos</option>
            <option value="paid">Pagados</option>
          </select>
          <button onClick={openCreateCustomer} className="receivable-link-btn">
            <FiUsers size={14} /> Gestionar clientes
          </button>
        </div>
      </div>

      {/* Tabla de cuentas por cobrar */}
      <div className="receivable-table-container">
        <div className="receivable-table-header">
          <h3>Listado de cuentas por cobrar</h3>
          <span className="receivable-count">{receivables.length} registros</span>
        </div>
        <div className="receivable-table-wrapper">
          <table className="receivable-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Descripción</th>
                <th>N° Factura</th>
                <th>Fecha vencimiento</th>
                <th>Estado</th>
                <th className="receivable-text-right">Monto total</th>
                <th className="receivable-text-right">Saldo pendiente</th>
                <th style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {receivables.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className="receivable-empty-state">
                    <FiDollarSign size={48} />
                    <span>No hay cuentas por cobrar registradas</span>
                    <button onClick={openCreateReceivable} className="receivable-empty-btn">
                      <FiPlus size={14} /> Registrar primera cuenta
                    </button>
                  </td>
                </tr>
              ) : (
                receivables.map(receivable => {
                  const remaining = toNumber(receivable.balance !== undefined ? receivable.balance : receivable.amount);
                  const isOverdue = new Date(receivable.due_date) < new Date() && receivable.status !== 'paid';
                  return (
                    <tr key={receivable.id} className={isOverdue && receivable.status !== 'paid' ? 'overdue-row' : ''}>
                      <td className="receivable-customer"><strong>{receivable.customer_name}</strong>
                        {receivable.customer_phone && <small>{receivable.customer_phone}</small>}
                      </td>
                      <td className="receivable-description">{receivable.description}</td>
                      <td className="receivable-invoice">{receivable.invoice_number || '—'}</td>
                      <td className={isOverdue && receivable.status !== 'paid' ? 'overdue-date' : ''}>
                        {formatDate(receivable.due_date)}
                      </td>
                      <td>{getStatusBadge(receivable.status)}</td>
                      <td className="receivable-text-right">${toNumber(receivable.amount).toFixed(2)}</td>
                      <td className="receivable-text-right receivable-pending">${remaining.toFixed(2)}</td>
                      <td className="receivable-actions">
                        {receivable.status !== 'paid' && (
                          <button className="receivable-action-btn payment" onClick={() => openPaymentModal(receivable)} title="Registrar pago">
                            <FiDollarSign size={14} />
                          </button>
                        )}
                        <button className="receivable-action-btn edit" onClick={() => openEditReceivable(receivable)} title="Editar">
                          <FiEdit2 size={14} />
                        </button>
                        <button className="receivable-action-btn delete" onClick={() => handleDeleteReceivable(receivable)} title="Eliminar">
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {receivables.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="receivable-footer-label">Totales</td>
                  <td className="receivable-text-right receivable-footer-total">
                    ${receivables.reduce((s, r) => s + toNumber(r.amount), 0).toFixed(2)}
                  </td>
                  <td className="receivable-text-right receivable-footer-pending">
                    ${receivables.reduce((s, r) => s + toNumber(r.balance !== undefined ? r.balance : r.amount), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modales */}
      {showModal && (
        <ReceivableModal
          receivable={editingReceivable}
          customers={customers}
          onClose={() => { setShowModal(false); setEditingReceivable(null); }}
          onSave={handleSaveReceivable}
          saving={saving}
        />
      )}
      {showPaymentModal && (
        <PaymentModal
          receivable={selectedReceivable}
          onClose={() => { setShowPaymentModal(false); setSelectedReceivable(null); }}
          onSave={handleRegisterPayment}
          saving={saving}
        />
      )}
      {showCustomerModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => { setShowCustomerModal(false); setEditingCustomer(null); }}
          onSave={handleSaveCustomer}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}