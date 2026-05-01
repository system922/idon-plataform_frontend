import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import {
  FiRefreshCw, FiPercent, FiDollarSign, FiPlus, FiX,
  FiCalendar, FiRepeat, FiClock, FiTag, FiEdit2, FiTrash2,
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

const EMPTY_FORM = {
  name: '',
  type: 'percentage',
  value: '',
  category_id: '',
  schedule_type: 'always',
  start_date: '',
  end_date: '',
  day_of_week: [],
  min_amount: '',
  is_active: true,
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

const ScheduleIcon = ({ type }) => {
  if (type === 'date_range') return <FiCalendar />;
  if (type === 'weekly_day') return <FiRepeat />;
  return <FiClock />;
};

// ─── MODAL ─────────────────────────
function DiscountModal({ onClose, onSaved, discount = null }) {
  const [form, setForm] = useState(discount || EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchWithAuth('/api/categories');
        if (!res.ok) throw new Error('Error al cargar categorías');
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error cargando categorías:', e);
        setCategories([]);
      }
    };
    loadCategories();
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.value) {
      return setErr('Nombre y valor requeridos');
    }

    if (form.schedule_type === 'weekly_day' && !form.day_of_week.length) {
      return setErr('Selecciona al menos un día');
    }

    setSaving(true);
    setErr('');

    try {
      const payload = {
        ...form,
        value: parseFloat(form.value),
        min_amount: parseFloat(form.min_amount || 0),
        day_of_week: Array.isArray(form.day_of_week) 
          ? form.day_of_week.join(',') 
          : form.day_of_week,
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
      <div className="modal">

        <div className="modal-header">
          {discount ? 'Editar Descuento' : 'Nuevo Descuento'}
          <button type="button" onClick={onClose}><FiX /></button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>

          {err && <div className="alert-error">{err}</div>}

          <div>
            <label className="label">Nombre del descuento</label>
            <input 
              className="input"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ej: Descuento de fin de semana"
              required
            />
          </div>

          <div className="form-row">
            <div>
              <label className="label">Tipo</label>
              <select 
                className="select"
                value={form.type}
                onChange={e => set('type', e.target.value)}
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
              </select>
            </div>

            <div>
              <label className="label">Valor</label>
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

          <div>
            <label className="label">Categoría (opcional)</label>
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

          <div>
            <label className="label">Monto mínimo (opcional)</label>
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
          {d.type === 'percentage' ? <FiPercent /> : <FiDollarSign />}
        </div>

        <div style={{ flex: 1 }}>
          <div className="discount-title">{d.name}</div>
          <div className="discount-type">
            {d.type === 'percentage' ? 'Porcentaje' : 'Monto fijo'}
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
        {d.type === 'percentage' ? `${d.value}%` : formatMoney(d.value)}
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
    if (!window.confirm(`¿Eliminar el descuento "${discount.name}"?`)) return;

    try {
      const res = await fetchWithAuth(`/api/discounts/${discount.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      load();
    } catch (e) {
      alert(e.message || 'Error al eliminar descuento');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
  };

  return (
    <>
      <PageTemplate
        title="Descuentos POS"
        subtitle="Gestiona descuentos automáticos para tus productos"
        loading={loading}
        headerAction={
          <>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setEditingDiscount(null);
                setShowModal(true);
              }}
            >
              <FiPlus /> Nuevo Descuento
            </button>
            <button 
              className="btn btn-outline" 
              onClick={load}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? 'spin' : ''}/> Actualizar
            </button>
          </>
        }
      >

        {err && <div className="alert-error">{err}</div>}

        {!loading && discounts.length === 0 && !err && (
          <div className="empty-state">
            <FiPercent size={48} />
            <h3>No hay descuentos configurados</h3>
            <p>Crea tu primer descuento para comenzar</p>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
            >
              <FiPlus /> Crear Descuento
            </button>
          </div>
        )}

        {discounts.length > 0 && (
          <div className="discount-grid">
            {discounts.map(d => (
              <DiscountCard 
                key={d.id} 
                d={d} 
                onEdit={handleEdit}
                onDelete={handleDelete}
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