// ========== src/pages/ProfilePage.jsx ==========

import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import { useSession } from '../../context/SessionContext';
import {
  FiUser, FiMail, FiPhone, FiShield,
  FiEdit2, FiEye, FiEyeOff,
  FiRefreshCw, FiX, FiSave
} from 'react-icons/fi';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import { api } from '../../config/api';

function getInitials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?';
}

export default function ProfilePage() {
  const { user, updateUser } = useSession();
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Estado de edición
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  
  // Estado de contraseña
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);

  const userType = user?.userType;
  const hasPhone = userType !== 'admin_idon' && userType !== 'schema_employee';

  // ─── Cargar perfil ──────────────────────────────────────────────────────
  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/auth/me');
      const data = response.data?.data || response.data;
      setProfile(data);
      setForm({
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        phone: data.phone || '',
      });
    } catch (err) {
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put('/auth/me', {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
      });
      const data = response.data?.data || response.data;
      setProfile(data);
      updateUser({ firstName: form.firstName, lastName: form.lastName, phone: form.phone });
      
      await alert.success('Perfil actualizado correctamente', 'Perfil Actualizado');
      setEditMode(false);
    } catch (err) {
      await alert.error(err.response?.data?.message || err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    
    if (pwForm.next !== pwForm.confirm) {
      await alert.error('Las contraseñas nuevas no coinciden');
      setPwSaving(false);
      return;
    }
    
    if (pwForm.next.length < 6) {
      await alert.error('La nueva contraseña debe tener al menos 6 caracteres');
      setPwSaving(false);
      return;
    }

    try {
      await api.put('/auth/change-password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      
      await alert.success('Contraseña actualizada correctamente', 'Contraseña Actualizada');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      await alert.error(err.response?.data?.message || err.message || 'Error al cambiar contraseña');
    } finally {
      setPwSaving(false);
    }
  };

  // ─── Datos del usuario ──────────────────────────────────────────────────
  const fullName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    : '—';
  
  const rawRoleLabel = profile?.role_name || profile?.role || user?.role || user?.userType || '—';
  const roleLabel = rawRoleLabel.toLowerCase() === 'owner' ? 'Administrador' : rawRoleLabel;

  // ─── Botón de refrescar ──────────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="MI PERFIL"
      subtitle="Visualiza y edita tu información personal"
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
      headerAction={refreshButton}
    >
      <div className="profile-grid">
        {/* ─── Tarjeta de identidad ────────────────────────────────────── */}
        <div className="profile-card profile-identity-card">
          <div className="profile-card-body profile-card-center">
            <div className="profile-avatar">
              {getInitials(profile?.first_name, profile?.last_name)}
            </div>
            <h3 className="profile-name">{fullName}</h3>
            <p className="profile-email">{profile?.email || user?.email || '—'}</p>
            <span className="profile-role">{roleLabel}</span>
          </div>
        </div>

        {/* ─── Columna derecha ──────────────────────────────────────────── */}
        <div className="profile-right-column">
          
          {/* ─── Información personal ──────────────────────────────────── */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h2><FiUser size={15} /> Información personal</h2>
              {!editMode && (
                <IconTextButton
                  variant="blue"
                  size="sm"
                  icon={<FiEdit2 size={13} />}
                  onClick={() => setEditMode(true)}
                >
                  Editar
                </IconTextButton>
              )}
            </div>
            <div className="profile-card-body">
              {editMode ? (
                <form onSubmit={handleSave} className="profile-form">
                  <div className="profile-form-grid">
                    <div className="profile-form-group">
                      <label>Nombre *</label>
                      <Input
                        type="text"
                        value={form.firstName}
                        onChange={(value) => setForm(f => ({ ...f, firstName: value }))}
                        placeholder="Nombre"
                        size="md"
                        required
                      />
                    </div>
                    <div className="profile-form-group">
                      <label>Apellido *</label>
                      <Input
                        type="text"
                        value={form.lastName}
                        onChange={(value) => setForm(f => ({ ...f, lastName: value }))}
                        placeholder="Apellido"
                        size="md"
                        required
                      />
                    </div>
                  </div>

                  {hasPhone && (
                    <div className="profile-form-group">
                      <label>Teléfono</label>
                      <Input
                        type="tel"
                        value={form.phone}
                        onChange={(value) => setForm(f => ({ ...f, phone: value }))}
                        placeholder="ej. 0987654321"
                        size="md"
                      />
                    </div>
                  )}

                  <div className="profile-form-actions">
                    <IconTextButton
                      variant="success"
                      size="md"
                      icon={<FiSave size={14} />}
                      type="submit"
                      disabled={saving}
                      loading={saving}
                    >
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </IconTextButton>
                    <IconTextButton
                      variant="danger"
                      size="md"
                      icon={<FiX size={14} />}
                      onClick={() => { setEditMode(false); }}
                      disabled={saving}
                    >
                      Cancelar
                    </IconTextButton>
                  </div>
                </form>
              ) : (
                <div className="profile-info-list">
                  <div className="profile-info-row">
                    <FiUser size={14} className="profile-info-icon" />
                    <span className="profile-info-label">Nombre</span>
                    <span className="profile-info-value">{fullName}</span>
                  </div>
                  <div className="profile-info-row">
                    <FiMail size={14} className="profile-info-icon" />
                    <span className="profile-info-label">Email</span>
                    <span className="profile-info-value">{profile?.email || user?.email || '—'}</span>
                  </div>
                  {hasPhone && (
                    <div className="profile-info-row">
                      <FiPhone size={14} className="profile-info-icon" />
                      <span className="profile-info-label">Teléfono</span>
                      <span className="profile-info-value">{profile?.phone || '—'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─── Cambiar contraseña ────────────────────────────────────── */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h2><FiShield size={15} /> Cambiar contraseña</h2>
            </div>
            <div className="profile-card-body">
              <form onSubmit={handlePasswordChange} className="profile-password-form">
                <div className="profile-password-fields">
                  
                  {/* Contraseña actual */}
                  <div className="profile-form-group">
                    <label>Contraseña actual</label>
                    <div className="profile-password-input-wrapper">
                      <input
                        type={showPw.current ? 'text' : 'password'}
                        value={pwForm.current}
                        onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))}
                        placeholder="••••••••"
                        className="profile-password-field"
                        required
                      />
                      <button
                        type="button"
                        className="profile-password-toggle"
                        onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}
                        tabIndex="-1"
                      >
                        {showPw.current ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Nueva contraseña */}
                  <div className="profile-form-group">
                    <label>Nueva contraseña</label>
                    <div className="profile-password-input-wrapper">
                      <input
                        type={showPw.next ? 'text' : 'password'}
                        value={pwForm.next}
                        onChange={(e) => setPwForm(f => ({ ...f, next: e.target.value }))}
                        placeholder="••••••••"
                        className="profile-password-field"
                        required
                      />
                      <button
                        type="button"
                        className="profile-password-toggle"
                        onClick={() => setShowPw(s => ({ ...s, next: !s.next }))}
                        tabIndex="-1"
                      >
                        {showPw.next ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar nueva contraseña */}
                  <div className="profile-form-group">
                    <label>Confirmar nueva contraseña</label>
                    <div className="profile-password-input-wrapper">
                      <input
                        type={showPw.confirm ? 'text' : 'password'}
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                        placeholder="••••••••"
                        className="profile-password-field"
                        required
                      />
                      <button
                        type="button"
                        className="profile-password-toggle"
                        onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                        tabIndex="-1"
                      >
                        {showPw.confirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                      </button>
                    </div>
                  </div>

                </div>

                <IconTextButton
                  variant="primary"
                  size="md"
                  icon={<FiShield size={14} />}
                  type="submit"
                  disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm}
                  loading={pwSaving}
                >
                  {pwSaving ? 'Actualizando...' : 'Actualizar contraseña'}
                </IconTextButton>
              </form>
            </div>
          </div>

        </div>
      </div>
    </PageTemplate>
  );
}