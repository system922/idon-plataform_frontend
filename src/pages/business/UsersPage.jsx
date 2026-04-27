import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { Plus, Edit2, Trash2, Users, X, Search, RefreshCw, Unlock, CheckCircle, AlertCircle } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginBottom: 6 };
const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.22)', color: '#fff',
  fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
};
const btnPrimary = {
  padding: '10px 22px', background: '#6842fe', color: '#fff',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
};
const btnSecondary = {
  padding: '10px 22px', background: 'transparent', color: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer',
  fontWeight: 600, fontSize: 13,
};
const th      = { padding: '12px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#495', textTransform: 'uppercase' };
const td      = { padding: '14px 12px', color: '#222', fontSize: 13 };
const miniBtn = { background: 'rgba(104,66,254,0.12)', border: '1px solid #6842fe33', color: '#6842fe', borderRadius: 6, cursor: 'pointer', padding: '4px 8px', display: 'inline-flex', alignItems: 'center' };

// ─── Modal ────────────────────────────────────────────────────────────────────

function UserModal({ user, onClose, onSave, saving, roles }) {
  const [form, setForm] = useState({
    first_name: user?.first_name ?? '',
    last_name:  user?.last_name  ?? '',
    email:      user?.email      ?? '',
    password:   '',
    role_id:    user?.role_id    ?? roles?.[0]?.id ?? '',
    is_active:  user != null ? !!user.is_active : true,
  });

  useEffect(() => {
    if (!form.role_id && roles?.length)
      setForm(f => ({ ...f, role_id: roles[0].id }));
  }, [roles, form.role_id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canSubmit = form.first_name && form.last_name && form.email &&
                    (form.password || user) && form.role_id;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2000, padding: 16,
    }}>
      <div style={{
        background: 'linear-gradient(135deg,#1a1f2a 0%,#141920 100%)',
        border: '1px solid rgba(104,66,254,0.25)', borderRadius: 16,
        width: '100%', maxWidth: 460,
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>
            {user ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Nombre</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Nombre" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Apellido</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Apellido" style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={lbl}>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@dominio.com" style={inputStyle} />
          </div>

          <div>
            <label style={lbl}>Rol</label>
            <select value={form.role_id} onChange={e => set('role_id', Number(e.target.value))} style={inputStyle}>
              {roles?.length
                ? roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)
                : <option value="">Sin roles definidos</option>}
            </select>
          </div>

          <div>
            <label style={lbl}>
              Clave {user && <span style={{ color: '#aaa', fontWeight: 400 }}>(dejar vacío para no cambiar)</span>}
            </label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
              placeholder={user ? 'Nueva clave (opcional)' : 'Clave'}
              style={inputStyle} autoComplete="new-password" />
          </div>

          {user && (
            <div>
              <label style={lbl}>Activo</label>
              <select value={form.is_active ? '1' : '0'} onChange={e => set('is_active', e.target.value === '1')} style={inputStyle}>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          )}
        </div>

        <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} disabled={saving} style={btnSecondary}>Cancelar</button>
          <button onClick={() => onSave(form)} disabled={saving || !canSubmit} style={btnPrimary}>
            {saving ? 'Guardando...' : user ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CoreUsersPage() {
  const [users,       setUsers      ] = useState([]);
  const [roles,       setRoles      ] = useState([]);
  const [loading,     setLoading    ] = useState(true);
  const [error,       setError      ] = useState('');
  const [search,      setSearch     ] = useState('');
  const [showModal,   setShowModal  ] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving,      setSaving     ] = useState(false);
  const [modalError,  setModalError ] = useState('');
  const [verifData,   setVerifData  ] = useState(null); // { userId } | null
  const [clave,       setClave      ] = useState('');
  const [verifMsg,    setVerifMsg   ] = useState('');

  // ── Carga ────────────────────────────────────────────────────────────────

  const load = useCallback(() => {
    setLoading(true); setError('');
    fetchWithAuth('/api/core/users')
      .then(r => r.json())
      .then(data => setUsers(
        Array.isArray(data.users)
          ? data.users.map(u => ({
              ...u,
              first_name: u.first_name ?? u.name?.split(' ')[0]          ?? '',
              last_name:  u.last_name  ?? u.name?.split(' ').slice(1).join(' ') ?? '',
            }))
          : []
      ))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchWithAuth('/api/core/roles')
      .then(r => r.json())
      .then(data => setRoles(Array.isArray(data.roles) ? data.roles : []))
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleSave = async (values) => {
    setSaving(true); setModalError('');
    try {
      const isEdit = !!editingUser;
      const res = await fetchWithAuth(
        isEdit ? `/api/core/users/${editingUser.id}` : '/api/core/users',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(values) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar usuario');
      setShowModal(false); setEditingUser(null);
      load();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Desactivar a "${user.first_name} ${user.last_name}"?`)) return;
    setSaving(true);
    try {
      const res  = await fetchWithAuth(`/api/core/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al eliminar');
      load();
    } catch (e) {
      alert(e.message);
    } finally { setSaving(false); }
  };

  const handleVerifClave = async () => {
    setVerifMsg('');
    try {
      const res  = await fetchWithAuth('/api/security/validate-key', {
        method: 'POST',
        body: JSON.stringify({ userId: verifData.userId, key: clave }),
      });
      const data = await res.json();
      setVerifMsg(res.ok && data.valid ? '✔️ Clave correcta' : data.error ?? 'Clave incorrecta');
    } catch {
      setVerifMsg('Error de conexión');
    }
  };

  const openVerif  = user => { setVerifData({ userId: user.id }); setClave(''); setVerifMsg(''); };
  const closeVerif = ()   => { setVerifData(null); setClave(''); setVerifMsg(''); };
  const openCreate = ()   => { setEditingUser(null); setModalError(''); setShowModal(true); };
  const openEdit   = user => { setEditingUser(user); setModalError(''); setShowModal(true); };
  const closeModal = ()   => { setShowModal(false); setEditingUser(null); };

  // ── Filtro ───────────────────────────────────────────────────────────────

  const filtrados = users.filter(u => {
    const q = search.toLowerCase();
    return [u.first_name, u.last_name].join(' ').toLowerCase().includes(q)
      || (u.email ?? '').toLowerCase().includes(q)
      || (roles.find(r => r.id === u.role_id)?.name ?? '').toLowerCase().includes(q);
  });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PageTemplate
      title="Usuarios"
      subtitle="Gestión de usuarios y roles del negocio"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#ccc' }} />
            <input
              type="text" placeholder="Buscar nombre, email, rol..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '9px 12px 9px 32px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f8fafc', color: '#222', fontSize: 13, width: 220 }}
            />
          </div>
          <button onClick={load} title="Recargar" style={{ ...btnSecondary, padding: '9px 12px' }}>
            <RefreshCw size={14} />
          </button>
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, ...btnPrimary, padding: '9px 18px' }}>
            <Plus size={15} /> Nuevo usuario
          </button>
        </div>
      }
    >
      <div style={{ background: '#f7f8fa', border: '1px solid #eceff1', borderRadius: 12, overflow: 'hidden', marginTop: 15 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#eff6ff', borderBottom: '1px solid #eceff1' }}>
                <th style={th}>Nombre</th>
                <th style={th}>Apellido</th>
                <th style={th}>Email</th>
                <th style={th}>Rol</th>
                <th style={th}>Estado</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 14 }}>
                    <Users size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
                    {search ? 'Sin resultados para esa búsqueda' : 'No hay usuarios registrados'}
                  </td>
                </tr>
              ) : filtrados.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #eceff1', background: '#fff' }}>
                  <td style={td}>{user.first_name}</td>
                  <td style={td}>{user.last_name}</td>
                  <td style={td}>{user.email}</td>
                  <td style={td}>{roles.find(r => r.id === user.role_id)?.name ?? user.role_id}</td>
                  <td style={td}>
                    {user.is_active
                      ? <CheckCircle size={17} color="#22c55e" />
                      : <AlertCircle size={17} color="#e11d48" />}
                  </td>
                  <td style={{ ...td, minWidth: 160 }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(user)}    style={miniBtn}><Edit2  size={13} /></button>
                      <button onClick={() => handleDelete(user)} style={miniBtn}><Trash2 size={13} /></button>
                      <button onClick={() => openVerif(user)}   style={miniBtn}><Unlock size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal crear/editar ── */}
      {showModal && (
        <>
          {modalError && (
            <div style={{
              position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
              zIndex: 2100, background: 'rgba(239,68,68,0.9)', color: '#fff',
              padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            }}>
              {modalError}
            </div>
          )}
          <UserModal
            user={editingUser}
            onClose={closeModal}
            onSave={handleSave}
            saving={saving}
            roles={roles}
          />
        </>
      )}

      {/* ── Modal verificar clave ── */}
      {verifData && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.19)',
          zIndex: 2550, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, boxShadow: '0 14px 40px rgba(0,0,0,0.13)',
            padding: 34, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
          }}>
            <label style={{ fontFamily: 'monospace', fontWeight: 700, marginBottom: 4 }}>
              Clave del usuario seleccionado
            </label>
            <input
              type="password" placeholder="Clave" value={clave}
              onChange={e => setClave(e.target.value)}
              style={{ ...inputStyle, color: '#222', background: '#f3f4f6', textAlign: 'center' }}
            />
            <button onClick={handleVerifClave} style={{ ...btnPrimary, minWidth: 95 }}>
              Verificar clave
            </button>
            <div style={{ minHeight: 20, color: verifMsg.includes('✔') ? '#16a34a' : '#e11d48', fontWeight: 600 }}>
              {verifMsg}
            </div>
            <button onClick={closeVerif} style={btnSecondary}>Cerrar</button>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}