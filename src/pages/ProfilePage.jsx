import React, { useState, useEffect } from 'react';
import { FiUser, FiMail, FiPhone, FiShield, FiCheck, FiEdit2, FiEye, FiEyeOff } from 'react-icons/fi';
import apiService from '../services/apiService';

const inp = {
  width: '100%', padding: '10px 13px', borderRadius: '8px', fontSize: '14px',
  background: 'var(--admin-bg-primary, #1a1a2e)', border: '1px solid var(--admin-border-light, #2a2a4a)',
  color: 'var(--admin-text-primary, #e2e8f0)', outline: 'none', boxSizing: 'border-box',
};

const Lbl = ({ children }) => (
  <label style={{
    display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.5px', color: '#8CB79B',
  }}>
    {children}
  </label>
);

function getInitials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?';
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('idonUser')) || null; } catch { return null; }
}

export default function ProfilePage({ user: userProp }) {
  const user = userProp || getStoredUser();
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [editMode,  setEditMode]  = useState(false);
  const [form,      setForm]      = useState({ firstName: '', lastName: '', phone: '' });
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);  // { type: 'ok'|'err', text }

  const [pwForm,    setPwForm]    = useState({ current: '', next: '', confirm: '' });
  const [showPw,    setShowPw]    = useState({ current: false, next: false, confirm: false });
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMsg,     setPwMsg]     = useState(null);

  const userType = user?.userType;
  const hasPhone = userType !== 'admin_idon' && userType !== 'schema_employee';

  useEffect(() => {
    apiService.get('/auth/me')
      .then(r => {
        setProfile(r.data);
        setForm({
          firstName: r.data.first_name || '',
          lastName:  r.data.last_name  || '',
          phone:     r.data.phone      || '',
        });
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const r = await apiService.put('/auth/me', {
        firstName: form.firstName,
        lastName:  form.lastName,
        phone:     form.phone || undefined,
      });
      setProfile(r.data);
      setMsg({ type: 'ok', text: 'Perfil actualizado correctamente' });
      setEditMode(false);
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Error al guardar' });
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm)
      return setPwMsg({ type: 'err', text: 'Las contraseñas nuevas no coinciden' });
    if (pwForm.next.length < 6)
      return setPwMsg({ type: 'err', text: 'La nueva contraseña debe tener al menos 6 caracteres' });
    setPwSaving(true);
    try {
      const r = await apiService.put('/auth/change-password', {
        currentPassword: pwForm.current,
        newPassword:     pwForm.next,
      });
      setPwMsg({ type: 'ok', text: r.message || 'Contraseña actualizada' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwMsg({ type: 'err', text: err.message || 'Error al cambiar contraseña' });
    } finally { setPwSaving(false); }
  };

  const fullName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : '—';
  const roleLabel = profile?.role_name || profile?.role || user?.role || user?.userType || '—';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <div className="admin-spinner" /> Cargando perfil...
    </div>
  );

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Mi Perfil</h1>
        <p className="admin-page-subtitle">Visualiza y edita tu información personal</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Tarjeta de identidad ── */}
        <div className="admin-card">
          <div className="admin-card-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff8c42, #e07030)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: '#fff',
              margin: '0 auto 16px',
              boxShadow: '0 4px 16px rgba(255,140,66,.35)',
            }}>
              {getInitials(profile?.first_name, profile?.last_name)}
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{fullName}</h3>
            <p style={{ margin: '4px 0 12px', color: 'var(--admin-text-muted)', fontSize: 13 }}>
              {profile?.email || user?.email || '—'}
            </p>
            <span style={{
              display: 'inline-block', padding: '3px 12px', borderRadius: 20,
              background: '#8CB79B20', color: '#8CB79B', fontSize: 12, fontWeight: 700,
              border: '1px solid #8CB79B40',
            }}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* ── Información editable + contraseña ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Info personal */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2><FiUser size={15} style={{ marginRight: 6 }} />Información personal</h2>
              {!editMode && (
                <button className="admin-btn admin-btn-secondary" onClick={() => setEditMode(true)}>
                  <FiEdit2 size={13} /> Editar
                </button>
              )}
            </div>
            <div className="admin-card-body">
              {msg && (
                <div style={{
                  marginBottom: 14, padding: '9px 13px', borderRadius: 8, fontSize: 13,
                  background: msg.type === 'ok' ? '#8CB79B20' : '#ef444420',
                  color:      msg.type === 'ok' ? '#8CB79B'   : '#ef4444',
                  border: `1px solid ${msg.type === 'ok' ? '#8CB79B40' : '#ef444440'}`,
                }}>
                  {msg.text}
                </div>
              )}

              {editMode ? (
                <form onSubmit={handleSave}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="admin-form-group">
                      <Lbl>Nombre *</Lbl>
                      <input style={inp} value={form.firstName}
                        onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
                    </div>
                    <div className="admin-form-group">
                      <Lbl>Apellido *</Lbl>
                      <input style={inp} value={form.lastName}
                        onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                    </div>
                  </div>

                  {hasPhone && (
                    <div className="admin-form-group">
                      <Lbl>Teléfono</Lbl>
                      <input style={inp} value={form.phone} placeholder="ej. 0987654321"
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                      <FiCheck size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button type="button" className="admin-btn admin-btn-secondary"
                      onClick={() => { setEditMode(false); setMsg(null); }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <InfoRow icon={<FiUser size={14} />}  label="Nombre"   value={fullName} />
                  <InfoRow icon={<FiMail size={14} />}  label="Email"    value={profile?.email || user?.email || '—'} />
                  {hasPhone && (
                    <InfoRow icon={<FiPhone size={14} />} label="Teléfono" value={profile?.phone || '—'} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cambiar contraseña */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2><FiShield size={15} style={{ marginRight: 6 }} />Cambiar contraseña</h2>
            </div>
            <div className="admin-card-body">
              {pwMsg && (
                <div style={{
                  marginBottom: 14, padding: '9px 13px', borderRadius: 8, fontSize: 13,
                  background: pwMsg.type === 'ok' ? '#8CB79B20' : '#ef444420',
                  color:      pwMsg.type === 'ok' ? '#8CB79B'   : '#ef4444',
                  border: `1px solid ${pwMsg.type === 'ok' ? '#8CB79B40' : '#ef444440'}`,
                }}>
                  {pwMsg.text}
                </div>
              )}
              <form onSubmit={handlePasswordChange}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <PwField label="Contraseña actual" value={pwForm.current} show={showPw.current}
                    onChange={v => setPwForm(f => ({ ...f, current: v }))}
                    onToggle={() => setShowPw(s => ({ ...s, current: !s.current }))} />
                  <PwField label="Nueva contraseña" value={pwForm.next} show={showPw.next}
                    onChange={v => setPwForm(f => ({ ...f, next: v }))}
                    onToggle={() => setShowPw(s => ({ ...s, next: !s.next }))} />
                  <PwField label="Confirmar nueva contraseña" value={pwForm.confirm} show={showPw.confirm}
                    onChange={v => setPwForm(f => ({ ...f, confirm: v }))}
                    onToggle={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))} />
                </div>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  style={{ marginTop: 16 }}
                  disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm}
                >
                  <FiShield size={14} /> {pwSaving ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: '#8CB79B', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--admin-text-muted)', width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function PwField({ label, value, show, onChange, onToggle }) {
  return (
    <div className="admin-form-group">
      <Lbl>{label}</Lbl>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          style={{ ...inp, paddingRight: 40 }}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--admin-text-muted)', padding: 0,
          }}
        >
          {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
        </button>
      </div>
    </div>
  );
}
