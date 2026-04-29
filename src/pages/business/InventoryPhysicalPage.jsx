import { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, ArrowLeft, Check, Clipboard } from 'react-feather';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';

/* ─── shared styles ─────────────────────────────────────────────── */
const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.3)', color: '#fff',
  fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
};
const btnPrimary = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px 18px', background: '#6842fe', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
};
const btnSecondary = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px 14px', background: 'transparent', color: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
  cursor: 'pointer', fontWeight: 600, fontSize: 13,
};

const STATUS_STYLE = {
  open:   { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: 'Abierto'  },
  closed: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: 'Cerrado'  },
};

/* ─── New-inventory modal ────────────────────────────────────────── */
function NewInventoryModal({ categories, onClose, onCreate }) {
  const [selected, setSelected] = useState([]);

  const toggle = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: 'linear-gradient(135deg,#1a1f2a 0%,#141920 100%)',
        border: '1px solid rgba(104,66,254,0.25)', borderRadius: 16,
        width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* header */}
        <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#fff' }}>Nuevo inventario físico</h2>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Selecciona las categorías a contar
          </p>
        </div>

        {/* category list */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
          {categories.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>No hay categorías registradas</p>
          )}
          {categories.map(c => {
            const checked = selected.includes(c.id);
            return (
              <label
                key={c.id}
                onClick={() => toggle(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${checked ? 'rgba(104,66,254,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  background: checked ? 'rgba(104,66,254,0.1)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${checked ? '#6842fe' : 'rgba(255,255,255,0.2)'}`,
                  background: checked ? '#6842fe' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {checked && <Check size={11} color="#fff" />}
                </div>
                <span style={{ fontSize: 13, color: checked ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: checked ? 600 : 400 }}>
                  {c.name}
                </span>
              </label>
            );
          })}
        </div>

        {/* footer */}
        <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button
            onClick={() => onCreate(selected)}
            disabled={selected.length === 0}
            style={{ ...btnPrimary, opacity: selected.length === 0 ? 0.5 : 1 }}
          >
            <Plus size={14} />
            Crear inventario
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function InventoryPhysicalPage() {
  const [inventories, setInventories] = useState([]);
  const [categories, setCategories]   = useState([]);
  const [active, setActive]           = useState(null);
  const [items, setItems]             = useState([]);
  const [modalOpen, setModalOpen]     = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [invRes, catRes] = await Promise.all([
        fetchWithAuth('/api/inventory'),
        fetchWithAuth('/api/categories'),
      ]);
      if (!invRes.ok) throw new Error(`HTTP ${invRes.status}`);
      const [inv, cat] = await Promise.all([invRes.json(), catRes.json()]);
      setInventories(Array.isArray(inv) ? inv : []);
      setCategories(Array.isArray(cat) ? cat : []);
    } catch (err) {
      setError('Error cargando inventarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function createInventory(categoryIds) {
    if (!categoryIds.length) { alert('Selecciona al menos una categoría'); return; }
    try {
      const res = await fetchWithAuth('/api/inventory', {
        method: 'POST', body: JSON.stringify({ categories: categoryIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al crear');
      setModalOpen(false);
      loadData();
    } catch (e) { alert(e.message); }
  }

  async function openInventory(inv) {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/api/inventory/${inv.id}`);
      if (!res.ok) throw new Error('Error al abrir inventario');
      const data = await res.json();
      setActive(inv);
      setItems(data.items || []);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateItem(id, value) {
    try {
      await fetchWithAuth(`/api/inventory/${active.id}/items/${id}`, {
        method: 'PUT', body: JSON.stringify({ counted_stock: value }),
      });
      setItems(prev => prev.map(i =>
        i.id === id
          ? { ...i, counted_stock: value, difference: value - i.system_stock, status: 'counted' }
          : i
      ));
    } catch (e) { alert(e.message); }
  }

  async function closeInventory() {
    if (items.some(i => i.status === 'pending')) {
      alert('Debes completar todos los productos'); return;
    }
    try {
      const res = await fetchWithAuth(`/api/inventory/${active.id}/close`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al cerrar');
      setActive(null);
      loadData();
    } catch (e) { alert(e.message); }
  }

  const pending  = items.filter(i => i.status === 'pending').length;
  const counted  = items.filter(i => i.status === 'counted').length;
  const progress = items.length ? Math.round((counted / items.length) * 100) : 0;

  const headerAction = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {!active && (
        <button onClick={() => setModalOpen(true)} style={btnPrimary}>
          <Plus size={14} /> Nuevo inventario
        </button>
      )}
      <button onClick={loadData} title="Recargar" style={{ ...btnSecondary, padding: '9px 12px' }}>
        <RefreshCw size={14} />
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Inventario Físico"
      subtitle="Conteo y ajuste de stock"
      loading={loading}
      error={error}
      onRetry={loadData}
      headerAction={headerAction}
    >
      {/* ── LIST VIEW ── */}
      {!active && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(104,66,254,0.12)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['ID', 'Estado', 'Fecha', 'Cerrado', ''].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventories.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                      <Clipboard size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                      No hay inventarios registrados
                    </td>
                  </tr>
                )}
                {inventories.map((inv, idx) => {
                  const st = STATUS_STYLE[inv.status] || STATUS_STYLE.open;
                  return (
                    <tr
                      key={inv.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(104,66,254,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                    >
                      <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 11 }}>
                        #{String(inv.id).slice(0, 8)}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.65)' }}>
                        {new Date(inv.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                        {inv.closed_date ? new Date(inv.closed_date).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {inv.status !== 'closed' && (
                          <button
                            onClick={() => openInventory(inv)}
                            style={{ padding: '6px 14px', background: 'rgba(104,66,254,0.15)', color: '#6842fe', border: '1px solid rgba(104,66,254,0.25)', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >
                            Abrir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {inventories.length > 0 && (
            <div style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {inventories.length} inventario(s)
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL VIEW ── */}
      {active && (
        <>
          {/* top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <button onClick={() => setActive(null)} style={btnSecondary}>
              <ArrowLeft size={14} /> Volver
            </button>

            {/* progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{counted}</span> / {items.length} contados
              </div>
              <div style={{ width: 120, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${progress}%`, background: progress === 100 ? '#10b981' : '#6842fe', transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 12, color: progress === 100 ? '#10b981' : 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{progress}%</span>
            </div>

            <button
              onClick={closeInventory}
              disabled={pending > 0}
              style={{ ...btnPrimary, background: pending > 0 ? 'rgba(104,66,254,0.3)' : '#10b981', opacity: pending > 0 ? 0.6 : 1 }}
            >
              <Check size={14} /> Cerrar inventario
            </button>
          </div>

          {/* items table */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(104,66,254,0.12)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Producto', 'Stock sistema', 'Conteo físico', 'Diferencia', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const diff = item.difference ?? 0;
                    const diffColor = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : 'rgba(255,255,255,0.4)';
                    return (
                      <tr
                        key={item.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                      >
                        <td style={{ padding: '11px 14px', color: '#fff', fontWeight: 600 }}>{item.product_name}</td>
                        <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>{item.system_stock}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <input
                            type="number"
                            min="0"
                            value={item.counted_stock ?? ''}
                            onChange={e => updateItem(item.id, Number(e.target.value))}
                            placeholder="—"
                            style={{ ...inputStyle, width: 100, padding: '7px 10px' }}
                          />
                        </td>
                        <td style={{ padding: '11px 14px', fontWeight: 700, color: diffColor }}>
                          {item.status === 'counted' ? (diff > 0 ? `+${diff}` : diff) : '—'}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                            background: item.status === 'counted' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: item.status === 'counted' ? '#10b981' : '#f59e0b',
                          }}>
                            {item.status === 'counted' ? 'Contado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {items.length} productos · {pending} pendiente(s)
            </div>
          </div>
        </>
      )}

      {modalOpen && (
        <NewInventoryModal
          categories={categories}
          onClose={() => setModalOpen(false)}
          onCreate={createInventory}
        />
      )}
    </PageTemplate>
  );
}
