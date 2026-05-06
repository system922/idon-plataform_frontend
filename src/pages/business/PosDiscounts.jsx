import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import {
  FiRefreshCw, FiPercent, FiDollarSign, FiPlus, FiX,
  FiCalendar, FiRepeat, FiClock, FiTag, FiEdit2, FiTrash2,
  FiGift, FiUsers, FiShoppingBag, FiAward,
  FiAlertCircle, FiCopy, FiChevronDown, FiChevronUp
} from "react-icons/fi";
import { CheckCircle, XCircle } from "react-feather";
import { fetchWithAuth } from '../../config/apiBase';
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

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const EMPTY_FORM = {
  name: '',
  description: '',
  type: 'percentage',
  value: '',
  applies_to: 'order',
  category_id: '',
  product_id: '',
  min_amount: '',
  max_discount: '',
  min_quantity: 1,
  code: '',
  usage_limit: '',
  days_of_week: [],
  start_time: '',
  end_time: '',
  start_date: '',
  end_date: '',
  stackable: false,
  priority: 0,
  customer_segment: 'all',
  is_active: true
};

// ─── Helpers ─────────────────────────
const formatMoney = (val) =>
  typeof val === 'number'
    ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : val;

const parseDays = (daysStr) => {
  if (!daysStr) return [];
  if (Array.isArray(daysStr)) return daysStr;
  return daysStr.split(',').map(Number);
};

const isDiscountActive = (discount) => {
  if (!discount.is_active) return false;
  
  const now = new Date();
  
  if (discount.start_date && new Date(discount.start_date) > now) return false;
  if (discount.end_date && new Date(discount.end_date) < now) return false;
  
  if (discount.days_of_week && discount.days_of_week.length > 0) {
    const currentDay = now.getDay();
    const days = parseDays(discount.days_of_week);
    if (!days.includes(currentDay)) return false;
  }
  
  if (discount.start_time && discount.end_time) {
    const currentTime = now.toTimeString().slice(0, 5);
    if (currentTime < discount.start_time || currentTime > discount.end_time) return false;
  }
  
  return true;
};

