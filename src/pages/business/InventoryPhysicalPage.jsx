import { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, ArrowLeft, Check, Clipboard, AlertCircle } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/InventoryPhysicalPage.css';

/* ─── shared styles (definiciones faltantes) ─────────────────────── */
const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.3)',
  color: '#fff',
  fontSize: 13,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const btnPrimary = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 18px',
  background: '#6842fe',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
};

const btnSecondary = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '9px 14px',
  background: 'transparent',
  color: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
};

const STATUS_STYLE = {
  open: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Abierto' },
  closed: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: 'Cerrado' },
};

/* ─── New-inventory modal ────────────────────────────────────────── */
function NewInventoryModal({ categories, onClose, onCreate }) {
  const [selected, setSelected] = useState([]);

  const toggle = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Nuevo inventario físico</h2>
          <p className="modal-subtitle">Selecciona las categorías a contar</p>
        </div>

        <div className="modal-body">
          {categories.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>No hay categorías registradas</p>
          )}
          {categories.map(c => {
            const checked = selected.includes(c.id);
            return (
              <label
                key={c.id}
                onClick={() => toggle(c.id)}
                className="category-item"
                style={{
                  border: `1px solid ${checked ? 'rgba(104,66,254,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  background: checked ? 'rgba(104,66,254,0.1)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <div
                  className="category-checkbox"
                  style={{
                    border: `2px solid ${checked ? '#6842fe' : 'rgba(255,255,255,0.2)'}`,
                    background: checked ? '#6842fe' : 'transparent',
                  }}
                >
                  {checked && <Check className="check-icon" size={11} />}
                </div>
                <span className="category-name" style={{
                  color: checked ? '#fff' : 'rgba(255,255,255,0.7)',
                  fontWeight: checked ? 600 : 400
                }}>
                  {c.name}
                </span>
              </label>
            );
          })}
        </div>

        <div className="modal-footer">
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

/* ─── Page Template Component ─────────────────────────────────────── */
function PageTemplate({ title, subtitle, children, loading, error, onRetry, headerAction }) {
  if (loading) {
    return (
      <div className="inventory-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p className="loading-text">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inventory-page">
        <div className="error-container">
          <AlertCircle size={48} className="error-icon" />
          <p className="error-text">{error}</p>
          <button onClick={onRetry} className="retry-button">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <div className="inventory-title-section">
          <h1>{title}</h1>
          {subtitle && <p className="inventory-subtitle">{subtitle}</p>}
        </div>
        {headerAction && <div className="inventory-actions">{headerAction}</div>}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}

/* ─── Main Page Component ─────────────────────────────────────────── */
export default function InventoryPhysicalPage() {
  const [inventories, setInventories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [active, setActive] = useState(null);
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function createInventory(categoryIds) {
    if (!categoryIds.length) {
      alert('Selecciona al menos una categoría');
      return;
    }
    try {
      const res = await fetchWithAuth('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: categoryIds }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al crear');
      }
      setModalOpen(false);
      loadData();
    } catch (e) {
      alert(e.message);
    }
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
    if (value < 0) return;
    try {
      await fetchWithAuth(`/api/inventory/${active.id}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counted_stock: value }),
      });
      setItems(prev => prev.map(i =>
        i.id === id
          ? { ...i, counted_stock: value, difference: value - i.system_stock, status: 'counted' }
          : i
      ));
    } catch (e) {
      alert(e.message);
    }
  }

  async function closeInventory() {
    if (items.some(i => i.status === 'pending')) {
      alert('Debes completar todos los productos');
      return;
    }
    try {
      const res = await fetchWithAuth(`/api/inventory/${active.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al cerrar');
      }
      setActive(null);
      loadData();
    } catch (e) {
      alert(e.message);
    }
  }

  const pending = items.filter(i => i.status === 'pending').length;
  const counted = items.filter(i => i.status === 'counted').length;
  const progress = items.length ? Math.round((counted / items.length) * 100) : 0;

  const headerAction = (
    <div className="inventory-actions">
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
        <div className="inventory-table-container">
          <div style={{ overflowX: 'auto' }}>
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Cerrado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inventories.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      <Clipboard size={32} className="empty-icon" />
                      No hay inventarios registrados
                    </td>
                  </tr>
                )}
                {inventories.map((inv) => {
                  const st = STATUS_STYLE[inv.status] || STATUS_STYLE.open;
                  return (
                    <tr key={inv.id}>
                      <td style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 11 }}>
                        #{String(inv.id).slice(0, 8)}
                      </td>
                      <td>
                        <span className={`status-badge status-badge-${inv.status}`}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ color: 'rgba(255,255,255,0.65)' }}>
                        {new Date(inv.created_at).toLocaleString()}
                      </td>
                      <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                        {inv.closed_at ? new Date(inv.closed_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        {inv.status !== 'closed' && (
                          <button
                            onClick={() => openInventory(inv)}
                            className="open-inventory-btn"
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
            <div className="table-footer">
              {inventories.length} inventario(s)
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL VIEW ── */}
      {active && (
        <>
          <div className="detail-header">
            <button onClick={() => setActive(null)} style={btnSecondary}>
              <ArrowLeft size={14} /> Volver
            </button>

            <div className="progress-container">
              <div className="progress-stats">
                <span className="progress-count">{counted}</span> / {items.length} contados
              </div>
              <div className="progress-bar-wrapper">
                <div 
                  className={`progress-bar ${progress === 100 ? 'progress-bar-green' : 'progress-bar-purple'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={`progress-percentage ${progress === 100 ? 'progress-percentage-green' : 'progress-percentage-gray'}`}>
                {progress}%
              </span>
            </div>

            <button
              onClick={closeInventory}
              disabled={pending > 0}
              className={`btn-primary ${pending === 0 ? 'close-inventory-btn' : ''}`}
              style={{ opacity: pending > 0 ? 0.6 : 1 }}
            >
              <Check size={14} /> Cerrar inventario
            </button>
          </div>

          <div className="items-table-container">
            <div style={{ overflowX: 'auto' }}>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock sistema</th>
                    <th>Conteo físico</th>
                    <th>Diferencia</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
                        <Clipboard size={48} className="empty-icon" />
                        <p>No hay productos en este inventario.</p>
                        <p style={{ fontSize: 12, opacity: 0.6 }}>
                          Verifica que las categorías seleccionadas tengan productos asociados.
                        </p>
                      </td>
                    </tr>
                  )}
                  {items.map((item) => {
                    const diff = item.difference ?? 0;
                    const diffClass = diff > 0 ? 'difference-positive' : diff < 0 ? 'difference-negative' : 'difference-zero';
                    return (
                      <tr key={item.id}>
                        <td className="product-name">{item.product_name}</td>
                        <td className="system-stock">{item.system_stock}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={item.counted_stock ?? ''}
                            onChange={e => updateItem(item.id, Number(e.target.value))}
                            placeholder="—"
                            className="count-input"
                            style={inputStyle}
                          />
                        </td>
                        <td className={diffClass}>
                          {item.status === 'counted' ? (diff > 0 ? `+${diff}` : diff) : '—'}
                        </td>
                        <td>
                          <span className={`item-status-badge item-status-${item.status}`}>
                            {item.status === 'counted' ? 'Contado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
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