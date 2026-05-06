import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { Plus, Edit2, Trash2, Users, X, Search, RefreshCw, Unlock, CheckCircle, AlertCircle } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/UsersPage.css';

// ─── Modal de usuario ────────────────────────────────────────────────────────────────────

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
  }, [roles]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canSubmit = form.first_name && form.last_name && form.email &&
                    (form.password || user) && form.role_id;

  return (
    <div className="users-modal-overlay">
      <div className="users-modal">
        <div className="users-modal-header">
          <h2 className="users-modal-title">
            {user ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button onClick={onClose} className="users-modal-close">
            <X size={18} />
          </button>
        </div>

        <div className="users-modal-body">
          <div className="users-form-row">
            <div className="users-form-group">
              <label className="users-form-label">Nombre</label>
              <input 
                value={form.first_name} 
                onChange={e => set('first_name', e.target.value)} 
                placeholder="Nombre" 
                className="users-form-input"
              />
            </div>
            <div className="users-form-group">
              <label className="users-form-label">Apellido</label>
              <input 
                value={form.last_name} 
                onChange={e => set('last_name', e.target.value)} 
                placeholder="Apellido" 
                className="users-form-input"
              />
            </div>
          </div>

          <div>
            <label className="users-form-label">Email</label>
            <input 
              type="email" 
              value={form.email} 
              onChange={e => set('email', e.target.value)} 
              placeholder="email@dominio.com" 
              className="users-form-input"
            />
          </div>

          <div>
            <label className="users-form-label">Rol</label>
            <select 
              value={form.role_id} 
              onChange={e => set('role_id', Number(e.target.value))} 
              className="users-form-select"
            >
              {roles?.length
                ? roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)
                : <option value="">Sin roles definidos</option>}
            </select>
          </div>

          <div>
            <label className="users-form-label">
              Clave {user && <span className="users-form-label-hint">(dejar vacío para no cambiar)</span>}
            </label>
            <input 
              type="password" 
              value={form.password} 
              onChange={e => set('password', e.target.value)}
              placeholder={user ? 'Nueva clave (opcional)' : 'Clave'}
              className="users-form-input"
              autoComplete="new-password" 
            />
          </div>

          {user && (
            <div>
              <label className="users-form-label">Activo</label>
              <select 
                value={form.is_active ? '1' : '0'} 
                onChange={e => set('is_active', e.target.value === '1')} 
                className="users-form-select"
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          )}
        </div>

        <div className="users-modal-footer">
          <button onClick={onClose} disabled={saving} className="users-btn-secondary">
            Cancelar
          </button>
          <button onClick={() => onSave(form)} disabled={saving || !canSubmit} className="users-btn-primary">
            {saving ? 'Guardando...' : user ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────────────────────

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
  const [refreshing,  setRefreshing ] = useState(false);
  const [verifData,   setVerifData  ] = useState(null);
  const [clave,       setClave      ] = useState('');
  const [verifMsg,    setVerifMsg   ] = useState('');

  // ── Carga ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true); 
    setError('');
    try {
      const res = await fetchWithAuth('/api/core/users');
      const data = await res.json();
      setUsers(
        Array.isArray(data.users)
          ? data.users.map(u => ({
              ...u,
              first_name: u.first_name ?? u.name?.split(' ')[0] ?? '',
              last_name:  u.last_name  ?? u.name?.split(' ').slice(1).join(' ') ?? '',
            }))
          : []
      );
    } catch {
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithAuth('/api/core/roles')
      .then(r => r.json())
      .then(data => setRoles(Array.isArray(data.roles) ? data.roles : []))
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Refresh ────────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleSave = async (values) => {
    setSaving(true); 
    setModalError('');
    try {
      const isEdit = !!editingUser;
      const res = await fetchWithAuth(
        isEdit ? `/api/core/users/${editingUser.id}` : '/api/core/users',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(values) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar usuario');
      setShowModal(false); 
      setEditingUser(null);
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
    } finally { 
      setSaving(false); 
    }
  };

  const handleVerifClave = async () => {
    setVerifMsg('');
    try {
      const res  = await fetchWithAuth('/api/security/validate-key', {
        method: 'POST',
        body: JSON.stringify({ userId: verifData.userId, key: clave }),
      });
      const data = await res.json();
      setVerifMsg(res.ok && data.valid ? '✔️ Clave correcta' : data.error ?? '❌ Clave incorrecta');
    } catch {
      setVerifMsg('❌ Error de conexión');
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

  // ── Botón de actualizar para el header ───────────────────────────────────

  const refreshButton = (
    <button 
      onClick={handleRefresh} 
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <RefreshCw size={18} className={refreshing ? 'spinning' : ''} /> 
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PageTemplate
      title="USUARIOS"
      subtitle="Gestión de usuarios y roles del negocio"
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
      headerAction={refreshButton}
    >
      <div className="users-page">
        {/* Barra de búsqueda y botón nuevo usuario JUNTOS */}
        <div className="users-search-row">
          <div className="users-search-wrapper">
            <Search size={16} className="users-search-icon" />
            <input
              type="text" 
              placeholder="Buscar nombre, email, rol..."
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="users-search-input"
            />
          </div>
          <button onClick={openCreate} className="users-btn-new">
            <Plus size={14} /> Nuevo Usuario
          </button>
        </div>

        {/* Tabla de usuarios */}
        <div className="users-table-container">
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="users-empty-state">
                      <Users size={48} className="users-empty-icon" />
                      <span className="users-empty-text">
                        {search ? 'Sin resultados para esa búsqueda' : 'No hay usuarios registrados'}
                      </span>
                    </td>
                  </tr>
                ) : (
                  filtrados.map(user => (
                    <tr key={user.id}>
                      <td data-label="Nombre">{user.first_name}</td>
                      <td data-label="Apellido">{user.last_name}</td>
                      <td data-label="Email">{user.email}</td>
                      <td data-label="Rol">
                        <span className="users-role-badge">
                          {roles.find(r => r.id === user.role_id)?.name ?? user.role_id}
                        </span>
                      </td>
                      <td data-label="Estado">
                        {user.is_active ? (
                          <div className="users-status-active">
                            <CheckCircle size={16} />
                            <span>Activo</span>
                          </div>
                        ) : (
                          <div className="users-status-inactive">
                            <AlertCircle size={16} />
                            <span>Inactivo</span>
                          </div>
                        )}
                      </td>
                      <td data-label="Acciones">
                        <div className="users-action-buttons">
                          <button onClick={() => openEdit(user)} className="users-btn-icon">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(user)} className="users-btn-icon">
                            <Trash2 size={14} />
                          </button>
                          <button onClick={() => openVerif(user)} className="users-btn-icon">
                            <Unlock size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal crear/editar ── */}
      {showModal && (
        <>
          {modalError && (
            <div className="users-modal-error">
              ⚠️ {modalError}
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
        <div className="users-verif-overlay">
          <div className="users-verif-modal">
            <h3 className="users-verif-title">Verificar clave</h3>
            <label className="users-verif-label">Ingrese la clave del usuario</label>
            <input
              type="password" 
              placeholder="Clave" 
              value={clave}
              onChange={e => setClave(e.target.value)}
              className="users-verif-input"
              onKeyPress={e => e.key === 'Enter' && handleVerifClave()}
            />
            <button onClick={handleVerifClave} className="users-btn-verif">
              Verificar clave
            </button>
            <div className={`users-verif-message ${verifMsg.includes('✔') ? 'users-verif-message-success' : 'users-verif-message-error'}`}>
              {verifMsg}
            </div>
            <button onClick={closeVerif} className="users-btn-secondary">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}