import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  Search, DollarSign, Home, FileText, Calendar, RefreshCw, 
  TrendingUp, Download, Printer, ChevronLeft, ChevronRight,
  Eye, Clock, AlertCircle, CheckCircle, CreditCard, X, Plus,
  Truck, Zap, Server
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/AccountingPayablePage.css';

// Modal para crear nueva cuenta por pagar
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
          <div>
            <h3>Nueva Cuenta por Pagar</h3>
            <p>Registrar una nueva obligación con proveedor</p>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="payable-modal-body">
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
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="purchase">Compra</option>
                <option value="service">Servicio</option>
                <option value="rent">Alquiler</option>
                <option value="tax">Impuesto</option>
                <option value="utility">Servicio básico</option>
                <option value="other">Otro</option>
              </select>
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
        </div>

        <div className="payable-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={saving || !canSave}>
            {saving ? 'Guardando...' : 'Crear Cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal para registrar pago
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
          <div>
            <h3>Registrar Pago</h3>
            <p>Factura #{payable?.invoice_number || 'N/A'} - {payable?.supplier_name}</p>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="payable-modal-body">
          <div className="payment-info">
            <div className="info-row">
              <span>Saldo pendiente:</span>
              <strong className="amount">${parseFloat(payable?.balance || 0).toFixed(2)}</strong>
            </div>
          </div>

          <div className="form-group">
            <label>Método de pago</label>
            <select
              value={form.payment_method}
              onChange={e => setForm({ ...form, payment_method: e.target.value })}
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="check">Cheque</option>
            </select>
          </div>

          <div className="form-group">
            <label>Monto a pagar</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
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
        </div>

        <div className="payable-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={saving || !canSave}>
            {saving ? 'Procesando...' : 'Registrar Pago'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de detalle
function DetailModal({ payable, onClose }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-EC');
  };

  const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;

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
    <div className="payable-modal-overlay" onClick={onClose}>
      <div className="payable-modal detail-modal" onClick={e => e.stopPropagation()}>
        <div className="payable-modal-header">
          <div>
            <h3>Detalle de Cuenta por Pagar</h3>
            <p>{typeIcons[payable?.type]} {typeLabels[payable?.type] || payable?.type}</p>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="payable-modal-body">
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
                {payable.payments.map(payment => (
                  <div key={payment.id} className="payment-item">
                    <div className="payment-date">{formatDate(payment.payment_date)}</div>
                    <div className="payment-amount">{formatCurrency(payment.amount)}</div>
                    <div className="payment-method">{payment.payment_method}</div>
                    {payment.reference_number && <div className="payment-ref">{payment.reference_number}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="payable-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente principal
export default function AccountingPayablePage() {
  const [payables, setPayables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-EC');
  };

  // Cargar cuentas por pagar
  const loadPayables = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = `/api/accounting/payable?page=${currentPage}&limit=15&status=${statusFilter}`;
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
      } else {
        setPayables([]);
        setSummary({
          total_pending: 0,
          total_overdue: 0,
          total_paid: 0,
          pending_count: 0,
          paid_count: 0,
          overdue_count: 0
        });
      }
      
    } catch (err) {
      console.error('Error cargando cuentas:', err);
      setError(err.message);
      showNotification('Error al cargar cuentas por pagar', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, statusFilter, typeFilter, search]);

  useEffect(() => {
    loadPayables();
  }, [loadPayables]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPayables();
    showNotification('Actualizando cuentas...', 'info');
  };

  const handleResetFilters = () => {
    setStatusFilter('pending');
    setTypeFilter('all');
    setSearch('');
    setCurrentPage(1);
    showNotification('Filtros restablecidos', 'success');
  };

  const handleExportCSV = () => {
    if (!payables || payables.length === 0) {
      showNotification('No hay datos para exportar', 'warning');
      return;
    }
    
    const headers = ['Fecha', 'Proveedor', 'N° Factura', 'Monto', 'Fecha Vencimiento', 'Estado'];
    const rows = payables.map(p => [
      formatDate(p.issue_date),
      p.supplier_name,
      p.invoice_number || '-',
      formatCurrency(p.amount),
      formatDate(p.due_date),
      p.status === 'paid' ? 'Pagada' : (p.days_overdue > 0 ? 'Vencida' : 'Pendiente')
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cuentas_por_pagar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Exportación completada', 'success');
  };

  const handleCreatePayable = async (form) => {
    try {
      setSaving(true);
      const response = await fetchWithAuth('/api/accounting/payable', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification('Cuenta creada exitosamente', 'success');
        setShowCreateModal(false);
        loadPayables();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterPayment = async (paymentData) => {
    try {
      setSaving(true);
      const response = await fetchWithAuth(`/api/accounting/payable/${selectedPayable.id}/register-payment`, {
        method: 'POST',
        body: JSON.stringify(paymentData)
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification('Pago registrado exitosamente', 'success');
        setShowPaymentModal(false);
        setSelectedPayable(null);
        loadPayables();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Estadísticas
  const stats = [
    { 
      label: 'Por Pagar', 
      value: formatCurrency(summary?.total_pending || 0), 
      icon: <Clock size={20} />, 
      color: '#f59e0b',
      subtext: `${summary?.pending_count || 0} facturas`
    },
    { 
      label: 'Vencidas', 
      value: formatCurrency(summary?.total_overdue || 0), 
      icon: <AlertCircle size={20} />, 
      color: '#ef4444',
      subtext: `${summary?.overdue_count || 0} facturas vencidas`
    },
    { 
      label: 'Pagadas', 
      value: formatCurrency(summary?.total_paid || 0), 
      icon: <CheckCircle size={20} />, 
      color: '#10b981',
      subtext: `${summary?.paid_count || 0} facturas pagadas`
    },
  ];

  const headerAction = (
    <div className="payable-header-actions">
      <button className="btn-export" onClick={handleExportCSV} title="Exportar CSV">
        <Download size={16} /> Exportar
      </button>
      <button className="btn-refresh" onClick={handleRefresh} disabled={refreshing}>
        <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
        Actualizar
      </button>
      <button className="btn-create" onClick={() => setShowCreateModal(true)}>
        <Plus size={16} /> Nueva Cuenta
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Cuentas por Pagar"
      subtitle="Gestión de obligaciones con proveedores"
      loading={loading}
      error={error}
      onRetry={loadPayables}
      headerAction={headerAction}
    >
      {notification && (
        <div className={`payable-notification ${notification.type}`}>
          {notification.msg}
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="payable-stats-grid">
        {stats.map(stat => (
          <div key={stat.label} className="payable-stat-card">
            <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
              <span className="stat-sub">{stat.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="payable-filters">
        <div className="filter-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por proveedor o #factura..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="pending">Pendientes</option>
          <option value="overdue">Vencidas</option>
          <option value="paid">Pagadas</option>
          <option value="all">Todas</option>
        </select>

        <select
          className="filter-type"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">Todos los tipos</option>
          <option value="purchase">Compras</option>
          <option value="service">Servicios</option>
          <option value="rent">Alquiler</option>
          <option value="tax">Impuestos</option>
          <option value="utility">Servicios básicos</option>
          <option value="other">Otros</option>
        </select>

        <button className="btn-reset" onClick={handleResetFilters}>
          Limpiar filtros
        </button>
      </div>

      {/* Tabla de cuentas por pagar */}
      <div className="payable-table-container">
        <table className="payable-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>N° Factura</th>
              <th className="center">Monto</th>
              <th className="center">Pagado</th>
              <th className="center">Saldo</th>
              <th className="center">Vencimiento</th>
              <th className="center">Estado</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {payables.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="empty-state">
                  <FileText size={32} />
                  <p>No hay cuentas por pagar</p>
                  <span>Haz clic en "Nueva Cuenta" para registrar una obligación</span>
                </td>
              </tr>
            )}
            {payables.map(payable => (
              <tr key={payable.id} className={payable.payable_status === 'overdue' ? 'overdue-row' : ''}>
                <td>{formatDate(payable.issue_date)}</td>
                <td className="supplier-cell">
                  <Home size={12} />
                  {payable.supplier_name}
                </td>
                <td className="invoice-number">{payable.invoice_number || '-'}</td>
                <td className="center amount">{formatCurrency(payable.amount)}</td>
                <td className="center paid">{formatCurrency(payable.paid_amount)}</td>
                <td className="center balance">{formatCurrency(payable.balance)}</td>
                <td className="center">
                  <span className={payable.days_overdue > 0 ? 'date-overdue' : 'date-normal'}>
                    {formatDate(payable.due_date)}
                  </span>
                </td>
                <td className="center">
                  <span className={`status-badge status-${payable.payable_status === 'overdue' ? 'overdue' : payable.status}`}>
                    {payable.status === 'paid' ? 'Pagada' : (payable.payable_status === 'overdue' ? 'Vencida' : 'Pendiente')}
                  </span>
                </td>
                <td className="center">
                  <div className="action-buttons">
                    <button 
                      className="btn-view" 
                      onClick={() => {
                        setSelectedPayable(payable);
                        setShowDetailModal(true);
                      }}
                      title="Ver detalle"
                    >
                      <Eye size={14} />
                    </button>
                    {payable.status !== 'paid' && (
                      <button 
                        className="btn-pay" 
                        onClick={() => {
                          setSelectedPayable(payable);
                          setShowPaymentModal(true);
                        }}
                        title="Registrar pago"
                      >
                        <CreditCard size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="payable-pagination">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Info de registros */}
        {payables.length > 0 && (
          <div className="payable-table-info">
            Mostrando {payables.length} cuentas
          </div>
        )}
      </div>

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