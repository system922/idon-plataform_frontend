import React, { useState, useEffect, useCallback } from "react";
import {
  FiDollarSign, FiPlus, FiEdit2, FiTrash2, FiRefreshCw,
  FiAlertCircle, FiSearch, FiCalendar, FiChevronDown,
  FiDownload, FiX, FiUsers, FiCheckCircle, FiClock,
  FiAlertTriangle, FiEye, FiMail, FiPhone
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import "../../styles/AccountingReceivablePage.css";

// ─── Modal de Cuenta por Cobrar ───────────────────────────────────────────────
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

// ─── Modal de Pago ────────────────────────────────────────────────────────────
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

// ─── Modal de Cliente ─────────────────────────────────────────────────────────
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
  const [stats, setStats] = useState({
    total_receivable: 0,
    total_paid: 0,
    total_pending: 0,
    total_overdue: 0
  });

  // Cargar datos
  const loadCustomers = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
      const res = await fetchWithAuth('/api/accounting/customers');
      const data = await res.json();
      setCustomers(Array.isArray(data.data) ? data.data : data.customers || []);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  }, [selectedBusiness]);

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
      
      const res = await fetchWithAuth(`/api/accounting/receivables?${params}`);
      const data = await res.json();
      
      const receivablesList = Array.isArray(data.data) ? data.data : data.receivables || [];
      setReceivables(receivablesList);
      
      // Calcular estadísticas
      const total = receivablesList.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const paid = receivablesList
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const pending = receivablesList
        .filter(r => r.status === 'pending' || r.status === 'partial')
        .reduce((sum, r) => sum + (parseFloat(r.remaining_amount || r.amount) || 0), 0);
      const overdue = receivablesList
        .filter(r => r.status === 'overdue')
        .reduce((sum, r) => sum + (parseFloat(r.remaining_amount || r.amount) || 0), 0);
      
      setStats({
        total_receivable: total,
        total_paid: paid,
        total_pending: pending,
        total_overdue: overdue
      });
      
    } catch (err) {
      console.error('Error loading receivables:', err);
      setError('Error al cargar las cuentas por cobrar');
      setReceivables([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, statusFilter]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadReceivables();
  }, [loadReceivables]);

  // Filtrar por búsqueda
  const filteredReceivables = receivables.filter(r =>
    r.description?.toLowerCase().includes(search.toLowerCase()) ||
    r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.invoice_number?.toLowerCase().includes(search.toLowerCase())
  );

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
      const url = isEdit 
        ? `/api/accounting/receivables/${editingReceivable.id}` 
        : '/api/accounting/receivables';
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
      await fetchWithAuth(`/api/accounting/receivables/${receivable.id}`, { method: 'DELETE' });
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
      const res = await fetchWithAuth(`/api/accounting/receivables/${selectedReceivable.id}/payments`, {
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
      const url = isEdit 
        ? `/api/accounting/customers/${editingCustomer.id}` 
        : '/api/accounting/customers';
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

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('format', 'csv');
      
      const res = await fetchWithAuth(`/api/accounting/receivables/export?${params}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cuentas_por_cobrar_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error al exportar');
    }
  };

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
    setSelectedReceivable(receivable);
    setShowPaymentModal(true);
  };

  const openCreateCustomer = () => {
    setEditingCustomer(null);
    setShowCustomerModal(true);
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: 'Pendiente', icon: <FiClock size={12} />, class: 'pending' },
      partial: { label: 'Pago parcial', icon: <FiAlertTriangle size={12} />, class: 'partial' },
      paid: { label: 'Pagado', icon: <FiCheckCircle size={12} />, class: 'paid' },
      overdue: { label: 'Vencido', icon: <FiAlertCircle size={12} />, class: 'overdue' }
    };
    const c = config[status] || config.pending;
    return (
      <span className={`receivable-status-badge ${c.class}`}>
        {c.icon} {c.label}
      </span>
    );
  };

  // Botones header
  const refreshButton = (
    <button onClick={handleRefresh} className="receivable-refresh-btn" disabled={refreshing}>
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const exportButton = (
    <button onClick={handleExport} className="receivable-btn-secondary">
      <FiDownload size={16} /> Exportar
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
          {exportButton}
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
          <div className="receivable-summary-icon">
            <FiDollarSign size={24} />
          </div>
          <div className="receivable-summary-content">
            <div className="receivable-summary-title">Total por cobrar</div>
            <div className="receivable-summary-value">${stats.total_receivable.toFixed(2)}</div>
          </div>
        </div>

        <div className="receivable-summary-card">
          <div className="receivable-summary-icon paid">
            <FiCheckCircle size={24} />
          </div>
          <div className="receivable-summary-content">
            <div className="receivable-summary-title">Pagado</div>
            <div className="receivable-summary-value">${stats.total_paid.toFixed(2)}</div>
          </div>
        </div>

        <div className="receivable-summary-card">
          <div className="receivable-summary-icon pending">
            <FiClock size={24} />
          </div>
          <div className="receivable-summary-content">
            <div className="receivable-summary-title">Pendiente</div>
            <div className="receivable-summary-value">${stats.total_pending.toFixed(2)}</div>
          </div>
        </div>

        <div className="receivable-summary-card">
          <div className="receivable-summary-icon overdue">
            <FiAlertTriangle size={24} />
          </div>
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
          <span className="receivable-count">{filteredReceivables.length} registros</span>
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
              {filteredReceivables.length === 0 && !loading ? (
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
                filteredReceivables.map(receivable => {
                  const remaining = receivable.remaining_amount || receivable.amount;
                  const isOverdue = new Date(receivable.due_date) < new Date() && receivable.status !== 'paid';
                  
                  return (
                    <tr key={receivable.id} className={isOverdue && receivable.status !== 'paid' ? 'overdue-row' : ''}>
                      <td className="receivable-customer">
                        <strong>{receivable.customer_name}</strong>
                        {receivable.customer_phone && (
                          <small>{receivable.customer_phone}</small>
                        )}
                      </td>
                      <td className="receivable-description">{receivable.description}</td>
                      <td className="receivable-invoice">{receivable.invoice_number || '—'}</td>
                      <td className={isOverdue && receivable.status !== 'paid' ? 'overdue-date' : ''}>
                        {new Date(receivable.due_date).toLocaleDateString()}
                      </td>
                      <td>{getStatusBadge(receivable.status)}</td>
                      <td className="receivable-text-right">${parseFloat(receivable.amount).toFixed(2)}</td>
                      <td className="receivable-text-right receivable-pending">
                        ${parseFloat(remaining).toFixed(2)}
                      </td>
                      <td className="receivable-actions">
                        {receivable.status !== 'paid' && (
                          <button 
                            className="receivable-action-btn payment" 
                            onClick={() => openPaymentModal(receivable)}
                            title="Registrar pago"
                          >
                            <FiDollarSign size={14} />
                          </button>
                        )}
                        <button 
                          className="receivable-action-btn edit" 
                          onClick={() => openEditReceivable(receivable)}
                          title="Editar"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button 
                          className="receivable-action-btn delete" 
                          onClick={() => handleDeleteReceivable(receivable)}
                          title="Eliminar"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredReceivables.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="receivable-footer-label">Totales</td>
                  <td className="receivable-text-right receivable-footer-total">
                    ${filteredReceivables.reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(2)}
                  </td>
                  <td className="receivable-text-right receivable-footer-pending">
                    ${filteredReceivables.reduce((sum, r) => sum + (r.remaining_amount || r.amount), 0).toFixed(2)}
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
          onClose={() => {
            setShowModal(false);
            setEditingReceivable(null);
          }}
          onSave={handleSaveReceivable}
          saving={saving}
        />
      )}

      {showPaymentModal && (
        <PaymentModal
          receivable={selectedReceivable}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedReceivable(null);
          }}
          onSave={handleRegisterPayment}
          saving={saving}
        />
      )}

      {showCustomerModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => {
            setShowCustomerModal(false);
            setEditingCustomer(null);
          }}
          onSave={handleSaveCustomer}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}