import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  RefreshCw, Users, DollarSign, ShoppingBag, Calendar,
  Plus, X, ChevronLeft, ChevronRight, Filter, Target
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/CrmSegments.css';

// Modal para crear segmento personalizado
function CustomSegmentModal({ onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#6842fe',
    conditions: {
      min_spent: '',
      max_spent: '',
      min_orders: '',
      max_orders: '',
      min_avg_ticket: '',
      max_avg_ticket: '',
      days_inactive: '',
      days_active: ''
    }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCondition = (k, v) => setForm(f => ({ ...f, conditions: { ...f.conditions, [k]: v } }));

  const canSave = form.name.trim();

  return (
    <div className="segments-modal-overlay" onClick={onClose}>
      <div className="segments-modal" onClick={(e) => e.stopPropagation()}>
        <div className="segments-modal-header">
          <div>
            <h3>Crear Segmento Personalizado</h3>
            <p>Define tus propios criterios de segmentación</p>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="segments-modal-body">
          <div className="form-group">
            <label>Nombre del segmento *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ej: Clientes Premium"
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder="Descripción del segmento"
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <input
              type="color"
              value={form.color}
              onChange={e => set('color', e.target.value)}
              style={{ width: 60, height: 40, padding: 4, cursor: 'pointer' }}
            />
          </div>

          <div className="conditions-section">
            <h4>Condiciones de segmentación</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Gasto mínimo ($)</label>
                <input
                  type="number"
                  value={form.conditions.min_spent}
                  onChange={e => setCondition('min_spent', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Gasto máximo ($)</label>
                <input
                  type="number"
                  value={form.conditions.max_spent}
                  onChange={e => setCondition('max_spent', e.target.value)}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Órdenes mínimas</label>
                <input
                  type="number"
                  value={form.conditions.min_orders}
                  onChange={e => setCondition('min_orders', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Órdenes máximas</label>
                <input
                  type="number"
                  value={form.conditions.max_orders}
                  onChange={e => setCondition('max_orders', e.target.value)}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ticket promedio mínimo ($)</label>
                <input
                  type="number"
                  value={form.conditions.min_avg_ticket}
                  onChange={e => setCondition('min_avg_ticket', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Ticket promedio máximo ($)</label>
                <input
                  type="number"
                  value={form.conditions.max_avg_ticket}
                  onChange={e => setCondition('max_avg_ticket', e.target.value)}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Días desde última compra (inactivos)</label>
                <input
                  type="number"
                  value={form.conditions.days_inactive}
                  onChange={e => setCondition('days_inactive', e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="form-group">
                <label>Días desde última compra (activos)</label>
                <input
                  type="number"
                  value={form.conditions.days_active}
                  onChange={e => setCondition('days_active', e.target.value)}
                  placeholder="7"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="segments-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(form)} disabled={saving || !canSave}>
            {saving ? 'Guardando...' : 'Crear Segmento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal para ver clientes del segmento
function SegmentCustomersModal({ segment, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    loadCustomers();
  }, [currentPage]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/crm/segments/${segment.id}/customers?page=${currentPage}&limit=${limit}`);
      const data = await response.json();
      if (data.success) {
        setCustomers(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;

  return (
    <div className="segments-modal-overlay" onClick={onClose}>
      <div className="segments-modal large" onClick={(e) => e.stopPropagation()}>
        <div className="segments-modal-header">
          <div>
            <h3>{segment.name}</h3>
            <p>{segment.description} • {segment.count} clientes</p>
          </div>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="segments-modal-body">
          {loading ? (
            <div className="loading-state">Cargando clientes...</div>
          ) : customers.length === 0 ? (
            <div className="empty-state">No hay clientes en este segmento</div>
          ) : (
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Órdenes</th>
                  <th>Total gastado</th>
                  <th>Ticket promedio</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customer-cell">
                        <div className="customer-avatar-small">
                          {customer.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="customer-name">{customer.name}</div>
                          <div className="customer-since">
                            Desde: {new Date(customer.created_at).toLocaleDateString('es-EC')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {customer.email && <div className="contact-item">{customer.email}</div>}
                      {customer.phone && <div className="contact-item">{customer.phone}</div>}
                      {!customer.email && !customer.phone && <span className="no-contact">Sin contacto</span>}
                    </td>
                    <td className="center">{customer.total_orders}</td>
                    <td className="center spent">{formatCurrency(customer.total_spent)}</td>
                    <td className="center">{formatCurrency(customer.avg_ticket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Anterior
              </button>
              <span>Página {currentPage} de {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Siguiente
              </button>
            </div>
          )}
        </div>

        <div className="segments-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// Componente principal
export default function CrmSegments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadSegments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetchWithAuth('/api/crm/segments');
      const data = await response.json();
      if (data.success) {
        setSegments(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
      showNotification('Error al cargar segmentos', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSegments();
    showNotification('Actualizando segmentos...', 'info');
  };

  const handleCreateSegment = async (form) => {
    try {
      setSaving(true);
      const response = await fetchWithAuth('/api/crm/segments/custom', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (data.success) {
        setSegments(prev => [...prev, data.data]);
        setShowModal(false);
        showNotification('Segmento creado exitosamente', 'success');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;

  return (
    <PageTemplate
      title="Segmentación de Clientes"
      subtitle="Grupos de clientes según su comportamiento"
      loading={loading}
      error={error}
      onRetry={loadSegments}
      headerAction={
        <div className="header-actions">
          <button className="btn-refresh-segments" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            Actualizar
          </button>
          <button className="btn-create-segment" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nuevo Segmento
          </button>
        </div>
      }
    >
      {notification && (
        <div className={`segments-notification ${notification.type}`}>
          {notification.msg}
        </div>
      )}

      <div className="segments-grid">
        {segments.map(segment => (
          <div 
            key={segment.id} 
            className="segment-card"
            style={{ borderTopColor: segment.color }}
            onClick={() => setSelectedSegment(segment)}
          >
            <div className="segment-header">
              <div className="segment-icon" style={{ background: `${segment.color}20`, color: segment.color }}>
                {segment.icon}
              </div>
              <div className="segment-info">
                <h3>{segment.name}</h3>
                <p>{segment.description}</p>
              </div>
            </div>
            <div className="segment-stats">
              <div className="stat">
                <Users size={16} />
                <span className="stat-value">{segment.count}</span>
                <span className="stat-label">clientes</span>
              </div>
              <div className="stat">
                <DollarSign size={16} />
                <span className="stat-value">{formatCurrency(segment.avg_spent)}</span>
                <span className="stat-label">gasto promedio</span>
              </div>
            </div>
            <div className="segment-footer">
              <button className="btn-view" onClick={(e) => { e.stopPropagation(); setSelectedSegment(segment); }}>
                Ver clientes <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <CustomSegmentModal
          onClose={() => setShowModal(false)}
          onSave={handleCreateSegment}
          saving={saving}
        />
      )}

      {selectedSegment && (
        <SegmentCustomersModal
          segment={selectedSegment}
          onClose={() => setSelectedSegment(null)}
        />
      )}
    </PageTemplate>
  );
}