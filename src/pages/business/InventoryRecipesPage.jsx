import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import { Plus, Edit2, Trash2, X, Search, RefreshCw, BookOpen, ChevronRight, ChevronDown, Minus } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';

const EMPTY_RECIPE = { name: '', description: '', category_id: '', yield_qty: 1, yield_unit: 'unidad' };
const EMPTY_INGR   = { ingredient_name: '', quantity: 1, unit: '', unit_cost: 0 };

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

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function RecipeModal({ recipe, categories, onClose, onSave, saving }) {
  const [form, setForm] = useState(recipe ? {
    name:        recipe.name        || '',
    description: recipe.description || '',
    category_id: recipe.category_id || '',
    yield_qty:   recipe.yield_qty   || 1,
    yield_unit:  recipe.yield_unit  || 'unidad',
  } : { ...EMPTY_RECIPE });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'linear-gradient(135deg,#1a1f2a 0%,#141920 100%)', border: '1px solid rgba(104,66,254,0.25)', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>{recipe ? 'Editar receta' : 'Nueva receta'}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{recipe ? recipe.name : 'Completa los datos de la receta'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Nombre *">
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Café Americano" style={inputStyle} />
              </Field>
            </div>
            <Field label="Categoría">
              <select value={form.category_id || ''} onChange={e => set('category_id', e.target.value || '')} style={inputStyle}>
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Unidad">
              <input value={form.yield_unit} onChange={e => set('yield_unit', e.target.value)} placeholder="unidad, porción, litro..." style={inputStyle} />
            </Field>
            <Field label="Rendimiento (qty)">
              <input type="number" min="0.001" step="0.001" value={form.yield_qty} onChange={e => set('yield_qty', e.target.value)} style={inputStyle} />
            </Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Descripción">
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="Descripción o instrucciones..." style={{ ...inputStyle, height: 'auto', resize: 'vertical' }} />
              </Field>
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={saving} style={btnSecondary}>Cancelar</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name} style={{ ...btnPrimary, opacity: !form.name ? 0.5 : 1 }}>
            {saving ? 'Guardando...' : recipe ? 'Guardar cambios' : 'Crear receta'}
          </button>
        </div>
      </div>
    </div>
  );
}

