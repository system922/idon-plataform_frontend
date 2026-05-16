import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import { Plus, Edit2, Trash2, X, Search, RefreshCw, Truck } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';

const EMPTY = { name: '', tax_id: '', contact: '', phone: '', email: '', address: '' };

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

function SupplierModal({ supplier, onClose, onSave, saving }) {
  const [form, setForm] = useState(supplier ? { ...supplier } : { ...EMPTY });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: 'linear-gradient(135deg,#1a1f2a 0%,#141920 100%)',
        border: '1px solid rgba(104,66,254,0.25)', borderRadius: 16,
        width: '100%', maxWidth: 560, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>
              {supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              {supplier ? supplier.name : 'Completa los datos del proveedor'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Nombre *">
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Distribuidora XYZ" style={inputStyle} />
              </Field>
            </div>
            <Field label="RUC / NIT">
              <input value={form.tax_id || ''} onChange={e => set('tax_id', e.target.value)} placeholder="Ej: 1234567890001" style={inputStyle} />
            </Field>
            <Field label="Contacto">
              <input value={form.contact || ''} onChange={e => set('contact', e.target.value)} placeholder="Nombre del contacto" style={inputStyle} />
            </Field>
            <Field label="Teléfono">
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+593 99 999 9999" style={inputStyle} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="proveedor@email.com" style={inputStyle} />
            </Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Dirección">
                <textarea value={form.address || ''} onChange={e => set('address', e.target.value)} rows={2} placeholder="Dirección del proveedor..." style={{ ...inputStyle, height: 'auto', resize: 'vertical' }} />
              </Field>
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={saving} style={btnSecondary}>Cancelar</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.name} style={{ ...btnPrimary, opacity: !form.name ? 0.5 : 1 }}>
            {saving ? 'Guardando...' : supplier ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventorySuppliersPage() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const res = await fetchWithAuth('/api/suppliers');
      if (!res.ok) throw new Error('Error al cargar proveedores');
      setSuppliers(await res.json());
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
      const url    = editing ? `/api/suppliers/${editing.id}` : '/api/suppliers';
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

  const handleDelete = async (s) => {
    if (!await showConfirm(`¿Desactivar "${s.name}"?`)) return;
    try {
      const res = await fetchWithAuth(`/api/suppliers/${s.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      await load();
    } catch (e) {
      await alert.error(e.message);
    }
  };

  const filtered = suppliers.filter(s =>
    (s.name    || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.contact || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email   || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: 'Total',   value: suppliers.length,                           color: '#6842fe' },
    { label: 'Activos', value: suppliers.filter(s => s.is_active).length,  color: '#10b981' },
    { label: 'Inactivos', value: suppliers.filter(s => !s.is_active).length, color: '#ef4444' },
  ];

  const headerAction = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
        <input
          type="text" placeholder="Buscar proveedor..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '9px 12px 9px 32px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.9)', fontSize: 13, width: 230 }}
        />
      </div>
      <button onClick={load} title="Recargar" style={{ ...btnSecondary, padding: '9px 12px' }}>
        <RefreshCw size={14} />
      </button>
      <button onClick={() => { setEditing(null); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, ...btnPrimary, padding: '9px 18px' }}>
        <Plus size={15} /> Nuevo proveedor
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Proveedores"
      subtitle="Gestión de proveedores del negocio"
      headerAction={headerAction}
      loading={loading}
      error={error}
      onRetry={load}
    >
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {stats.map(s => (
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
                {['Proveedor', 'RUC / NIT', 'Contacto', 'Teléfono', 'Email', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                    <Truck size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                    {search ? 'Sin resultados para esa búsqueda' : 'No hay proveedores registrados'}
                  </td>
                </tr>
              )}
              {filtered.map((s, idx) => (
                <tr
                  key={s.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(104,66,254,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}
                >
                  <td style={{ padding: '11px 14px', color: '#fff', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Truck size={13} style={{ color: '#6842fe', flexShrink: 0 }} />
                      {s.name}
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: 12 }}>{s.tax_id || '—'}</td>
                  <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.7)' }}>{s.contact || '—'}</td>
                  <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.6)' }}>{s.phone || '—'}</td>
                  <td style={{ padding: '11px 14px', color: 'rgba(255,255,255,0.6)' }}>{s.email || '—'}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: s.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: s.is_active ? '#10b981' : '#ef4444' }}>
                      {s.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setEditing(s); setShowModal(true); }} title="Editar" style={{ padding: '6px 10px', background: 'rgba(104,66,254,0.15)', color: '#6842fe', border: '1px solid rgba(104,66,254,0.25)', borderRadius: 6, cursor: 'pointer' }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(s)} title="Desactivar" style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 6, cursor: 'pointer' }}>
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
            {filtered.length} de {suppliers.length} proveedores
          </div>
        )}
      </div>

      {showModal && (
        <SupplierModal
          supplier={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}
