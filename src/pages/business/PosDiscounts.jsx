import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import {
  FiRefreshCw, FiPercent, FiDollarSign, FiPlus, FiX,
  FiCalendar, FiRepeat, FiClock, FiTag,
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
function DiscountModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchWithAuth('/api/categories')
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {});
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
      const res = await fetchWithAuth('/pos/discounts', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          value: parseFloat(form.value),
          min_amount: parseFloat(form.min_amount || 0),
          day_of_week: form.day_of_week.join(','),
        }),
      });

      if (!res.ok) throw new Error('Error al guardar');

      onSaved();
      onClose();

    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">

        <div className="modal-header">
          Nuevo Descuento
          <button onClick={onClose}><FiX /></button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>

          {err && <div className="alert-error">{err}</div>}

          <div>
            <label className="label">Nombre</label>
            <input className="input"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Tipo</label>
            <select className="select"
              value={form.type}
              onChange={e => set('type', e.target.value)}
            >
              <option value="percentage">%</option>
              <option value="fixed">$</option>
            </select>
          </div>

          <div>
            <label className="label">Valor</label>
            <input className="input" type="number"
              value={form.value}
              onChange={e => set('value', e.target.value)}
            />
          </div>

          <div>
            <label className="label">Días</label>
            <div style={{ display: 'flex', gap: 6 }}>
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

          <button className="btn btn-primary">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>

        </form>
      </div>
    </div>
  );
}

// ─── CARD ─────────────────────────
function DiscountCard({ d }) {
  const active = isDiscountActive(d);

  return (
    <div className={`discount-card ${!active ? 'inactive' : ''}`}>

      <div className="discount-header">
        <div className="discount-icon">
          {d.type === 'percentage' ? <FiPercent /> : <FiDollarSign />}
        </div>

        <div>
          <div className="discount-title">{d.name}</div>
          <div className="discount-type">{d.type}</div>
        </div>
      </div>

      <div className="discount-value">
        {d.type === 'percentage' ? `${d.value}%` : formatMoney(d.value)}
      </div>

      <div className="badge">
        <FiTag /> {d.category_name || 'Todos'}
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
        {active ? <CheckCircle /> : <XCircle />}
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

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/pos/discounts');
      setDiscounts(await res.json());
    } catch (e) {
      setErr('Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <PageTemplate
        title="Descuentos POS"
        loading={loading}
        headerAction={
          <>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <FiPlus /> Nuevo
            </button>
            <button className="btn btn-outline" onClick={load}>
              <FiRefreshCw className={loading ? 'spin' : ''}/> Refresh
            </button>
          </>
        }
      >

        {err && <div className="alert-error">{err}</div>}

        <div className="discount-grid">
          {discounts.length === 0
            ? <div className="empty-state">Sin descuentos</div>
            : discounts.map(d => <DiscountCard key={d.id} d={d} />)
          }
        </div>

      </PageTemplate>

      {showModal && (
        <DiscountModal
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </>
  );
}
