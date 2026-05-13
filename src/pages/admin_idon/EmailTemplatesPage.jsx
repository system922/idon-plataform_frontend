import React, { useState, useEffect } from 'react';
import {
  FiMail, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiEye, FiCode,
} from 'react-icons/fi';
import { useConfirm } from '../../context/ConfirmContext';
import { adminApiService } from '../../services/apiService';
import '../../styles/AdminPages.css';

const TYPE_COLORS = {
  bienvenida:        '#22c55e',
  recordatorio_pago: '#f59e0b',
  suspension:        '#ef4444',
  activacion:        '#6366f1',
};
const PALETTE = ['#22c55e','#f59e0b','#ef4444','#6366f1','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];
const colorFor = (type, i) => TYPE_COLORS[type] || PALETTE[i % PALETTE.length];

export default function EmailTemplatesPage() {
  const { showConfirm } = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editModal, setEditModal] = useState(null); // null | 'new' | template
  const [deleting,  setDeleting]  = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const r = await adminApiService.get('/admin/email-templates');
      setTemplates(r.data || r || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (type) => {
    if (!await showConfirm(`¿Eliminar la plantilla "${type}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(type);
    try {
      await adminApiService.delete(`/admin/email-templates/${type}`);
      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (tpl) => {
    try {
      await adminApiService.put(`/admin/email-templates/${tpl.type}`, {
        ...tpl, is_active: !tpl.is_active,
      });
      await load();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Plantillas de Email</h1>
          <p className="admin-page-subtitle">
            Edita y gestiona los correos enviados a dueños de negocios sobre pagos y suscripciones
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="admin-btn admin-btn-secondary" onClick={load}>
            <FiRefreshCw size={14} /> Actualizar
          </button>
          <button
            className="admin-btn admin-btn-primary"
            onClick={() => setEditModal('new')}
            style={{ background: 'linear-gradient(135deg,#818cf8,#6366f1)', color: '#fff', border: 'none' }}
          >
            <FiPlus size={14} /> Nueva plantilla
          </button>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><h2>Plantillas ({templates.length})</h2></div>
        <div className="admin-card-body">
          {loading ? (
            <div className="admin-loading"><div className="admin-spinner" />Cargando...</div>
          ) : templates.length === 0 ? (
            <div className="admin-empty">
              <div className="admin-empty-icon"><FiMail size={36} /></div>
              <p className="admin-empty-title">Sin plantillas</p>
              <p className="admin-empty-subtitle">Crea tu primera plantilla de email</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr>
                  <th>Tipo</th><th>Nombre</th><th>Asunto</th>
                  <th>Variables</th><th>Estado</th><th>Actualizado</th><th>Acciones</th>
                </tr></thead>
                <tbody>
                  {templates.map((t, i) => {
                    const clr = colorFor(t.type, i);
                    return (
                      <tr key={t.type}>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                            fontSize: 11, fontWeight: 700,
                            background: `${clr}18`, color: clr, border: `1px solid ${clr}44`,
                          }}>{t.type}</span>
                        </td>
                        <td>
                          <strong style={{ fontSize: 13 }}>{t.label}</strong>
                          {t.description && (
                            <div style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginTop: 2 }}>
                              {t.description}
                            </div>
                          )}
                        </td>
                        <td style={{
                          fontSize: 12, color: 'var(--admin-text-muted)',
                          maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {t.subject || '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {(t.variables || []).map(v => (
                              <span key={v} style={{
                                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                background: 'rgba(100,116,139,.1)', color: '#64748b', fontFamily: 'monospace',
                              }}>
                                {`{{${v}}}`}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggle(t)}
                            style={{
                              padding: '3px 12px', borderRadius: 20, fontSize: 11,
                              fontWeight: 700, cursor: 'pointer',
                              background: t.is_active ? 'rgba(34,197,94,.1)' : 'rgba(156,163,175,.1)',
                              color: t.is_active ? '#22c55e' : '#9ca3af',
                              border: `1px solid ${t.is_active ? 'rgba(34,197,94,.3)' : 'rgba(156,163,175,.3)'}`,
                            }}
                          >
                            {t.is_active ? '✓ Activa' : '✗ Inactiva'}
                          </button>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--admin-text-muted)' }}>
                          {new Date(t.updated_at).toLocaleDateString('es-EC')}
                        </td>
                        <td>
                          <div className="admin-table-actions">
                            <button
                              className="admin-table-btn"
                              onClick={() => setEditModal(t)}
                              style={{ color: '#6366f1' }}
                            >
                              <FiEdit2 size={13} /> Editar
                            </button>
                            <button
                              className="admin-table-btn admin-table-btn-danger"
                              onClick={() => handleDelete(t.type)}
                              disabled={deleting === t.type}
                            >
                              <FiTrash2 size={13} /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editModal && (
        <EditModal
          tpl={editModal === 'new' ? null : editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => { setEditModal(null); load(); }}
        />
      )}
    </div>
  );
}

function EditModal({ tpl, onClose, onSaved }) {
  const isNew = !tpl;
  const [form, setForm] = useState({
    type:        tpl?.type        || '',
    label:       tpl?.label       || '',
    description: tpl?.description || '',
    subject:     tpl?.subject     || '',
    body:        tpl?.body        || '',
    is_active:   tpl?.is_active   !== false,
  });
  const [tab,    setTab]    = useState('edit');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const detectedVars = [...new Set(
    (form.body.match(/\{\{(\w+)\}\}/g) || []).map(v => v.slice(2, -2))
  )];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.label.trim() || !form.subject.trim() || !form.body.trim()) {
      return setError('Nombre, asunto y cuerpo son requeridos');
    }
    if (isNew && !form.type.trim()) return setError('El tipo es requerido');
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, variables: detectedVars };
      if (isNew) {
        await adminApiService.post('/admin/email-templates', payload);
      } else {
        await adminApiService.put(`/admin/email-templates/${tpl.type}`, payload);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border-light)',
    color: 'var(--admin-text-primary)', boxSizing: 'border-box',
  };
  const lbl = {
    display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', color: '#8CB79B',
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal"
        style={{ maxWidth: 800, width: '95vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h2>
            <FiMail size={17} style={{ marginRight: 8, color: '#6366f1' }} />
            {isNew ? 'Nueva plantilla' : `Editar: ${tpl.label}`}
          </h2>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Row 1: type (solo nuevo) + label + estado */}
          <div style={{ display: 'grid', gridTemplateColumns: isNew ? '1fr 1fr 140px' : '1fr 140px', gap: 12 }}>
            {isNew && (
              <div>
                <label style={lbl}>Tipo / clave única</label>
                <input
                  style={inp}
                  value={form.type}
                  onChange={e => set('type', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="ej: recordatorio_pago"
                />
              </div>
            )}
            <div>
              <label style={lbl}>Nombre visible</label>
              <input
                style={inp}
                value={form.label}
                onChange={e => set('label', e.target.value)}
                placeholder="ej: Recordatorio de pago"
              />
            </div>
            <div>
              <label style={lbl}>Estado</label>
              <button
                type="button"
                onClick={() => set('is_active', !form.is_active)}
                style={{
                  width: '100%', height: 38, borderRadius: 8, fontSize: 13,
                  cursor: 'pointer', fontWeight: 700,
                  background: form.is_active ? 'rgba(34,197,94,.1)' : 'rgba(156,163,175,.1)',
                  color:  form.is_active ? '#22c55e' : '#9ca3af',
                  border: `1px solid ${form.is_active ? 'rgba(34,197,94,.3)' : 'rgba(156,163,175,.3)'}`,
                }}
              >
                {form.is_active ? '✓ Activa' : '✗ Inactiva'}
              </button>
            </div>
          </div>

          {/* Row 2: description */}
          <div>
            <label style={lbl}>Descripción</label>
            <input
              style={inp}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="¿Cuándo se usa esta plantilla?"
            />
          </div>

          {/* Row 3: subject */}
          <div>
            <label style={lbl}>Asunto del email</label>
            <input
              style={inp}
              value={form.subject}
              onChange={e => set('subject', e.target.value)}
              placeholder="ej: Recordatorio de pago — {{business_name}}"
            />
          </div>

          {/* Variables hint */}
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.2)',
            fontSize: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4,
          }}>
            <span style={{ color: '#8b5cf6', fontWeight: 700 }}>Disponibles:</span>
            {['owner_name','business_name','amount','due_date'].map(v => (
              <span key={v} style={{
                padding: '1px 7px', borderRadius: 4,
                background: 'rgba(99,102,241,.12)', color: '#6366f1',
                fontFamily: 'monospace', fontSize: 11,
              }}>{`{{${v}}}`}</span>
            ))}
            {detectedVars.length > 0 && (
              <>
                <span style={{ color: 'var(--admin-text-muted)', marginLeft: 4 }}>· Detectadas en cuerpo:</span>
                {detectedVars.map(v => (
                  <span key={v} style={{
                    padding: '1px 7px', borderRadius: 4,
                    background: 'rgba(34,197,94,.12)', color: '#16a34a',
                    fontFamily: 'monospace', fontSize: 11,
                  }}>{`{{${v}}}`}</span>
                ))}
              </>
            )}
          </div>

          {/* Body editor / preview */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...lbl, margin: 0 }}>Cuerpo HTML</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  className={`admin-filter-btn ${tab === 'edit' ? 'active' : ''}`}
                  onClick={() => setTab('edit')}
                  style={{ padding: '3px 12px', fontSize: 11 }}
                >
                  <FiCode size={11} /> Código
                </button>
                <button
                  type="button"
                  className={`admin-filter-btn ${tab === 'preview' ? 'active' : ''}`}
                  onClick={() => setTab('preview')}
                  style={{ padding: '3px 12px', fontSize: 11 }}
                >
                  <FiEye size={11} /> Vista previa
                </button>
              </div>
            </div>
            {tab === 'edit' ? (
              <textarea
                style={{ ...inp, minHeight: 280, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                value={form.body}
                onChange={e => set('body', e.target.value)}
                placeholder="<p>Estimado <strong>{{owner_name}}</strong>, ...</p>"
                spellCheck={false}
              />
            ) : (
              <div style={{
                border: '1px solid var(--admin-border-light)', borderRadius: 8,
                overflow: 'hidden', minHeight: 280, background: '#fff',
              }}>
                <iframe
                  title="email-preview"
                  srcDoc={form.body}
                  style={{ width: '100%', minHeight: 280, border: 'none', display: 'block' }}
                />
              </div>
            )}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', color: '#dc2626',
            }}>
              {error}
            </div>
          )}
        </div>

        <div className="admin-modal-footer">
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="admin-btn admin-btn-primary"
            disabled={saving}
            onClick={handleSave}
            style={{ background: 'linear-gradient(135deg,#818cf8,#6366f1)', color: '#fff', border: 'none' }}
          >
            {saving ? 'Guardando...' : isNew ? 'Crear plantilla' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
