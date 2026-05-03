import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import {
  FiRefreshCw, FiPercent, FiDollarSign, FiPlus, FiX,
  FiCalendar, FiRepeat, FiClock, FiTag, FiEdit2, FiTrash2,
  FiGift, FiTruck, FiUsers, FiShoppingBag, FiAward,
  FiAlertCircle
} from "react-icons/fi";
import { CheckCircle, XCircle } from "react-feather";
import { fetchWithAuth } from '../../config/apiBase';
import { DAY_NAMES, parseDays, isDiscountActive } from '../../utils/discountUtils';
import '../../styles/PosDiscounts.css';

// ─── Constantes ─────────────────────────
const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
];

const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  BUY_X_GET_Y: 'buy_x_get_y',
  BULK: 'bulk',
  COUPON: 'coupon'
};

const PROMOTION_TYPES = {
  FLASH_SALE: 'flash_sale',
  SEASONAL: 'seasonal',
  NEW_CUSTOMER: 'new_customer',
  LOYALTY: 'loyalty',
  BUNDLE: 'bundle'
};

const EMPTY_FORM = {
  name: '',
  type: 'percentage',
  promotion_type: 'flash_sale',
  value: '',
  category_id: '',
  product_ids: [],
  schedule_type: 'always',
  start_date: '',
  end_date: '',
  day_of_week: [],
  min_amount: '',
  max_discount: '',
  applicable_quantity: '',
  buy_quantity: '',
  get_quantity: '',
  get_discount_percentage: '',
  is_active: true,
  description: '',
  usage_limit: '',
  used_count: 0,
  customer_segment: 'all',
  minimum_products: '',
  stackable: false,
  priority: 0
};

// ─── Helpers ─────────────────────────
const formatMoney = (val) =>
  typeof val === 'number'
    ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : val;

const scheduleLabel = (d) => {
  if (d.schedule_type === 'date_range') {
    const from = d.start_date?.split('T')[0];
    const to = d.end_date?.split('T')[0];
    return from && to ? `${from} → ${to}` : from || to || 'Rango';
  }
  if (d.schedule_type === 'weekly_day') {
    const days = parseDays(d.day_of_week);
    return days.length ? days.map(n => DAY_NAMES[n]).join(', ') : 'Días';
  }
  return 'Siempre activo';
};

const getDiscountTypeIcon = (type) => {
  switch(type) {
    case 'percentage': return <FiPercent />;
    case 'fixed': return <FiDollarSign />;
    case 'buy_x_get_y': return <FiShoppingBag />;
    case 'bulk': return <FiUsers />;
    case 'coupon': return <FiAward />;
    default: return <FiPercent />;
  }
};

const getPromotionTypeLabel = (type) => {
  switch(type) {
    case 'flash_sale': return 'Venta Relámpago';
    case 'seasonal': return 'Temporada';
    case 'new_customer': return 'Nuevos Clientes';
    case 'loyalty': return 'Lealtad';
    case 'bundle': return 'Paquete';
    default: return 'General';
  }
};

const ScheduleIcon = ({ type }) => {
  if (type === 'date_range') return <FiCalendar />;
  if (type === 'weekly_day') return <FiRepeat />;
  return <FiClock />;
};

