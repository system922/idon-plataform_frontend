import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../context/SessionContext'; 
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import { 
  Plus, Edit2, Trash2, X, 
  Mail, Phone, CreditCard, 
  Users, UserCheck, UserPlus, ShoppingBag, 
  CheckCircle, AlertCircle
} from 'react-feather';
import { FiRefreshCw as FiRefreshCwIcon } from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api'; 
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Modal from '../../components/General/Modal';
import Input from '../../components/General/Input';
import Table from '../../components/General/Table';
import '../../styles/CRMCustomersPage.css';

// ── Modal para agregar/editar cliente ──────────────────────────────────────
function CustomerModal({ customer, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    phone: '',
    tipo_documento: 'cedula',
    cedula: '',
    address: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [loadingPerson, setLoadingPerson] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm({
        nombre: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        tipo_documento: customer.document_type || 'cedula',
        cedula: customer.document_number || '',
        address: customer.address || '',
        notes: customer.notes || '',
      });
    } else {
      setForm({
        nombre: '',
        email: '',
        phone: '',
        tipo_documento: 'cedula',
        cedula: '',
        address: '',
        notes: '',
      });
    }
  }, [customer]);

  const setFormField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  // ── Validar cédula ecuatoriana ──────────────────────────────────────────
  const validarCedula = (cedula) => {
    if (!cedula || cedula.length !== 10) return false;
    if (!/^\d{10}$/.test(cedula)) return false;
    
    const provincia = parseInt(cedula.substring(0, 2));
    if (provincia < 1 || provincia > 24) return false;
    
    const digitos = cedula.split('').map(Number);
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;
    
    for (let i = 0; i < 9; i++) {
      let valor = digitos[i] * coeficientes[i];
      if (valor > 9) valor -= 9;
      suma += valor;
    }
    
    const digitoVerificador = (10 - (suma % 10)) % 10;
    return digitoVerificador === digitos[9];
  };

  // ── Buscar persona por cédula ──────────────────────────────────────────
  const buscarPersonaPorCedula = async (cedula) => {
    if (!cedula || cedula.length !== 10 || !validarCedula(cedula)) return;
    
    setLoadingPerson(true);
    try {
      // ✅ SIN /api
      const res = await fetchWithAuth(`/customers/by-document?document_number=${cedula}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.name) {
          setFormField('nombre', data.name);
          setFormField('email', data.email || '');
          setFormField('phone', data.phone || '');
          return;
        }
      }

      // Si no existe en el sistema, buscar en el padrón
      await buscarEnPadron(cedula);
    } catch (error) {
      console.error('Error buscando persona:', error);
    } finally {
      setLoadingPerson(false);
    }
  };

  // ── Buscar en el padrón ─────────────────────────────────────────────
  const buscarEnPadron = async (cedula) => {
    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl = 'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';
      const postData = new URLSearchParams({ documento: cedula, tipo: '1' });
      
      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData
      });
      
      const text = await response.text();
      if (text) {
        const json = JSON.parse(text);
        if (json?.nombres) {
          const nombreCompleto = (json.nombres + ' ' + (json.apellidos || '')).trim();
          setFormField('nombre', nombreCompleto);
        }
      }
    } catch (error) {
      console.error('Error en padrón:', error);
    }
  };

  // ── Auto-buscar al cambiar cédula ──────────────────────────────────────
  useEffect(() => {
    const doc = form.cedula;
    if (doc && doc.length === 10 && validarCedula(doc)) {
      const timer = setTimeout(() => {
        buscarPersonaPorCedula(doc);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [form.cedula]);

  // ── Validación completa del formulario ──────────────────────────────────
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!form.nombre?.trim()) {
      newErrors.nombre = 'Nombre es requerido';
      isValid = false;
    }

    if (!form.cedula?.trim()) {
      newErrors.cedula = 'Número de documento es requerido';
      isValid = false;
    } else if (form.cedula.length !== 10) {
      newErrors.cedula = 'La cédula debe tener 10 dígitos';
      isValid = false;
    } else if (!validarCedula(form.cedula)) {
      newErrors.cedula = 'Cédula inválida';
      isValid = false;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Email inválido';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleSaveClick = async (e) => {
    e.preventDefault();
    if (isSubmitting || saving) return;
    
    setIsSubmitting(true);
    try {
      const isValid = validateForm();
      if (isValid) {
        await onSave(form);
      }
    } catch (error) {
      console.error('Error en validación:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Verificar si el botón de guardar debe estar habilitado ────────────
  const isFormValid = () => {
    if (!form.nombre?.trim()) return false;
    if (!form.cedula?.trim()) return false;
    if (form.cedula.length !== 10) return false;
    if (!validarCedula(form.cedula)) return false;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return false;
    return true;
  };

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={customer ? 'Editar cliente' : 'Nuevo cliente'}
      size="md"
      footer={
        <>
          <ButtonGroup>
            <IconTextButton
              variant="danger"
              size="md"
              icon={<X size={14} />}
              onClick={onClose}
              disabled={saving || isSubmitting}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              icon={<Plus size={14} />}
              onClick={handleSaveClick}
              disabled={!isFormValid() || saving || isSubmitting}
              loading={saving || isSubmitting}
            >
              {saving ? 'Guardando...' : (customer ? 'Actualizar' : 'Crear cliente')}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <form onSubmit={handleSaveClick} className="customer-modal-form">
        <div className="customer-form-grid">
          {/* ── Primera fila: Tipo documento + Número documento ── */}
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: '160px' }}>
              <label>Tipo documento</label>
              <select 
                value={form.tipo_documento} 
                onChange={e => setFormField('tipo_documento', e.target.value)}
                className="customer-select"
              >
                <option value="cedula">Cédula</option>
                <option value="ruc">RUC</option>
                <option value="pasaporte">Pasaporte</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Número documento <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <Input
                  type="text"
                  value={form.cedula}
                  onChange={(value) => {
                    const clean = value.replace(/\D/g, '').slice(0, 13);
                    setFormField('cedula', clean);
                  }}
                  placeholder="0123456789"
                  size="md"
                  icon={<CreditCard size={14} />}
                  maxLength={13}
                  error={errors.cedula}
                  required
                />
                {loadingPerson && (
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}>
                    <div className="spinner-small" />
                  </div>
                )}
              </div>
              {errors.cedula && <span className="error-text">{errors.cedula}</span>}
              <small style={{ 
                color: form.cedula && form.cedula.length === 10 
                  ? validarCedula(form.cedula) ? 'var(--success-color)' : 'var(--danger-color)'
                  : 'var(--text-muted)', 
                fontSize: '11px', 
                marginTop: '2px', 
                display: 'block' 
              }}>
                {form.cedula && form.cedula.length === 10 
                  ? validarCedula(form.cedula) ? '✅ Cédula válida' : '❌ Cédula inválida' 
                  : '10 dígitos para cédula'}
              </small>
            </div>
          </div>

          {/* ── Segunda fila: Nombre completo ── */}
          <div className="form-group">
            <label>Nombre completo <span className="required">*</span></label>
            <Input
              type="text" 
              value={form.nombre} 
              onChange={(value) => setFormField('nombre', value)}
              placeholder="Ej: Juan Pérez"
              size="md"
              icon={<Users size={14} />}
              error={errors.nombre}
              required
            />
            {errors.nombre && <span className="error-text">{errors.nombre}</span>}
          </div>

          {/* ── Tercera fila: Email + Teléfono ── */}
          <div className="form-row">
            <div className="form-group" style={{ maxWidth: '400px' }}>
              <label>Email</label>
              <Input
                type="email" 
                value={form.email} 
                onChange={(value) => setFormField('email', value)}
                placeholder="cliente@ejemplo.com"
                size="md"
                icon={<Mail size={14} />}
                error={errors.email}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            <div className="form-group" style={{ maxWidth: '190px' }}>
              <label>Teléfono</label>
              <Input
                type="text" 
                value={form.phone} 
                onChange={(value) => {
                  const clean = value.replace(/\D/g, '').slice(0, 10);
                  setFormField('phone', clean);
                }}
                placeholder="0999999999"
                size="md"
                icon={<Phone size={14} />}
                maxLength={10}
              />
            </div>
          </div>

          {/* ── Cuarta fila: Dirección ── */}
          <div className="form-group">
            <label>Dirección</label>
            <textarea
              value={form.address} 
              onChange={e => setFormField('address', e.target.value)}
              rows={2} 
              placeholder="Dirección del cliente"
              className="customer-textarea"
            />
          </div>

          {/* ── Quinta fila: Notas ── */}
          <div className="form-group">
            <label>Notas / Observaciones</label>
            <textarea
              value={form.notes} 
              onChange={e => setFormField('notes', e.target.value)}
              rows={2} 
              placeholder="Notas adicionales"
              className="customer-textarea"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function CrmCustomers() {
  const { user } = useSession(); // ✅ AGREGADO
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);
  const [invoiceSource, setInvoiceSource] = useState(null);
  const limit = 20;

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadStats = useCallback(async () => {
    try {
      // ✅ SIN /api
      const response = await fetchWithAuth('/customers/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      // Silently fail
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // ✅ SIN /api
      let url = `/customers?page=${currentPage}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const response = await fetchWithAuth(url);
      const data = await response.json();
      
      let customersArray = [];
      let total = 0;
      let pages = 1;
      
      if (data && data.success) {
        customersArray = Array.isArray(data.data) ? data.data : [];
        total = data.pagination?.total || customersArray.length;
        pages = data.pagination?.totalPages || 1;
        if (data.metadata) {
          setInvoiceSource(data.metadata.invoiceSource);
        }
      } else if (Array.isArray(data)) {
        customersArray = data;
        total = data.length;
        pages = 1;
      } else {
        customersArray = [];
        total = 0;
        pages = 1;
      }
      
      setCustomers(customersArray);
      setTotalCustomers(total);
      setTotalPages(pages);
      
    } catch (err) {
      setError(err.message);
      setCustomers([]);
      setTotalCustomers(0);
      setTotalPages(1);
      showNotification('Error al cargar clientes', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, search, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    await loadStats();
    setRefreshing(false);
    showNotification('Clientes actualizados', 'success');
  };

  useEffect(() => {
    loadCustomers();
    loadStats();
  }, [loadCustomers, loadStats]);

  useRealtimeSync('customers', () => { loadCustomers(); loadStats(); });

  const handleSaveCustomer = async (form) => {
    setSaving(true);
    try {
      // ✅ SIN /api
      const url = editingCustomer 
        ? `/customers/${editingCustomer.id}` 
        : '/customers';
      const method = editingCustomer ? 'PUT' : 'POST';
      
      const body = {
        nombre: form.nombre,
        cedula: form.cedula,
        email: form.email,
        phone: form.phone,
        tipo_documento: form.tipo_documento,
        address: form.address,
        notes: form.notes
      };
      
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Error al guardar');
      
      setShowModal(false);
      setEditingCustomer(null);
      await loadCustomers();
      await loadStats();
      await alert.success(
        editingCustomer ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente',
        'Éxito'
      );
    } catch (err) {
      await alert.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar permanentemente a "${customer.name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;

    try {
      // ✅ SIN /api
      const response = await fetchWithAuth(`/customers/${customer.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      await loadCustomers();
      await loadStats();
      await alert.success('Cliente eliminado correctamente', 'Eliminado');
    } catch (err) {
      await alert.error(err.message);
    }
  };

  const openCreate = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const safeCustomers = Array.isArray(customers) ? customers : [];
  
  const statsData = [
    { label: 'Total clientes', value: stats?.total_customers || totalCustomers || 0, icon: <Users size={24} />, color: 'total' },
    { label: 'Activos', value: stats?.active_customers || safeCustomers.filter(c => c.is_active !== false).length, icon: <UserCheck size={24} />, color: 'active' },
    { label: 'Nuevos (30 días)', value: stats?.new_last_30_days || 0, icon: <UserPlus size={24} />, color: 'new' },
    { label: 'Con compras', value: stats?.customers_with_orders || safeCustomers.filter(c => (c.total_orders || 0) > 0).length, icon: <ShoppingBag size={24} />, color: 'orders' },
  ];

  const filteredCustomers = search 
    ? safeCustomers.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.document_number || '').includes(search)
      )
    : safeCustomers;

  const displayCustomers = filteredCustomers;

  // ── Columnas para la tabla ──────────────────────────────────────────────────
  const columns = [
    {
      accessor: 'customer',
      label: 'Cliente',
      render: (item) => (
        <div className="customer-info-cell">
          <div>
            <div>{item.name || '—'}</div>
            <div className="customer-date">
              Registrado: {item.created_at ? new Date(item.created_at).toLocaleDateString('es-EC') : '—'}
            </div>
          </div>
        </div>
      )
    },
    {
      accessor: 'contact',
      label: 'Contacto',
      render: (item) => (
        <div>
          {item.email && (
            <div className="contact-email">
              {item.email}
            </div>
          )}
          {item.phone && (
            <div className="contact-phone">
              {item.phone}
            </div>
          )}
          {!item.email && !item.phone && (
            <div>Sin contacto</div>
          )}
        </div>
      )
    },
    {
      accessor: 'document',
      label: 'Documento',
      render: (item) => (
        <div className="document-info">
          {item.document_type || 'Cédula'}: {item.document_number || '—'}
        </div>
      )
    },
    {
      accessor: 'orders',
      label: 'Órdenes',
      align: 'center',
      render: (item) => (
        <span className="orders-count">{item.total_orders || 0}</span>
      )
    },
    {
      accessor: 'total_spent',
      label: 'Total gastado',
      align: 'center',
      render: (item) => (
        <div className="total-spent-container">
          <span className="total-spent">${(parseFloat(item.total_spent) || 0).toFixed(2)}</span>
        </div>
      )
    },
    {
      accessor: 'status',
      label: 'Estado',
      render: (item) => (
        item.is_active !== false ? (
          <div className="users-status-active">
            <CheckCircle size={16} />
            <span>Activo</span>
          </div>
        ) : (
          <div className="users-status-inactive">
            <AlertCircle size={16} />
            <span>Inactivo</span>
          </div>
        )
      )
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
            icon={<Edit2 size={12} />}
            onClick={() => openEdit(item)}
            title="Editar cliente"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<Trash2 size={12} />}
            onClick={() => handleDeleteCustomer(item)}
            title="Eliminar cliente"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      )
    }
  ];

  // ── Toolbar ──────────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="crm-toolbar">
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<Plus size={13} />}
          onClick={openCreate}
          disabled={!!saving}
          loading={!!saving}
        >
          Nuevo cliente
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ── Botón de refrescar ──────────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCwIcon size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );
  
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Gestión de Clientes"
      subtitle={`${totalCustomers} clientes registrados`}
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      headerAction={
        <div className="header-actions">
          {refreshButton}
        </div>
      }
    >
      <div className="crm-page-wrapper">
        {/* Notificación */}
        {notification && (
          <div className={`crm-notification ${notification.type}`}>
            {notification.msg}
          </div>
        )}

        {/* Estadísticas */}
        <div className="crm-stats-grid">
          {statsData.map(s => (
            <div key={s.label} className="crm-stat-card">
              <div className={`stat-icon ${s.color}`}>
                {s.icon}
              </div>
              <div className="stat-info">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabla de clientes */}
        <Table
          data={displayCustomers}
          columns={columns}
          keyField="id"
          title="Lista de clientes"
          subtitle={`${totalCustomers} ${totalCustomers === 1 ? 'cliente' : 'clientes'} registrados`}
          toolbar={toolbar}
          searchable={true}
          searchPlaceholder="Buscar por nombre, email o documento..."
          pagination={true}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 15]}
          onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
          loading={loading}
          emptyMessage={search ? 'No hay resultados para esa búsqueda' : 'No hay clientes registrados'}
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
        />

        {/* Modal */}
        {showModal && (
          <CustomerModal
            customer={editingCustomer}
            onClose={closeModal}
            onSave={handleSaveCustomer}
            saving={saving}
          />
        )}
      </div>
    </PageTemplate>
  );
}