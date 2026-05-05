import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  Plus, Edit2, Trash2, X, Search, RefreshCw, 
  Mail, Phone, CreditCard, ChevronLeft, ChevronRight,
  Users, UserCheck, UserPlus, ShoppingBag
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/CRMCustomersPage.css';

// Modal para agregar/editar cliente
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

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const canSave = form.nombre.trim() && form.cedula.trim();

  return (
    <div className="crm-modal-overlay" onClick={onClose}>
      <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-header">
          <div>
            <h3>{customer ? 'Editar cliente' : 'Nuevo cliente'}</h3>
            <p>{customer ? 'Modificar información del cliente' : 'Registrar un nuevo cliente'}</p>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="crm-modal-body">
          <div className="form-group">
            <label>Nombre completo *</label>
            <input
              type="text" 
              value={form.nombre} 
              onChange={e => set('nombre', e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email" 
                value={form.email} 
                onChange={e => set('email', e.target.value)}
                placeholder="cliente@ejemplo.com"
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="text" 
                value={form.phone} 
                onChange={e => set('phone', e.target.value)}
                placeholder="0999999999"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo documento</label>
              <select value={form.tipo_documento} onChange={e => set('tipo_documento', e.target.value)}>
                <option value="cedula">Cédula</option>
                <option value="ruc">RUC</option>
                <option value="pasaporte">Pasaporte</option>
              </select>
            </div>
            <div className="form-group">
              <label>Número documento *</label>
              <input
                type="text" 
                value={form.cedula} 
                onChange={e => set('cedula', e.target.value.replace(/\D/g, '').slice(0, 13))}
                placeholder="Número de documento"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Dirección</label>
            <textarea
              value={form.address} 
              onChange={e => set('address', e.target.value)}
              rows={2} 
              placeholder="Dirección del cliente"
            />
          </div>

          <div className="form-group">
            <label>Notas / Observaciones</label>
            <textarea
              value={form.notes} 
              onChange={e => set('notes', e.target.value)}
              rows={2} 
              placeholder="Notas adicionales"
            />
          </div>
        </div>

        <div className="crm-modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={() => onSave(form)}
            disabled={saving || !canSave}
          >
            {saving ? 'Guardando...' : (customer ? 'Actualizar' : 'Crear cliente')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente principal
export default function CrmCustomers() {
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
  const limit = 20;

  // Mostrar notificación
  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/customers/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  }, []);

  // Cargar clientes
  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = `/api/customers?page=${currentPage}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const response = await fetchWithAuth(url);
      const data = await response.json();
      
      if (data.success) {
        setCustomers(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalCustomers(data.pagination.total);
      } else if (Array.isArray(data)) {
        setCustomers(data);
        setTotalCustomers(data.length);
        setTotalPages(1);
      } else {
        setCustomers(data);
        setTotalCustomers(data.length);
        setTotalPages(1);
      }
    } catch (err) {
      setError(err.message);
      showNotification('Error al cargar clientes', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, search, statusFilter]);

  // Función para refrescar manualmente
  const handleRefresh = () => {
    setRefreshing(true);
    loadCustomers();
    loadStats();
    showNotification('Actualizando clientes...', 'info');
  };

  useEffect(() => {
    loadCustomers();
    loadStats();
  }, [loadCustomers, loadStats]);

  // Guardar cliente
  const handleSaveCustomer = async (form) => {
    try {
      setSaving(true);
      const url = editingCustomer 
        ? `/api/customers/${editingCustomer.id}` 
        : '/api/customers';
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
      loadCustomers();
      loadStats();
      showNotification(editingCustomer ? 'Cliente actualizado' : 'Cliente creado', 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar cliente
  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`¿Seguro que deseas eliminar a ${customer.name}?`)) return;
    try {
      const response = await fetchWithAuth(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      loadCustomers();
      loadStats();
      showNotification('Cliente eliminado', 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Datos para estadísticas
  const statsData = [
    { label: 'Total clientes', value: stats?.total_customers || totalCustomers || 0, icon: <Users size={24} />, color: 'total' },
    { label: 'Activos', value: stats?.active_customers || customers.filter(c => c.is_active !== false).length, icon: <UserCheck size={24} />, color: 'active' },
    { label: 'Nuevos (30 días)', value: stats?.new_last_30_days || 0, icon: <UserPlus size={24} />, color: 'new' },
    { label: 'Con compras', value: stats?.customers_with_orders || customers.filter(c => c.total_orders > 0).length, icon: <ShoppingBag size={24} />, color: 'orders' },
  ];

  // Filtrar clientes localmente si no hay paginación en el backend
  const filteredCustomers = search && !totalPages ? customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.document_number || '').includes(search)
  ) : customers;

  const displayCustomers = filteredCustomers;

  return (
    <PageTemplate
      title="Gestión de Clientes"
      subtitle={`${totalCustomers} clientes registrados`}
      loading={loading}
      error={error}
      onRetry={loadCustomers}
      headerAction={
        <div className="header-actions">
          <button className="btn-refresh" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            Actualizar
          </button>
        </div>
      }
    >
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

      {/* Filtros */}
      <div className="crm-filters">
        <div className="filter-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, email o documento..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <select
          className="filter-status"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

        <button className="btn-add" onClick={() => { setEditingCustomer(null); setShowModal(true); }}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Tabla de clientes */}
      <div className="crm-table-container">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Documento</th>
              <th className="center">Órdenes</th>
              <th className="center">Total gastado</th>
              <th className="center">Estado</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {displayCustomers.length === 0 && (
              <tr>
                <td colSpan="7" className="crm-empty-state">
                  {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </td>
              </tr>
            )}
            {displayCustomers.map((customer, idx) => (
              <tr key={customer.id}>
                <td>
                  <div className="customer-info-cell">
                    <div className="customer-avatar">
                      {customer.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="customer-name">{customer.name}</div>
                      <div className="customer-date">
                        Registrado: {customer.created_at ? new Date(customer.created_at).toLocaleDateString('es-EC') : '—'}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  {customer.email && (
                    <div className="contact-email">
                      <Mail size={12} /> {customer.email}
                    </div>
                  )}
                  {customer.phone && (
                    <div className="contact-phone">
                      <Phone size={12} /> {customer.phone}
                    </div>
                  )}
                  {!customer.email && !customer.phone && (
                    <div className="no-contact">Sin contacto</div>
                  )}
                </td>
                <td>
                  <div className="document-info">
                    <CreditCard size={12} />
                    {customer.document_type || 'Cédula'}: {customer.document_number || '—'}
                  </div>
                </td>
                <td className="orders-count center">
                  {customer.total_orders || 0}
                </td>
                <td className="total-spent center">
                  ${parseFloat(customer.total_spent || 0).toFixed(2)}
                </td>
                <td className="center">
                  <span className={`status-badge ${customer.is_active !== false ? 'status-active' : 'status-inactive'}`}>
                    {customer.is_active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="center">
                  <div className="action-buttons">
                    <button
                      className="btn-edit"
                      onClick={() => { setEditingCustomer(customer); setShowModal(true); }}
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteCustomer(customer)}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="crm-pagination">
            <button
              className="btn-pagination"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span className="pagination-info">
              Página {currentPage} de {totalPages}
            </span>
            <button
              className="btn-pagination"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Info de registros */}
        {displayCustomers.length > 0 && (
          <div className="crm-table-info">
            Mostrando {displayCustomers.length} de {totalCustomers} clientes
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => { setShowModal(false); setEditingCustomer(null); }}
          onSave={handleSaveCustomer}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}