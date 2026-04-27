import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { Plus, Edit2, Trash2, X, Search, RefreshCw, ArrowUp, ArrowDown, Sliders } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';

const EMPTY = { product_id: '', type: 'entrada', quantity: '', unit_cost: '', notes: '' };

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
        letterSpacing: 0.5, marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.3)', color: '#fff',
  fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
};
const btnPrimary = {
  padding: '10px 22px', background: '#6842fe', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
};
const btnSecondary = {
  padding: '10px 22px', background: 'transparent', color: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
  cursor: 'pointer', fontWeight: 600, fontSize: 13,
};

function AdjustmentModal({ products, onClose, onSave, saving }) {
  const [form, setForm] = useState({ ...EMPTY });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canSave = form.product_id && form.type && Number(form.quantity) > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: 'linear-gradient(135deg,#1a1f2a 0%,#141920 100%)',
        border: '1px solid rgba(104,66,254,0.25)', borderRadius: 16,
        width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>
              Nuevo ajuste de inventario
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Entrada o salida manual de stock
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', padding: 4,
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Producto *">
            <select value={form.product_id} onChange={e => set('product_id', e.target.value)} style={inputStyle}>
              <option value="">Seleccionar producto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.code ? `(${p.code})` : ''} — stock: {p.stock}
                </option>
              ))}
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Tipo *">
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
                <option value="entrada">Entrada (+)</option>
                <option value="salida">Salida (−)</option>
                <option value="adjustment">Ajuste</option>
              </select>
            </Field>
            <Field label="Cantidad *">
              <input
                type="number" min="1"
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                placeholder="0" style={inputStyle}
              />
            </Field>
            <Field label="Costo unitario">
              <input
                type="number" step="0.01" min="0"
                value={form.unit_cost}
                onChange={e => set('unit_cost', e.target.value)}
                placeholder="0.00" style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Notas / Motivo">
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2} placeholder="Ej: Recepción de proveedor, consumo interno..."
              style={{ ...inputStyle, height: 'auto', resize: 'vertical' }}
            />
          </Field>
        </div>

        {/* Footer */}
        <div style={{
          padding: '18px 28px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
        }}>
          <button onClick={onClose} disabled={saving} style={btnSecondary}>
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !canSave}
            style={{ ...btnPrimary, opacity: !canSave ? 0.5 : 1 }}
          >
            {saving ? 'Guardando...' : 'Registrar ajuste'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TYPE_LABEL = { entrada: 'Entrada', salida: 'Salida', adjustment: 'Ajuste' };
const TYPE_COLOR = {
  entrada:    { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  salida:     { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
  adjustment: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
};

export default function InventoryAdjustmentsPage() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [mv, pr] = await Promise.all([
        fetchWithAuth('/api/inventory/movements'),
        fetchWithAuth('/api/products'),
      ]);
      if (!mv.ok) throw new Error('Error al cargar movimientos');
      const [mvData, prData] = await Promise.all([mv.json(), pr.json()]);
      setMovements(Array.isArray(mvData) ? mvData : []);
      setProducts(Array.isArray(prData) ? prData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    try {
      setSaving(true);
      const res = await fetchWithAuth('/api/inventory/movements', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      await load();
      setShowModal(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = movements.filter(m =>
    (m.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.product_code || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.notes        || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total movimientos', value: movements.length,                                       color: '#6842fe' },
    { label: 'Entradas',          value: movements.filter(m => m.type === 'entrada').length,     color: '#10b981' },
    { label: 'Salidas',           value: movements.filter(m => m.type === 'salida').length,      color: '#ef4444' },
    { label: 'Ajustes',           value: movements.filter(m => m.type === 'adjustment').length,  color: '#f59e0b' },
  ];

  const headerAction = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)',
        }} />
        <input
          type="text" placeholder="Buscar producto o nota..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            padding: '9px 12px 9px 32px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.9)',
            fontSize: 13, width: 240,
          }}
        />
      </div>
      <button onClick={load} title="Recargar" style={{ ...btnSecondary, padding: '9px 12px' }}>
        <RefreshCw size={14} />
      </button>
      <button
        onClick={() => setShowModal(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, ...btnPrimary, padding: '9px 18px' }}
      >
        <Plus size={15} /> Nuevo ajuste
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Ajustes de Inventario"
      subtitle="Movimientos manuales de entrada y salida de stock"
      headerAction={headerAction}
      loading={loading}
      error={error}
      onRetry={load}
    >
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '12px 20px', minWidth: 130,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{
                background: 'rgba(104,66,254,0.12)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                {['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Costo unit.', 'Notas'].map(h => (
                  <th key={h} style={{
                    padding: '12px 14px', textAlign: 'left', fontSize: 11,
                    fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{
                    textAlign: 'center', padding: 40,
                    color: 'rgba(255,255,255,0.3)', fontSize: 14,
                  }}>
                    <Sliders size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                    {search ? 'Sin resultados para esa búsqueda' : 'No hay movimientos registrados'}
                  </td>
                </tr>
              )}
              {filtered.map((m, idx) => {
                const tc = TYPE_COLOR[m.type] || TYPE_COLOR.adjustment;
                const isEntrada = m.type === 'entrada';
                const isSalida  = m.type === 'salida';
                return (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(104,66,254,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                  >
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {m.created_at ? new Date(m.created_at).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#fff', fontWeight: 600 }}>
                      {m.product_name || <span style={{ color: 'rgba(255,255,255,0.3)' }}>Producto eliminado</span>}
                      {m.product_code && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
                          {m.product_code}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: tc.bg, color: tc.color,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        {isEntrada && <ArrowUp size={10} />}
                        {isSalida  && <ArrowDown size={10} />}
                        {TYPE_LABEL[m.type] || m.type}
                      </span>
                    </td>
                    <td style={{
                      padding: '11px 14px', fontWeight: 800,
                      color: isEntrada ? '#10b981' : isSalida ? '#ef4444' : '#f59e0b',
                    }}>
                      {isEntrada ? '+' : isSalida ? '−' : ''}{m.quantity}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.6)' }}>
                      {m.unit_cost ? `$${Number(m.unit_cost).toFixed(2)}` : <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                      {m.notes || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{
            padding: '10px 16px', fontSize: 12,
            color: 'rgba(255,255,255,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            {filtered.length} de {movements.length} movimientos
          </div>
        )}
      </div>

      {showModal && (
        <AdjustmentModal
          products={products}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}
