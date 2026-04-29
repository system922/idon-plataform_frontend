import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import {
  FiRefreshCw, FiPercent, FiDollarSign, FiPlus, FiX,
  FiCalendar, FiRepeat, FiClock, FiTag,
} from "react-icons/fi";
import { CheckCircle, XCircle } from "react-feather";
import { fetchWithAuth } from '../../config/apiBase';
import { DAY_NAMES, parseDays, isDiscountActive } from '../../utils/discountUtils';

// ─── Constantes ──────────────────────────────────────────────────────────────

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
  schedule_type: 'always',   // 'always' | 'date_range' | 'weekly_day'
  start_date: '',
  end_date: '',
  day_of_week: [],            // array de números 0-6
  min_amount: '',
  is_active: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(val) {
  return typeof val === 'number'
    ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : val;
}

function discountStyle(d) {
  if (!d.is_active || !isDiscountActive(d)) {
    return { label: 'INACTIVO', color: '#9ca3af', background: '#f3f4f6' };
  }
  if (d.type === 'percentage') {
    return { label: 'PORCENTAJE', color: '#059669', background: '#ecfdf5' };
  }
  return { label: 'MONTO FIJO', color: '#2563eb', background: '#eff6ff' };
}

function scheduleLabel(d) {
  if (d.schedule_type === 'date_range') {
    const from = d.start_date ? d.start_date.split('T')[0] : '';
    const to   = d.end_date   ? d.end_date.split('T')[0]   : '';
    if (from && to) return `${from} → ${to}`;
    if (from)       return `Desde ${from}`;
    if (to)         return `Hasta ${to}`;
    return 'Rango de fechas';
  }
  if (d.schedule_type === 'weekly_day') {
    const days = parseDays(d.day_of_week);
    if (!days.length) return 'Días específicos';
    return days.map(n => DAY_NAMES[n]).join(', ');
  }
  return 'Siempre activo';
}