const scheduleLabel = (d) => {
  if (d.start_date && d.end_date) {
    const from = new Date(d.start_date).toLocaleDateString();
    const to = new Date(d.end_date).toLocaleDateString();
    return `${from} → ${to}`;
  }
  if (d.days_of_week && d.days_of_week.length > 0) {
    const days = parseDays(d.days_of_week);
    return days.map(n => DAY_NAMES[n]).join(', ');
  }
  if (d.start_time && d.end_time) {
    return `${d.start_time} - ${d.end_time}`;
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

const ScheduleIcon = ({ discount }) => {
  if (discount?.start_date && discount?.end_date) return <FiCalendar />;
  if (discount?.days_of_week?.length > 0) return <FiRepeat />;
  if (discount?.start_time) return <FiClock />;
  return <FiClock />;
};

// ─── COMPONENTE DE AYUDA DESPLEGABLE ─────────────────────────
// ─── COMPONENTE DE AYUDA DESPLEGABLE (con estilos en línea visibles) ─────────
const CollapsibleHelp = ({ tab }) => {
  const [isOpen, setIsOpen] = useState(false);

  const helps = {
    basic: (
      <ul style={{ marginTop: '6px', marginBottom: 0, paddingLeft: '20px', color: '#004d40' }}>
        <li>✏️ <strong>Nombre</strong>: Pon un nombre claro, ej. "20% off los viernes".</li>
        <li>🎯 <strong>Tipo</strong>: Porcentaje, monto fijo, cupón, etc.</li>
        <li>💰 <strong>Valor</strong>: 20 para 20% o 5.00 para $5 fijo.</li>
        <li>📦 <strong>Aplicar a</strong>: ¿Toda la orden, solo un producto o una categoría?</li>
        <li>🔑 <strong>Código de cupón</strong>: Solo si elegiste "Cupón" (el cliente lo ingresará).</li>
      </ul>
    ),
    schedule: (
      <ul style={{ marginTop: '6px', marginBottom: 0, paddingLeft: '20px', color: '#004d40' }}>
        <li>📅 <strong>Días</strong>: Selecciona los días. Vacío = todos.</li>
        <li>⏰ <strong>Horas</strong>: Rango horario (ej. 14:00 a 18:00). Vacío = todo el día.</li>
        <li>📆 <strong>Fechas</strong>: Rango de fechas. Vacío = sin límite.</li>
        <li>✨ <strong>Si todo vacío</strong>: la promoción aplica siempre (24/7 todos los días).</li>
      </ul>
    ),
    conditions: (
      <ul style={{ marginTop: '6px', marginBottom: 0, paddingLeft: '20px', color: '#004d40' }}>
        <li>💵 <strong>Monto mínimo</strong>: Ej. 30.00 (solo si la compra supera $30).</li>
        <li>🔝 <strong>Descuento máximo</strong>: Límite del descuento (ej. máximo $10).</li>
        <li>🔢 <strong>Cantidad mínima</strong>: Unidades que debe llevar.</li>
        <li>🔄 <strong>Límite de usos</strong>: Número total de veces que puede usarse.</li>
        <li>⭐ <strong>Prioridad</strong>: Número más alto = se aplica primero.</li>
        <li>🧩 <strong>Acumulable</strong>: Si se puede combinar con otros descuentos.</li>
        <li>✅ <strong>Activar descuento</strong>: <strong>Debe estar marcado</strong> para que funcione.</li>
      </ul>
    )
  };

  const titles = {
    basic: '📘 Consejos para Información Básica',
    schedule: '📘 Consejos para Programación',
    conditions: '📘 Consejos para Condiciones'
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#3b4b5e',
          border: '1px solid #5a6e82',
          borderRadius: '6px',
          padding: '8px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: '500',
          color: '#ffffff',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#4a5e72'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#3b4b5e'}
      >
        {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        {isOpen ? 'Ocultar consejos' : 'Mostrar consejos'}
      </button>
      {isOpen && (
        <div style={{
          background: '#e6f7ff',
          padding: '12px 16px',
          borderRadius: '8px',
          marginTop: '8px',
          borderLeft: '4px solid #1890ff',
          fontSize: '13px',
          color: '#003366',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#0050b3' }}>{titles[tab]}</strong>
          {helps[tab]}
        </div>
      )}
    </div>
  );
};

// ─── MODAL ─────────────────────────
function DiscountModal({ onClose, onSaved, discount = null }) {
  const [form, setForm] = useState(() => {
    if (discount) {
      return {
        ...EMPTY_FORM,
        ...discount,
        days_of_week: parseDays(discount.days_of_week),
        product_id: discount.product_id || '',
        category_id: discount.category_id || ''
      };
    }
    return EMPTY_FORM;
  });
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
          fetchWithAuth('/api/products')
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

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.value) {
      return setErr('Nombre y valor requeridos');
    }

    setSaving(true);
    setErr('');

    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: form.type,
        value: parseFloat(form.value),
        applies_to: form.applies_to,
        product_id: form.product_id || null,
        category_id: form.category_id || null,
        min_amount: parseFloat(form.min_amount || 0),
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        min_quantity: parseInt(form.min_quantity) || 1,
        code: form.code || null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        days_of_week: form.days_of_week.length ? form.days_of_week : null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        stackable: form.stackable,
        priority: parseInt(form.priority) || 0,
        customer_segment: form.customer_segment,
        is_active: form.is_active
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
          
          {/* Ayuda desplegable contextual */}
          <CollapsibleHelp tab={activeTab} />

          {activeTab === 'basic' && (
            <>
              <div>
                <label className="label">Nombre del descuento *</label>
                <input 
                  className="input"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="Ej: Descuento de fin de semana"
                  required
                />
              </div>

              <div>
                <label className="label">Descripción</label>
                <textarea 
                  className="input"
                  rows="2"
                  value={form.description || ''}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Descripción de la promoción..."
                />
              </div>

              <div className="form-row">
                <div>
                  <label className="label">Tipo de descuento *</label>
                  <select 
                    className="select"
                    value={form.type}
                    onChange={e => setField('type', e.target.value)}
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
                    onChange={e => setField('value', e.target.value)}
                    placeholder={form.type === 'percentage' ? '10' : '5.00'}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Aplicar a</label>
                <select 
                  className="select"
                  value={form.applies_to}
                  onChange={e => setField('applies_to', e.target.value)}
                >
                  <option value="order">Toda la orden</option>
                  <option value="product">Producto específico</option>
                  <option value="category">Categoría específica</option>
                </select>
              </div>

              {form.applies_to === 'product' && (
                <div>
                  <label className="label">Producto</label>
                  <select 
                    className="select"
                    value={form.product_id || ''}
                    onChange={e => setField('product_id', e.target.value)}
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map(prod => (
                      <option key={prod.id} value={prod.id}>{prod.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.applies_to === 'category' && (
                <div>
                  <label className="label">Categoría</label>
                  <select 
                    className="select"
                    value={form.category_id || ''}
                    onChange={e => setField('category_id', e.target.value)}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.type === 'coupon' && (
                <div>
                  <label className="label">Código de cupón</label>
                  <input 
                    className="input"
                    value={form.code || ''}
                    onChange={e => setField('code', e.target.value.toUpperCase())}
                    placeholder="EJ: DESCUENTO10"
                  />
                </div>
              )}
            </>
          )}

          {activeTab === 'schedule' && (
            <>
              <div>
                <label className="label">Días de la semana</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DAYS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      className={`day-btn ${form.days_of_week.includes(d.value) ? 'active' : ''}`}
                      onClick={() => toggleDay(d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <small className="help-text">Dejar vacío para todos los días</small>
              </div>

              <div className="form-row">
                <div>
                  <label className="label">Hora inicio</label>
                  <input 
                    className="input" 
                    type="time"
                    value={form.start_time || ''}
                    onChange={e => setField('start_time', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Hora fin</label>
                  <input 
                    className="input" 
                    type="time"
                    value={form.end_time || ''}
                    onChange={e => setField('end_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label className="label">Fecha inicio</label>
                  <input 
                    className="input" 
                    type="date"
                    value={form.start_date?.split('T')[0] || ''}
                    onChange={e => setField('start_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Fecha fin</label>
                  <input 
                    className="input" 
                    type="date"
                    value={form.end_date?.split('T')[0] || ''}
                    onChange={e => setField('end_date', e.target.value)}
                  />
                </div>
              </div>
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
                    onChange={e => setField('min_amount', e.target.value)}
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
                    value={form.max_discount || ''}
                    onChange={e => setField('max_discount', e.target.value)}
                    placeholder="Ej: 50.00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label className="label">Cantidad mínima</label>
                  <input 
                    className="input" 
                    type="number"
                    min="1"
                    value={form.min_quantity}
                    onChange={e => setField('min_quantity', e.target.value)}
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="label">Límite de usos</label>
                  <input 
                    className="input" 
                    type="number"
                    min="1"
                    value={form.usage_limit || ''}
                    onChange={e => setField('usage_limit', e.target.value)}
                    placeholder="Ilimitado"
                  />
                </div>
              </div>

              <div>
                <label className="label">Prioridad</label>
                <input 
                  className="input" 
                  type="number"
                  min="0"
                  max="100"
                  value={form.priority}
                  onChange={e => setField('priority', e.target.value)}
                  placeholder="0-100 (mayor = más prioritario)"
                />
              </div>

              <div>
                <label className="label">Segmento de clientes</label>
                <select 
                  className="select"
                  value={form.customer_segment}
                  onChange={e => setField('customer_segment', e.target.value)}
                >
                  <option value="all">Todos los clientes</option>
                  <option value="new">Nuevos clientes</option>
                  <option value="frequent">Clientes frecuentes</option>
                  <option value="vip">Clientes VIP</option>
                </select>
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.stackable}
                    onChange={e => setField('stackable', e.target.checked)}
                  />
                  Acumulable con otros descuentos
                </label>
              </div>

              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setField('is_active', e.target.checked)}
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
function DiscountCard({ d, onEdit, onDelete, onDuplicate }) {
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
            {d.type === 'percentage' && `Porcentaje - ${d.value}%`}
            {d.type === 'fixed' && `Monto fijo - ${formatMoney(d.value)}`}
            {d.type === 'buy_x_get_y' && `Compra ${d.min_quantity || 'X'}, lleva gratis`}
            {d.type === 'bulk' && `Volumen - ${d.value}%`}
            {d.type === 'coupon' && `Cupón - ${d.code || 'Sin código'}`}
          </div>
        </div>

        <div className="discount-actions">
          <button 
            type="button"
            className="icon-btn" 
            onClick={() => onDuplicate(d)}
            title="Duplicar"
          >
            <FiCopy size={16} />
          </button>
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
        {d.type === 'percentage' && `${d.value}% OFF`}
        {d.type === 'fixed' && formatMoney(d.value)}
        {d.type === 'buy_x_get_y' && `2x1`}
        {d.type === 'bulk' && `${d.value}% volumen`}
        {d.type === 'coupon' && formatMoney(d.value)}
      </div>

      <div className="badge">
        <FiTag /> {d.category_name || d.product_name || 'Todas las categorías'}
      </div>

      <div className="discount-info">
        <ScheduleIcon discount={d} />
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
  const [filter, setFilter] = useState('all');

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
      const res = await fetchWithAuth(`/api/discounts/${discount.id}?hard_delete=true`, {
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
        name: newName,
        description: discount.description,
        type: discount.type,
        value: discount.value,
        applies_to: discount.applies_to || 'order',
        product_id: discount.product_id,
        category_id: discount.category_id,
        min_amount: discount.min_amount,
        max_discount: discount.max_discount,
        min_quantity: discount.min_quantity || 1,
        code: discount.code,
        usage_limit: discount.usage_limit,
        days_of_week: discount.days_of_week,
        start_time: discount.start_time,
        end_time: discount.end_time,
        start_date: discount.start_date,
        end_date: discount.end_date,
        stackable: discount.stackable,
        priority: discount.priority,
        customer_segment: discount.customer_segment || 'all',
        is_active: false
      };

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