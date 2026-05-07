import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { Plus, Edit2, Trash2, X, Search, RefreshCw, Package, AlertCircle } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/InventoryProductsPage.css';

const EMPTY = {
  nombre: '', precioVenta: '', costo: '', descripcion: '',
  categoria: '', sku: '', stock: '0', minStock: '0', iva: true,
};

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

function ProductModal({ product, categories, onClose, onSave, saving }) {
  const [form, setForm] = useState(product ? {
    nombre:      product.name        || '',
    precioVenta: product.price       || '',
    costo:       product.unit_cost   || '',
    descripcion: product.description || '',
    categoria:   product.category_name || '',
    sku:         product.sku         || '',
    stock:       product.stock       ?? 0,
    minStock:    product.min_stock   ?? 0,
    iva:         product.is_taxable  ?? true,
  } : { ...EMPTY });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="invp-modal-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div className="invp-modal" style={{
        background: 'linear-gradient(135deg,#1a1f2a 0%,#141920 100%)',
        border: '1px solid rgba(104,66,254,0.25)', borderRadius: 16,
        width: '100%', maxWidth: 580, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>
              {product ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              {product ? `Código: ${product.code}` : 'Completa los datos del producto'}
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <div className="invp-modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Nombre *">
                <input
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  placeholder="Ej: Café Grano 1kg"
                  style={inputStyle}
                />
              </Field>
            </div>
            <Field label="Precio de venta *">
              <input
                type="number" step="0.01" min="0"
                value={form.precioVenta}
                onChange={e => set('precioVenta', e.target.value)}
                placeholder="0.00" style={inputStyle}
              />
            </Field>
            <Field label="Costo unitario">
              <input
                type="number" step="0.01" min="0"
                value={form.costo}
                onChange={e => set('costo', e.target.value)}
                placeholder="0.00" style={inputStyle}
              />
            </Field>
            <Field label="Categoría">
              <select value={form.categoria} onChange={e => set('categoria', e.target.value)} style={inputStyle}>
                <option value="">Sin categoría</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="SKU">
              <input
                value={form.sku}
                onChange={e => set('sku', e.target.value)}
                placeholder="Ej: CAFE-001" style={inputStyle}
              />
            </Field>
            <Field label="Stock inicial">
              <input
                type="number" min="0"
                value={form.stock}
                onChange={e => set('stock', e.target.value)}
                placeholder="0" style={inputStyle}
              />
            </Field>
            <Field label="Stock mínimo">
              <input
                type="number" min="0"
                value={form.minStock}
                onChange={e => set('minStock', e.target.value)}
                placeholder="0" style={inputStyle}
              />
            </Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Descripción">
                <textarea
                  value={form.descripcion}
                  onChange={e => set('descripcion', e.target.value)}
                  rows={2} placeholder="Descripción del producto..."
                  style={{ ...inputStyle, height: 'auto', resize: 'vertical' }}
                />
              </Field>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox" id="iva_check"
                checked={form.iva}
                onChange={e => set('iva', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#6842fe' }}
              />
              <label htmlFor="iva_check" style={{
                fontSize: 13, color: 'rgba(255,255,255,0.75)', cursor: 'pointer',
              }}>
                Aplica IVA
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="invp-modal-footer" style={{
          padding: '18px 28px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
        }}>
          <button onClick={onClose} disabled={saving} style={btnSecondary}>
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.nombre || !form.precioVenta}
            style={{ ...btnPrimary, opacity: (!form.nombre || !form.precioVenta) ? 0.5 : 1 }}
          >
            {saving ? 'Guardando...' : product ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryProductsPage() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [error, setError]           = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [pr, ca] = await Promise.all([
        fetchWithAuth('/api/products?all=1'),
        fetchWithAuth('/api/categories'),
      ]);
      if (!pr.ok) throw new Error('Error al cargar productos');
      const [prData, caData] = await Promise.all([pr.json(), ca.json()]);
      setProducts(Array.isArray(prData) ? prData : []);
      setCategories(Array.isArray(caData) ? caData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (saving) return; // ✅ Prevención de doble envío
    try {
      setSaving(true);
      const url    = editing ? `/api/products/${editing.id}` : '/api/products';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetchWithAuth(url, { method, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar');
      await load();
      setShowModal(false);
      setEditing(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`¿Desactivar "${p.name}"?`)) return;
    try {
      const res = await fetchWithAuth(`/api/products/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al eliminar');
      await load();
    } catch (e) {
      alert(e.message);
    }
  };

  const filtered = products.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.sku  || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total productos', value: products.length,                                                color: '#6842fe' },
    { label: 'Activos',         value: products.filter(p => p.is_active).length,                      color: '#10b981' },
    { label: 'Stock bajo',      value: products.filter(p => p.stock <= p.min_stock && p.stock > 0).length, color: '#f59e0b' },
    { label: 'Sin stock',       value: products.filter(p => p.stock === 0).length,                    color: '#ef4444' },
  ];

  const headerAction = (
    <div className="invp-header-actions" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="invp-search-wrapper" style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: 10, top: '50%',
          transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)',
        }} />
        <input
          className="invp-search-input"
          type="text" placeholder="Buscar nombre, código o SKU..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            padding: '9px 12px 9px 32px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.9)',
            fontSize: 13, width: 260,
          }}
        />
      </div>
      <button onClick={load} title="Recargar" style={{ ...btnSecondary, padding: '9px 12px' }}>
        <RefreshCw size={14} />
      </button>
      <button
        onClick={() => { setEditing(null); setShowModal(true); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, ...btnPrimary, padding: '9px 18px' }}
      >
        <Plus size={15} /> Nuevo producto
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Gestión de Productos"
      subtitle="Catálogo completo de productos del negocio"
      headerAction={headerAction}
      loading={loading}
      error={error}
      onRetry={load}
    >
      {/* Stats */}
      <div className="invp-stats" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
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
      <div className="invp-table-wrapper" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        <div className="invp-table-inner" style={{ overflowX: 'auto' }}>
          <table className="invp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{
                background: 'rgba(104,66,254,0.12)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                {['Código', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Estado', ''].map(h => (
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
                  <td colSpan={7} style={{
                    textAlign: 'center', padding: 40,
                    color: 'rgba(255,255,255,0.3)', fontSize: 14,
                  }}>
                    <Package size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                    {search ? 'Sin resultados para esa búsqueda' : 'No hay productos registrados'}
                  </td>
                </tr>
              )}
              {filtered.map((p, idx) => {
                const lowStock = p.stock <= p.min_stock && p.min_stock > 0;
                return (
                  <tr
                    key={p.id}
                    className="invp-tbody-tr"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(104,66,254,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                  >
                    <td className="invp-td" data-label="Código" style={{
                      padding: '11px 14px', color: 'rgba(255,255,255,0.4)',
                      fontSize: 11, fontFamily: 'monospace',
                    }}>
                      {p.code}
                    </td>
                    <td className="invp-td" data-label="Nombre" style={{ padding: '11px 14px', color: '#fff', fontWeight: 600 }}>
                      {p.name}
                      {p.sku && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
                          {p.sku}
                        </span>
                      )}
                    </td>
                    <td className="invp-td" data-label="Categoría" style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.6)' }}>
                      {p.category_name || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                    </td>
                    <td className="invp-td" data-label="Precio" style={{ padding: '11px 14px', color: '#10b981', fontWeight: 700 }}>
                      ${Number(p.price || 0).toFixed(2)}
                    </td>
                    <td className="invp-td" data-label="Stock" style={{ padding: '11px 14px' }}>
                      <span style={{
                        fontWeight: 700,
                        color: p.stock === 0 ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981',
                      }}>
                        {p.stock}
                        {lowStock && p.stock > 0 && (
                          <AlertCircle size={11} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                        )}
                      </span>
                      {p.min_stock > 0 && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>
                          mín: {p.min_stock}
                        </span>
                      )}
                    </td>
                    <td className="invp-td" data-label="Estado" style={{ padding: '11px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                        background: p.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: p.is_active ? '#10b981' : '#ef4444',
                      }}>
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="invp-td invp-td-actions" style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => { setEditing(p); setShowModal(true); }}
                          title="Editar"
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(104,66,254,0.15)', color: '#6842fe',
                            border: '1px solid rgba(104,66,254,0.25)',
                            borderRadius: 6, cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          title="Desactivar"
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.22)',
                            borderRadius: 6, cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
            {filtered.length} de {products.length} productos
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal
          product={editing}
          categories={categories}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}
