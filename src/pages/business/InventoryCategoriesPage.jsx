import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { Plus, Edit2, Trash2, Tag, X, Search, RefreshCw } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/InventoryCategoriesPage.css';

const EMPTY_CATEGORY = { name: '', description: '' };

function CategoryModal({ category, onClose, onSave, saving }) {
  const [form, setForm] = useState(category ? { ...category } : { ...EMPTY_CATEGORY });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="invcat-modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 14,
    }}>
      <div className="invcat-modal" style={{
        background: '#fff', borderRadius: 14, boxShadow: '0 12px 40px #0002',
        border: '1px solid #f1f1f1', minWidth: 330, maxWidth: 400,
        width: '100%', padding: 0, display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid #f3f3f3', padding: '17px 22px 9px 22px'
        }}>
          <span style={{
            background: 'var(--color-primary,#ff8c42)', color: '#fff', padding: 8, borderRadius: '50%'
          }}>
            <Tag size={15} />
          </span>
          <h3 style={{ margin: 0, fontWeight: 800, fontSize: 17, color: '#111' }}>
            {category ? 'Editar categoría' : 'Nueva categoría'}
          </h3>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '17px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={labelStyle}>Nombre *</label>
          <input
            value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Ej: Cafetería"
            style={inputStyle}
            maxLength={30}
          />
          <label style={labelStyle}>Descripción</label>
          <textarea
            value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Ej: Productos de café y bebidas calientes" maxLength={80}
            rows={3} style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
          />
        </div>

        {/* Footer */}
        <div style={{padding:'14px 18px', borderTop:'1px solid #f3f3f3', display:'flex', gap:10, justifyContent:'flex-end'}}>
          <button onClick={onClose} disabled={saving} style={btnSecondary}>Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.name}
            style={btnPrimary}
          >
            {saving ? 'Guardando...' : category ? 'Guardar cambios' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: 11.5, fontWeight: 600, color: '#555',
  textTransform: 'uppercase', marginBottom: 2
};
const inputStyle = {
  width: '100%', padding: '9px 13px', borderRadius: 8,
  border: '1px solid #eee', background: 'rgb(250,250,252)',
  marginBottom: 0, fontSize: 13, color: '#232323'
};
const btnPrimary = {
  padding: '8px 21px', background: 'var(--color-primary,#ff8c42)',
  color: '#fff', border: 'none', borderRadius: 7,
  fontWeight: 700, fontSize: 14, cursor: 'pointer'
};
const btnSecondary = {
  padding: '8px 16px', background: 'transparent', color: '#666',
  border: '1px solid #e3e3e3', borderRadius: 7,
  fontWeight: 700, fontSize: 14, cursor: 'pointer'
};

export default function InventoryCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const res = await fetchWithAuth('/api/categories');
      if (!res.ok) throw new Error((await res.json()).error || 'Error al cargar categorías');
      setCategories(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingCat(null); setShowModal(true); };
  const openEdit = (cat) => { setEditingCat(cat); setShowModal(true); };
  const handleDelete = async (cat) => {
    if (!window.confirm(`¿Eliminar categoría "${cat.name}"?`)) return;
    try {
      const res = await fetchWithAuth(`/api/categories/${cat.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al eliminar');
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSave = async (form) => {
    try {
      setSaving(true);
      const url = editingCat ? `/api/categories/${editingCat.id}` : `/api/categories`;
      const method = editingCat ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      await load();
      setShowModal(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = categories.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const headerAction = (
    <div className="invcat-header-actions" style={{ display: 'flex', gap: 9 }}>
      <div className="invcat-search-wrapper" style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#ccc' }} />
        <input
          className="invcat-search-input"
          type="text"
          value={search}
          placeholder="Buscar categoría..."
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 12px 8px 30px', border: '1.2px solid var(--color-border,#eee)',
            borderRadius: 6, fontSize: 14, background: 'var(--color-bg-secondary,#f8fafc)',
            color: 'var(--color-text,#333)', minWidth: 140
          }}
        />
      </div>
      <button onClick={load} title="Recargar" style={{
        background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '7px 10px', color: '#888', cursor: 'pointer'
      }}>
        <RefreshCw size={14} />
      </button>
      <button onClick={openCreate} style={{
        display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px',
        background: 'var(--color-primary,#ff8c42)', color: 'white',
        border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600
      }}>
        <Plus size={14} /> Nueva categoría
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Categorías de Productos"
      subtitle="Clasificación de productos en almacén"
      headerAction={headerAction}
      loading={loading}
      error={error}
      onRetry={load}
      theme="business"
    >
      <div className="invcat-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16, marginTop: 10
      }}>
        {filtered.length === 0 && (
          <div style={{ color: '#888', padding: 28, gridColumn: '1/-1' }}>Sin categorías registradas</div>
        )}
        {filtered.map(cat => (
          <div key={cat.id} style={{
            background: 'var(--color-card,#fff)',
            border: '1px solid var(--color-border,#eee)', borderRadius: 8,
            padding: 19, color: 'var(--color-text,#333)', display: 'flex', flexDirection: 'column',
            minHeight: 140, boxShadow: '0 2px 14px #eee1'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--color-primary,#ff8c42)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15
              }}>
                <Tag size={15} />
              </div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{cat.name}</h4>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 11, minHeight: 22 }}>
              {cat.description}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
              <button onClick={() => openEdit(cat)} style={{
                flex: 1, padding: '7px 0', borderRadius: 4,
                background: 'var(--color-primary,#ff8c42)', color: '#fff', border: 'none',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: 5
              }}>
                <Edit2 size={12} /> Editar
              </button>
              <button
                onClick={() => handleDelete(cat)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 4,
                  background: '#e53838', color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 5
                }}>
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      {showModal &&
        <CategoryModal
          category={editingCat}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        />
      }
    </PageTemplate>
  );
}