// ─── MODAL ─────────────────────────
function DiscountModal({ onClose, onSaved, discount = null }) {
  const [form, setForm] = useState(discount || EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesRes, productsRes] = await Promise.all([
          fetchWithAuth('/api/categories'),
          fetchWithAuth('/api/products?limit=100')
        ]);
        
        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(Array.isArray(data) ? data : []);
        }
        
        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Error cargando datos:', e);
      }
    };
    loadData();
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      day_of_week: f.day_of_week.includes(day)
        ? f.day_of_week.filter(d => d !== day)
        : [...f.day_of_week, day],
    }));
  };

  const toggleProduct = (productId) => {
    setForm(f => ({
      ...f,
      product_ids: f.product_ids.includes(productId)
        ? f.product_ids.filter(id => id !== productId)
        : [...f.product_ids, productId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!form.name || !form.value) {
      return setErr('Nombre y valor requeridos');
    }

    if (form.type === 'buy_x_get_y' && (!form.buy_quantity || !form.get_quantity)) {
      return setErr('Para promociones 2x1, especifica cantidades');
    }

    if (form.schedule_type === 'weekly_day' && !form.day_of_week.length) {
      return setErr('Selecciona al menos un día');
    }

    if (form.schedule_type === 'date_range' && (!form.start_date || !form.end_date)) {
      return setErr('Selecciona fechas de inicio y fin');
    }

    setSaving(true);
    setErr('');

    try {
      const payload = {
        ...form,
        value: parseFloat(form.value),
        min_amount: parseFloat(form.min_amount || 0),
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        day_of_week: Array.isArray(form.day_of_week) 
          ? form.day_of_week.join(',') 
          : form.day_of_week,
        product_ids: form.product_ids || [],
        buy_quantity: form.buy_quantity ? parseInt(form.buy_quantity) : null,
        get_quantity: form.get_quantity ? parseInt(form.get_quantity) : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        priority: parseInt(form.priority) || 0
      };

      const url = discount ? `/api/discounts/${discount.id}` : '/api/discounts';
      const method = discount ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar descuento');
      }

      onSaved();
      onClose();

    } catch (e) {
      setErr(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal modal-lg">

        <div className="modal-header">
          <div>
            <h2>{discount ? 'Editar Descuento' : 'Nuevo Descuento'}</h2>
            {discount && <small>ID: {discount.id}</small>}
          </div>
          <button type="button" onClick={onClose}><FiX /></button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Información Básica
          </button>
          <button 
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Programación
          </button>
          <button 
            className={`tab-btn ${activeTab === 'conditions' ? 'active' : ''}`}
            onClick={() => setActiveTab('conditions')}
          >
            Condiciones
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>

          {err && <div className="alert-error"><FiAlertCircle /> {err}</div>}

          {activeTab === 'basic' && (
            <>
              <div>
                <label className="label">Nombre del descuento *</label>
                <input 
                  className="input"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Ej: Descuento de fin de semana"
                  required
                />
              </div>

              <div>
                <label className="label">Descripción</label>
                <textarea 
                  className="input"
                  rows="2"
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Descripción de la promoción..."
                />
              </div>

              <div className="form-row">
                <div>
                  <label className="label">Tipo de descuento *</label>
                  <select 
                    className="select"
                    value={form.type}
                    onChange={e => set('type', e.target.value)}
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo ($)</option>
                    <option value="buy_x_get_y">Compra X, lleva Y</option>
                    <option value="bulk">Volumen/Mayoreo</option>
                    <option value="coupon">Cupón</option>
                  </select>
                </div>

                <div>
                  <label className="label">Valor *</label>
                  <input 
                    className="input" 
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.value}
                    onChange={e => set('value', e.target.value)}
                    placeholder={form.type === 'percentage' ? '10' : '5.00'}
                    required
                  />
                </div>
              </div>

              {form.type === 'buy_x_get_y' && (
                <div className="form-row">
                  <div>
                    <label className="label">Comprar (cantidad)</label>
                    <input 
                      className="input"
                      type="number"
                      min="1"
                      value={form.buy_quantity}
                      onChange={e => set('buy_quantity', e.target.value)}
                      placeholder="Ej: 2"
                    />
                  </div>
                  <div>
                    <label className="label">Llevar (cantidad)</label>
                    <input 
                      className="input"
                      type="number"
                      min="1"
                      value={form.get_quantity}
                      onChange={e => set('get_quantity', e.target.value)}
                      placeholder="Ej: 1"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="label">Tipo de promoción</label>
                <select 
                  className="select"
                  value={form.promotion_type}
                  onChange={e => set('promotion_type', e.target.value)}
                >
                  <option value="flash_sale">Venta Relámpago</option>
                  <option value="seasonal">Promoción de Temporada</option>
                  <option value="new_customer">Nuevos Clientes</option>
                  <option value="loyalty">Programa de Lealtad</option>
                  <option value="bundle">Paquete de Productos</option>
                </select>
              </div>

              <div>
                <label className="label">Aplicar a</label>
                <select 
                  className="select"
                  value={form.category_id || ''}
                  onChange={e => set('category_id', e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {products.length > 0 && (
                <div>
                  <label className="label">Productos específicos (opcional)</label>
                  <div className="products-select">
                    {products.slice(0, 10).map(product => (
                      <label key={product.id} className="product-checkbox">
                        <input
                          type="checkbox"
                          checked={form.product_ids.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                        />
                        {product.name}
                      </label>
                    ))}
                    {products.length > 10 && (
                      <small>+{products.length - 10} productos más...</small>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'schedule' && (
            <>
              <div>
                <label className="label">Programación</label>
                <select 
                  className="select"
                  value={form.schedule_type}
                  onChange={e => set('schedule_type', e.target.value)}
                >
                  <option value="always">Siempre activo</option>
                  <option value="weekly_day">Días específicos</option>
                  <option value="date_range">Rango de fechas</option>
                </select>
              </div>

              {form.schedule_type === 'weekly_day' && (
                <div>
                  <label className="label">Días de la semana</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DAYS.map(d => (
                      <button
                        key={d.value}
                        type="button"
                        className={`day-btn ${form.day_of_week.includes(d.value) ? 'active' : ''}`}
                        onClick={() => toggleDay(d.value)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.schedule_type === 'date_range' && (
                <div className="form-row">
                  <div>
                    <label className="label">Fecha inicio</label>
                    <input 
                      className="input" 
                      type="date"
                      value={form.start_date?.split('T')[0] || ''}
                      onChange={e => set('start_date', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Fecha fin</label>
                    <input 
                      className="input" 
                      type="date"
                      value={form.end_date?.split('T')[0] || ''}
                      onChange={e => set('end_date', e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'conditions' && (
            <>
              <div className="form-row">
                <div>
                  <label className="label">Monto mínimo de compra</label>
                  <input 
                    className="input" 
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.min_amount}
                    onChange={e => set('min_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="label">Descuento máximo</label>
                  <input 
                    className="input" 
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.max_discount}
                    onChange={e => set('max_discount', e.target.value)}
                    placeholder="Ej: 50.00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label className="label">Límite de usos</label>
                  <input 
                    className="input" 
                    type="number"
                    min="1"
                    value={form.usage_limit}
                    onChange={e => set('usage_limit', e.target.value)}
                    placeholder="Ilimitado"
                  />
                </div>

                <div>
                  <label className="label">Prioridad</label>
                  <input 
                    className="input" 
                    type="number"
                    min="0"
                    max="100"
                    value={form.priority}
                    onChange={e => set('priority', e.target.value)}
                    placeholder="0-100"
                  />
                </div>
              </div>

              <div>
                <label className="label">Segmento de clientes</label>
                <select 
                  className="select"
                  value={form.customer_segment}
                  onChange={e => set('customer_segment', e.target.value)}
                >
                  <option value="all">Todos los clientes</option>
                  <option value="new">Nuevos clientes</option>
                  <option value="frequent">Clientes frecuentes</option>
                  <option value="vip">Clientes VIP</option>
                </select>
              </div>

              <div className="form-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.stackable}
                    onChange={e => set('stackable', e.target.checked)}
                  />
                  Acumulable con otros descuentos
                </label>
              </div>

              <div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => set('is_active', e.target.checked)}
                  />
                  Activar descuento
                </label>
              </div>
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : discount ? 'Actualizar' : 'Guardar'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// ─── CARD ─────────────────────────
function DiscountCard({ d, onEdit, onDelete }) {
  const active = isDiscountActive(d);

  return (
    <div className={`discount-card ${!active ? 'inactive' : ''}`}>

      <div className="discount-header">
        <div className="discount-icon">
          {getDiscountTypeIcon(d.type)}
        </div>

        <div style={{ flex: 1 }}>
          <div className="discount-title">{d.name}</div>
          <div className="discount-type">
            {d.type === 'percentage' && `Porcentaje`}
            {d.type === 'fixed' && `Monto fijo`}
            {d.type === 'buy_x_get_y' && `Compra ${d.buy_quantity || 'X'}, lleva ${d.get_quantity || 'Y'}`}
            {d.type === 'bulk' && `Volumen`}
            {d.type === 'coupon' && `Cupón`}
            {d.promotion_type && ` • ${getPromotionTypeLabel(d.promotion_type)}`}
          </div>
        </div>

        <div className="discount-actions">
          <button 
            type="button"
            className="icon-btn" 
            onClick={() => onEdit(d)}
            title="Editar"
          >
            <FiEdit2 size={16} />
          </button>
          <button 
            type="button"
            className="icon-btn icon-btn-danger" 
            onClick={() => onDelete(d)}
            title="Eliminar"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>

      <div className="discount-value">
        {d.type === 'percentage' && `${d.value}%`}
        {d.type === 'fixed' && formatMoney(d.value)}
        {d.type === 'buy_x_get_y' && `2x1`}
        {d.type === 'bulk' && `${d.value}% volumen`}
        {d.type === 'coupon' && formatMoney(d.value)}
      </div>

      <div className="badge">
        <FiTag /> {d.category_name || 'Todas las categorías'}
      </div>

      <div className="discount-info">
        <ScheduleIcon type={d.schedule_type} />
        {scheduleLabel(d)}
      </div>

      {d.min_amount > 0 && (
        <div className="discount-info">
          Mínimo: {formatMoney(d.min_amount)}
        </div>
      )}

      {d.usage_limit && (
        <div className="discount-info">
          Usos: {d.used_count || 0}/{d.usage_limit}
        </div>
      )}

      <div className={`discount-status ${active ? 'status-active' : 'status-inactive'}`}>
        {active ? <CheckCircle size={16} /> : <XCircle size={16} />}
        {active ? 'Activo' : 'Inactivo'}
      </div>

    </div>
  );
}

// ─── MAIN ─────────────────────────
export default function PosDiscounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, inactive

  const load = async () => {
    setLoading(true);
    setErr('');

    try {
      const res = await fetchWithAuth('/api/discounts');
      
      if (!res.ok) {
        throw new Error('Error al cargar descuentos');
      }

      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando descuentos:', e);
      setErr(e.message || 'Error al cargar descuentos');
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setShowModal(true);
  };

  const handleDelete = async (discount) => {
    if (!window.confirm(`¿Eliminar el descuento "${discount.name}"? Esta acción no se puede deshacer.`)) return;

    try {
      const res = await fetchWithAuth(`/api/discounts/${discount.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      await load();
      alert('Descuento eliminado exitosamente');
    } catch (e) {
      alert(e.message || 'Error al eliminar descuento');
    }
  };

  const handleDuplicate = async (discount) => {
    const newName = `${discount.name} (Copia)`;
    if (!window.confirm(`¿Duplicar el descuento "${discount.name}"?`)) return;

    try {
      const duplicateData = {
        ...discount,
        name: newName,
        is_active: false,
        used_count: 0
      };
      delete duplicateData.id;

      const res = await fetchWithAuth('/api/discounts', {
        method: 'POST',
        body: JSON.stringify(duplicateData),
      });

      if (!res.ok) throw new Error('Error al duplicar');

      await load();
      alert('Descuento duplicado exitosamente');
    } catch (e) {
      alert(e.message || 'Error al duplicar descuento');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
  };

  const filteredDiscounts = discounts.filter(d => {
    if (filter === 'active') return isDiscountActive(d);
    if (filter === 'inactive') return !isDiscountActive(d);
    return true;
  });

  const stats = {
    total: discounts.length,
    active: discounts.filter(d => isDiscountActive(d)).length,
    inactive: discounts.filter(d => !isDiscountActive(d)).length
  };

  return (
    <>
      <PageTemplate
        title="Descuentos y Promociones"
        subtitle="Gestiona descuentos automáticos y promociones especiales para tus productos"
        loading={loading}
        headerAction={
          <div className="header-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setEditingDiscount(null);
                setShowModal(true);
              }}
            >
              <FiPlus /> Nueva Promoción
            </button>
            <button 
              className="btn btn-outline" 
              onClick={load}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? 'spin' : ''}/> Actualizar
            </button>
          </div>
        }
      >

        <div className="filters-bar">
          <div className="stats-badges">
            <span className="stat-badge">Total: {stats.total}</span>
            <span className="stat-badge success">Activos: {stats.active}</span>
            <span className="stat-badge danger">Inactivos: {stats.inactive}</span>
          </div>
          
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todos
            </button>
            <button 
              className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Activos
            </button>
            <button 
              className={`filter-btn ${filter === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilter('inactive')}
            >
              Inactivos
            </button>
          </div>
        </div>

        {err && <div className="alert-error"><FiAlertCircle /> {err}</div>}

        {!loading && filteredDiscounts.length === 0 && !err && (
          <div className="empty-state">
            <FiGift size={48} />
            <h3>No hay descuentos configurados</h3>
            <p>Crea tu primera promoción para aumentar las ventas</p>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
            >
              <FiPlus /> Crear Promoción
            </button>
          </div>
        )}

        {filteredDiscounts.length > 0 && (
          <div className="discount-grid">
            {filteredDiscounts.map(d => (
              <DiscountCard 
                key={d.id} 
                d={d} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}

      </PageTemplate>

      {showModal && (
        <DiscountModal
          discount={editingDiscount}
          onClose={handleCloseModal}
          onSaved={() => {
            load();
            handleCloseModal();
          }}
        />
      )}
    </>
  );
}