function IngredientsPanel({ recipe, onClose }) {
  const { showConfirm } = useConfirm();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [form, setForm]               = useState({ ...EMPTY_INGR });
  const [saving, setSaving]           = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/recipes/${recipe.id}/ingredients`);
      setIngredients(res.ok ? await res.json() : []);
    } finally {
      setLoading(false);
    }
  }, [recipe.id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.ingredient_name) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`/api/recipes/${recipe.id}/ingredients`, {
        method: 'POST', body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error');
      setForm({ ...EMPTY_INGR });
      setShowAdd(false);
      load();
    } catch (e) {
      await alert.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await showConfirm('¿Eliminar ingrediente?')) return;
    await fetchWithAuth(`/api/recipes/${recipe.id}/ingredients/${id}`, { method: 'DELETE' });
    load();
  };

  const total = ingredients.reduce((s, i) => s + Number(i.total_cost || 0), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'linear-gradient(135deg,#1a1f2a 0%,#141920 100%)', border: '1px solid rgba(104,66,254,0.25)', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>Ingredientes</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{recipe.name}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setShowAdd(v => !v)} style={{ ...btnPrimary, padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Plus size={13} /> Agregar
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}><X size={20} /></button>
          </div>
        </div>

        {showAdd && (
          <div style={{ padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(104,66,254,0.05)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              <input value={form.ingredient_name} onChange={e => set('ingredient_name', e.target.value)} placeholder="Ingrediente *" style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }} />
              <input type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="Cantidad" style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }} />
              <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="Unidad" style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }} />
              <input type="number" step="0.01" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} placeholder="Costo" style={{ ...inputStyle, fontSize: 12, padding: '8px 10px' }} />
              <button onClick={handleAdd} disabled={saving || !form.ingredient_name} style={{ ...btnPrimary, padding: '8px 14px', fontSize: 12 }}>
                {saving ? '...' : 'OK'}
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div>
          ) : ingredients.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <BookOpen size={28} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
              Sin ingredientes aún
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(104,66,254,0.1)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Ingrediente', 'Cantidad', 'Unidad', 'Costo unit.', 'Total', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ingredients.map((i, idx) => (
                  <tr key={i.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 500 }}>{i.ingredient_name}</td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)' }}>{i.quantity}</td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.5)' }}>{i.unit || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.6)' }}>${Number(i.unit_cost).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px', color: '#10b981', fontWeight: 700 }}>${Number(i.total_cost).toFixed(2)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => handleDelete(i.id)} style={{ padding: '5px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, cursor: 'pointer' }}>
                        <Minus size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '14px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{ingredients.length} ingrediente(s)</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#10b981' }}>Costo total: ${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default function InventoryRecipesPage() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [recipes, setRecipes]         = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [viewIngr, setViewIngr]       = useState(null);
  const [error, setError]             = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [rr, cr] = await Promise.all([
        fetchWithAuth('/api/recipes'),
        fetchWithAuth('/api/categories'),
      ]);
      if (!rr.ok) throw new Error('Error al cargar recetas');
      const [rData, cData] = await Promise.all([rr.json(), cr.json()]);
      setRecipes(Array.isArray(rData) ? rData : []);
      setCategories(Array.isArray(cData) ? cData : []);
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
      const url    = editing ? `/api/recipes/${editing.id}` : '/api/recipes';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetchWithAuth(url, { method, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      await load();
      setShowModal(false);
      setEditing(null);
    } catch (e) {
      await alert.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    if (!await showConfirm(`¿Desactivar "${r.name}"?`)) return;
    try {
      await fetchWithAuth(`/api/recipes/${r.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const filtered = recipes.filter(r =>
    (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const headerAction = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
        <input
          type="text" placeholder="Buscar receta..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '9px 12px 9px 32px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.9)', fontSize: 13, width: 220 }}
        />
      </div>
      <button onClick={load} title="Recargar" style={{ ...btnSecondary, padding: '9px 12px' }}>
        <RefreshCw size={14} />
      </button>
      <button onClick={() => { setEditing(null); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, ...btnPrimary, padding: '9px 18px' }}>
        <Plus size={15} /> Nueva receta
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Recetas e Ingredientes"
      subtitle="Gestión de recetas y costeo de ingredientes"
      headerAction={headerAction}
      loading={loading}
      error={error}
      onRetry={load}
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total recetas', value: recipes.length, color: '#6842fe' },
          { label: 'Activas',       value: recipes.filter(r => r.is_active).length, color: '#10b981' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 20px', minWidth: 120 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(104,66,254,0.12)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Receta', 'Categoría', 'Rendimiento', 'Costo total', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                    <BookOpen size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                    {search ? 'Sin resultados para esa búsqueda' : 'No hay recetas registradas'}
                  </td>
                </tr>
              )}
              {filtered.map((r, idx) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(104,66,254,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                >
                  <td style={{ padding: '11px 14px', color: '#fff', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BookOpen size={13} style={{ color: '#6842fe', flexShrink: 0 }} />
                      {r.name}
                    </div>
                    {r.description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{r.description}</div>}
                  </td>
                  <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.6)' }}>{r.category_name || '—'}</td>
                  <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.7)' }}>{r.yield_qty} {r.yield_unit}</td>
                  <td style={{ padding: '11px 14px', color: '#10b981', fontWeight: 700 }}>${Number(r.total_cost || 0).toFixed(2)}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: r.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: r.is_active ? '#10b981' : '#ef4444' }}>
                      {r.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setViewIngr(r)} title="Ingredientes" style={{ padding: '6px 10px', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        Ingredientes
                      </button>
                      <button onClick={() => { setEditing(r); setShowModal(true); }} title="Editar" style={{ padding: '6px 10px', background: 'rgba(104,66,254,0.15)', color: '#6842fe', border: '1px solid rgba(104,66,254,0.25)', borderRadius: 6, cursor: 'pointer' }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(r)} title="Desactivar" style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 6, cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {filtered.length} de {recipes.length} recetas
          </div>
        )}
      </div>

      {showModal && (
        <RecipeModal
          recipe={editing}
          categories={categories}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {viewIngr && (
        <IngredientsPanel recipe={viewIngr} onClose={() => setViewIngr(null)} />
      )}
    </PageTemplate>
  );
}