function ScheduleIcon({ type, size = 13 }) {
  if (type === 'date_range') return <FiCalendar size={size} />;
  if (type === 'weekly_day') return <FiRepeat size={size} />;
  return <FiClock size={size} />;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function DiscountModal({ onClose, onSaved }) {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  useEffect(() => {
    fetchWithAuth('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      day_of_week: f.day_of_week.includes(day)
        ? f.day_of_week.filter(d => d !== day)
        : [...f.day_of_week, day].sort((a, b) => a - b),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.value) {
      setErr('Nombre y valor son obligatorios.');
      return;
    }
    if (form.schedule_type === 'weekly_day' && form.day_of_week.length === 0) {
      setErr('Selecciona al menos un día de la semana.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const body = {
        name:          form.name,
        type:          form.type,
        value:         parseFloat(form.value),
        category_id:   form.category_id ? Number(form.category_id) : null,
        applies_to:    form.category_id
          ? (categories.find(c => c.id === Number(form.category_id))?.name || 'categoría')
          : 'todos',
        schedule_type: form.schedule_type,
        start_date:    form.schedule_type === 'date_range' ? (form.start_date || null) : null,
        end_date:      form.schedule_type === 'date_range' ? (form.end_date   || null) : null,
        day_of_week:   form.schedule_type === 'weekly_day' ? form.day_of_week.join(',') : null,
        min_amount:    form.min_amount ? parseFloat(form.min_amount) : 0,
        is_active:     form.is_active,
      };
      const res = await fetchWithAuth('/pos/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error al guardar descuento.');
      }
      onSaved();
      onClose();
    } catch (error) {
      setErr(error.message || 'Error al guardar descuento.');
    } finally {
      setSaving(false);
    }
  };

  // Estilos internos del modal
  const inp = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg)', color: 'var(--color-text)',
    fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
  };
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: 'var(--color-text-muted)', marginBottom: 5, textTransform: 'uppercase',
  };
  const sectionTitle = {
    fontSize: 11, fontWeight: 800, color: 'var(--color-primary)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    marginTop: 4, marginBottom: 2,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 16, overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--color-card)', border: '1px solid var(--color-border)',
        borderRadius: 14, width: '100%', maxWidth: 500,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--color-card)', zIndex: 1,
        }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text)' }}>
            Nuevo Descuento
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', padding: 4,
          }}>
            <FiX size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {err && (
            <div style={{
              color: '#ef4444', background: '#ffe8e7', borderRadius: 7,
              padding: '8px 12px', fontSize: 13, fontWeight: 500,
            }}>
              {err}
            </div>
          )}

          {/* ── Datos básicos ── */}
          <div>
            <div style={sectionTitle}>Datos básicos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <div>
                <label style={lbl}>Nombre *</label>
                <input style={inp} value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Ej: Descuento de lunes" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Tipo *</label>
                  <select style={inp} value={form.type} onChange={e => set('type', e.target.value)}>
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Valor *</label>
                  <input style={inp} type="number" min="0" step="0.01"
                    value={form.value} onChange={e => set('value', e.target.value)}
                    placeholder={form.type === 'percentage' ? 'Ej: 10' : 'Ej: 5.00'} required />
                </div>
              </div>

              <div>
                <label style={lbl}>Monto mínimo de compra</label>
                <input style={inp} type="number" min="0" step="0.01"
                  value={form.min_amount} onChange={e => set('min_amount', e.target.value)}
                  placeholder="0.00 (sin mínimo)" />
              </div>
            </div>
          </div>

          {/* ── Categoría ── */}
          <div>
            <div style={sectionTitle}>¿A qué productos aplica?</div>
            <div style={{ marginTop: 8 }}>
              <label style={lbl}>Categoría</label>
              <select style={inp} value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                <option value="">Todos los productos</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Si no seleccionas una categoría, el descuento aplica a todos los productos.
              </div>
            </div>
          </div>

          {/* ── Vigencia ── */}
          <div>
            <div style={sectionTitle}>¿Cuándo aplica?</div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Selector de tipo */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { value: 'always',     label: 'Siempre',           icon: <FiClock size={13} /> },
                  { value: 'date_range', label: 'Rango de fechas',   icon: <FiCalendar size={13} /> },
                  { value: 'weekly_day', label: 'Días de semana',    icon: <FiRepeat size={13} /> },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => set('schedule_type', opt.value)}
                    style={{
                      padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                      border: form.schedule_type === opt.value
                        ? '2px solid var(--color-primary)'
                        : '1.5px solid var(--color-border)',
                      background: form.schedule_type === opt.value
                        ? 'var(--color-primary)18'
                        : 'transparent',
                      color: form.schedule_type === opt.value
                        ? 'var(--color-primary)'
                        : 'var(--color-text-muted)',
                    }}>
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>

              {/* Rango de fechas */}
              {form.schedule_type === 'date_range' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Fecha inicio</label>
                    <input style={inp} type="date" value={form.start_date}
                      onChange={e => set('start_date', e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Fecha fin</label>
                    <input style={inp} type="date" value={form.end_date}
                      onChange={e => set('end_date', e.target.value)} />
                  </div>
                </div>
              )}

              {/* Días de semana */}
              {form.schedule_type === 'weekly_day' && (
                <div>
                  <label style={lbl}>Días en que aplica *</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {DAYS.map(d => {
                      const active = form.day_of_week.includes(d.value);
                      return (
                        <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                          style={{
                            width: 40, height: 40, borderRadius: '50%', fontSize: 11,
                            fontWeight: 700, cursor: 'pointer',
                            border: active ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                            background: active ? 'var(--color-primary)' : 'transparent',
                            color: active ? 'white' : 'var(--color-text-muted)',
                          }}>
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  {form.day_of_week.length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>
                      Aplica cada: {form.day_of_week.map(n => DAY_NAMES[n]).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Estado ── */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.is_active}
              onChange={e => set('is_active', e.target.checked)} />
            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Descuento activo</span>
          </label>

          {/* ── Botones ── */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4, borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={onClose} disabled={saving} style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--color-border)',
              background: 'transparent', color: 'var(--color-text-muted)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{
              flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
              background: 'var(--color-primary)', color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Guardando...' : 'Guardar descuento'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// ─── Card de descuento ────────────────────────────────────────────────────────

function DiscountCard({ d }) {
  const style   = discountStyle(d);
  const active  = isDiscountActive(d);
  const schLabel = scheduleLabel(d);

  return (
    <div style={{
      background: active ? style.background : '#f9fafb',
      border: `1.6px solid ${active ? style.color : '#e5e7eb'}22`,
      borderRadius: 12, padding: 20,
      boxShadow: '0 1px 7px #4442',
      display: 'flex', flexDirection: 'column', gap: 10,
      opacity: active ? 1 : 0.75,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: active ? style.color : '#9ca3af', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {d.type === 'percentage' ? <FiPercent size={18} /> : <FiDollarSign size={18} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: style.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {d.name}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{style.label}</div>
        </div>
      </div>

      {/* Valor */}
      <div style={{ fontSize: 26, fontWeight: 900, color: style.color, lineHeight: 1 }}>
        {d.type === 'percentage' ? `${d.value}%` : formatMoney(d.value)}
        <span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginLeft: 6 }}>de descuento</span>
      </div>

      {/* Categoría */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: '#f3f4f6', borderRadius: 20, padding: '3px 10px',
        fontSize: 12, fontWeight: 600, color: '#374151', alignSelf: 'flex-start',
      }}>
        <FiTag size={11} />
        {d.category_name || (d.category_id ? `Cat. #${d.category_id}` : 'Todos los productos')}
      </div>

      {/* Vigencia */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: '#6b7280',
      }}>
        <ScheduleIcon type={d.schedule_type} size={12} />
        <span>{schLabel}</span>
      </div>

      {/* Monto mínimo */}
      {d.min_amount > 0 && (
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          Mínimo: {formatMoney(d.min_amount)}
        </div>
      )}

      {/* Estado */}
      <div style={{
        marginTop: 2, display: 'flex', alignItems: 'center', gap: 6,
        fontWeight: 700, fontSize: 13,
        color: active ? '#059669' : '#dc2626',
      }}>
        {active ? <CheckCircle size={15} /> : <XCircle size={15} />}
        {active ? 'Activo ahora' : (d.is_active ? 'Fuera de horario' : 'Inactivo')}
      </div>

    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PosDiscounts() {
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('idonUser') || '{}'); }
    catch { return {}; }
  })();
  const isOwner = storedUser?.role === 'owner' || storedUser?.userType === 'owner';

  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');
  const [showModal, setShowModal] = useState(false);

  const loadDiscounts = async () => {
    setLoading(true); setErr('');
    try {
      const res  = await fetchWithAuth('/pos/discounts');
      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (error) {
      setDiscounts([]);
      setErr(error.message || 'Error al cargar descuentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDiscounts(); }, []);

  const headerAction = (
    <div style={{ display: 'flex', gap: 8 }}>
      {isOwner && (
        <button onClick={() => setShowModal(true)} style={{
          padding: '8px 14px', background: 'var(--color-primary)', color: 'white',
          border: 'none', borderRadius: 6, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13,
        }}>
          <FiPlus size={14} /> Nuevo Descuento
        </button>
      )}
      <button onClick={loadDiscounts} disabled={loading} style={{
        padding: '8px 12px', background: 'transparent',
        color: 'var(--color-text-muted)', border: '1px solid var(--color-border)',
        borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.6 : 1,
      }}>
        <FiRefreshCw size={14} className={loading ? 'spin' : ''} /> Actualizar
      </button>
    </div>
  );

  return (
    <>
      <PageTemplate
        title="Descuentos POS"
        subtitle={isOwner
          ? 'Gestión de descuentos automáticos aplicables al cobrar'
          : 'Visualización de descuentos disponibles'}
        theme="business"
        loading={loading}
        headerAction={headerAction}
      >
        {err && (
          <div style={{
            color: '#ef4444', margin: '12px 0 18px', padding: 10,
            background: '#ffe8e7', borderRadius: 6, fontWeight: 500,
          }}>
            {err}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 18,
        }}>
          {discounts.length === 0 && !loading
            ? (
              <div style={{
                background: 'var(--color-card)', color: 'var(--color-text-muted)',
                border: '1px solid var(--color-border)', borderRadius: 8,
                padding: 30, textAlign: 'center', gridColumn: '1/-1',
              }}>
                No hay descuentos registrados.
              </div>
            )
            : discounts.map((d, idx) => (
              <DiscountCard key={d.id || idx} d={d} />
            ))
          }
        </div>
      </PageTemplate>

      {showModal && (
        <DiscountModal
          onClose={() => setShowModal(false)}
          onSaved={loadDiscounts}
        />
      )}
    </>
  );
}
