import React, { useState, useEffect } from 'react';
import {
  FiCheck, FiRefreshCw,
  FiEdit2, FiSend, FiEye, FiToggleLeft, FiToggleRight, FiX,
} from 'react-icons/fi';
import apiService from '../../services/apiService';
import '../../styles/AdminPages.css';

const TYPE_META = {
  registro:      { color: '#8CB79B', icon: '👋', title: 'Registro de Negocio',    badge: 'REGISTRO' },
  aprobacion:    { color: '#22c55e', icon: '🎉', title: 'Aprobación de Negocio',  badge: 'APROBACIÓN' },
  suscripcion:   { color: '#3b82f6', icon: '📦', title: 'Suscripción Activada',   badge: 'SUSCRIPCIÓN' },
  recordatorio:  { color: '#f59e0b', icon: '⏰', title: 'Recordatorio de Pago',   badge: 'RECORDATORIO' },
  pago_recibido: { color: '#ff8c42', icon: '✅', title: 'Pago Recibido',           badge: 'PAGO' },
};

const SAMPLE_VARS = {
  registro:      { firstName:'Juan', lastName:'Pérez', email:'juan@ejemplo.com', businessName:'Café Central', businessSlug:'cafe-central', supportNumber:'593987654321' },
  aprobacion:    { firstName:'Ana', lastName:'Torres', businessName:'Panadería Sol', businessSlug:'panaderia-sol', supportNumber:'593987654321' },
  suscripcion:   { firstName:'Carlos', lastName:'López', businessName:'Tech Studio', plan:'Mensual', amount:'45.00', nextBillingDate:'25/05/2026', supportNumber:'593987654321' },
  recordatorio:  { firstName:'María', lastName:'García', businessName:'Restaurante La Mesa', daysLeft:'3', amount:'35.00', dueDate:'27/04/2026', supportNumber:'593987654321' },
  pago_recibido: { firstName:'Pedro', lastName:'Ruiz', businessName:'Tienda Ropa', invoiceNumber:'INV-1745678901234', amount:'35.00', paymentDate:'24/04/2026', nextBillingDate:'24/05/2026', supportNumber:'593987654321' },
};

const inp = {
  width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '13px',
  background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border-light)',
  color: 'var(--admin-text-primary)', outline: 'none',
};

function renderPreview(body, type) {
  const vars = SAMPLE_VARS[type] || {};
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => `<span style="color:#ff8c42;font-weight:700">${vars[k] ?? `{{${k}}}`}</span>`);
}

export default function WhatsAppNotifications() {
  const [templates,  setTemplates]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState(null); // { type, body, is_active }
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState(null);
  const [preview,    setPreview]    = useState(null); // type being previewed
  const [testModal,  setTestModal]  = useState(null); // type being tested
  const [testPhone,  setTestPhone]  = useState('');
  const [testSending,setTestSending]= useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiService.get('/admin/whatsapp-templates');
      setTemplates(r.data || []);
    } catch (e) {
      setMsg({ ok: false, text: 'Error cargando plantillas: ' + e.message });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000); };

  const handleEdit = (tpl) => setEditing({ type: tpl.type, body: tpl.body, is_active: tpl.is_active });

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.put(`/admin/whatsapp-templates/${editing.type}`, {
        body: editing.body,
        is_active: editing.is_active,
      });
      flash(true, '✅ Plantilla guardada correctamente');
      setEditing(null);
      load();
    } catch (e) {
      flash(false, '❌ Error: ' + e.message);
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) return flash(false, 'Ingresa un número de teléfono');
    setTestSending(true);
    try {
      await apiService.post('/admin/whatsapp-templates/test', {
        type: testModal,
        phone: testPhone.trim(),
        vars: SAMPLE_VARS[testModal] || {},
      });
      flash(true, `✅ Mensaje de prueba enviado a ${testPhone}`);
      setTestModal(null);
      setTestPhone('');
    } catch (e) {
      flash(false, '❌ ' + e.message);
    } finally { setTestSending(false); }
  };

  const tplMap = Object.fromEntries(templates.map(t => [t.type, t]));

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Notificaciones WhatsApp</h1>
        <p className="admin-page-subtitle">Gestiona y personaliza las plantillas de mensajes automáticos</p>
      </div>

      {msg && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 8,
          background: msg.ok ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
          border: `1px solid ${msg.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
          color: msg.ok ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 600,
        }}>
          {msg.text}
        </div>
      )}

      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, gap: 10 }}>
        <button className="admin-btn admin-btn-secondary" onClick={load} disabled={loading}>
          <FiRefreshCw size={14} /> Recargar
        </button>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" />Cargando plantillas...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {Object.entries(TYPE_META).map(([type, meta]) => {
            const tpl = tplMap[type];
            if (!tpl) return null;
            return (
              <div key={type} className="admin-card" style={{
                borderLeft: `3px solid ${meta.color}`,
                opacity: tpl.is_active ? 1 : 0.5,
              }}>
                <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{meta.icon}</span>
                    <div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: 1,
                        color: meta.color, textTransform: 'uppercase',
                        background: `${meta.color}22`, padding: '2px 8px', borderRadius: 99,
                        marginRight: 8,
                      }}>
                        {meta.badge}
                      </span>
                      <h2 style={{ margin: 0, display: 'inline', fontSize: 14 }}>{meta.title}</h2>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      title={tpl.is_active ? 'Desactivar' : 'Activar'}
                      onClick={async () => {
                        try {
                          await apiService.put(`/admin/whatsapp-templates/${type}`, { body: tpl.body, is_active: !tpl.is_active });
                          load();
                        } catch (e) { flash(false, e.message); }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: tpl.is_active ? '#22c55e' : '#6b7280', padding: 4 }}
                    >
                      {tpl.is_active ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                    </button>
                    <button title="Vista previa" onClick={() => setPreview(preview === type ? null : type)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8CB79B', padding: 4 }}>
                      <FiEye size={16} />
                    </button>
                    <button title="Editar" onClick={() => handleEdit(tpl)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff8c42', padding: 4 }}>
                      <FiEdit2 size={16} />
                    </button>
                    <button title="Enviar prueba" onClick={() => { setTestModal(type); setTestPhone(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#25D366', padding: 4 }}>
                      <FiSend size={16} />
                    </button>
                  </div>
                </div>
                <div className="admin-card-body">
                  <p style={{ fontSize: 11, color: 'var(--admin-text-muted)', margin: '0 0 10px' }}>
                    {tpl.description}
                  </p>

                  {/* Variables disponibles */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {(tpl.variables || []).map(v => (
                      <span key={v} style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 99,
                        background: 'rgba(255,140,66,.1)', color: '#ff8c42',
                        border: '1px solid rgba(255,140,66,.2)', fontFamily: 'monospace',
                      }}>
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>

                  {/* Vista previa */}
                  {preview === type && (
                    <div style={{
                      padding: '12px 14px', borderRadius: 8, marginBottom: 10, fontSize: 12,
                      background: 'rgba(37,211,102,.05)', border: '1px solid rgba(37,211,102,.15)',
                      whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--admin-text-secondary)',
                    }}
                      dangerouslySetInnerHTML={{ __html: renderPreview(tpl.body, type) }}
                    />
                  )}

                  {/* Última actualización */}
                  <p style={{ fontSize: 10, color: 'var(--admin-text-muted)', margin: 0 }}>
                    Actualizado: {new Date(tpl.updated_at).toLocaleString('es-EC')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de edición ── */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
        }}>
          <div className="admin-card" style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>
                {TYPE_META[editing.type]?.icon} Editar — {TYPE_META[editing.type]?.title}
              </h2>
              <button onClick={() => setEditing(null)}
                style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}>
                <FiX size={20} />
              </button>
            </div>
            <div className="admin-card-body">
              {/* Variables disponibles */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: '#8CB79B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, margin: '0 0 6px' }}>
                  Variables disponibles
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(tplMap[editing.type]?.variables || []).map(v => (
                    <span
                      key={v}
                      onClick={() => setEditing(e => ({ ...e, body: e.body + `{{${v}}}` }))}
                      title="Clic para insertar al final"
                      style={{
                        fontSize: 11, padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                        background: 'rgba(255,140,66,.12)', color: '#ff8c42',
                        border: '1px solid rgba(255,140,66,.25)', fontFamily: 'monospace',
                      }}
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: '#8CB79B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, margin: '0 0 6px' }}>
                  Cuerpo del mensaje (usa *texto* para negrita, _texto_ para cursiva)
                </p>
                <textarea
                  style={{ ...inp, minHeight: 200, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }}
                  value={editing.body}
                  onChange={e => setEditing(ed => ({ ...ed, body: e.target.value }))}
                />
              </div>

              {/* Vista previa en tiempo real */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#8CB79B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, margin: '0 0 6px' }}>
                  Vista previa (con datos de ejemplo)
                </p>
                <div style={{
                  padding: '12px 14px', borderRadius: 8, fontSize: 12,
                  background: 'rgba(37,211,102,.05)', border: '1px solid rgba(37,211,102,.15)',
                  whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--admin-text-secondary)',
                }}
                  dangerouslySetInnerHTML={{ __html: renderPreview(editing.body, editing.type) }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="admin-btn admin-btn-secondary" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
                <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}
                  style={{ background: 'linear-gradient(135deg,#ff9d55,#ff8c42)', color: '#fff', border: 'none' }}>
                  <FiCheck size={14} /> {saving ? 'Guardando...' : 'Guardar plantilla'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de prueba ── */}
      {testModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
        }}>
          <div className="admin-card" style={{ width: '100%', maxWidth: 420 }}>
            <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>
                <FiSend size={14} style={{ marginRight: 6 }} />
                Enviar prueba — {TYPE_META[testModal]?.title}
              </h2>
              <button onClick={() => setTestModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}>
                <FiX size={20} />
              </button>
            </div>
            <div className="admin-card-body">
              <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginBottom: 14 }}>
                Se enviará la plantilla con datos de ejemplo al número indicado. WhatsApp debe estar conectado.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#8CB79B', display: 'block', marginBottom: 5 }}>
                  Número destino (formato: 0987654321 o 593987654321)
                </label>
                <input
                  style={inp} type="tel" placeholder="0987654321"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="admin-btn admin-btn-secondary" onClick={() => setTestModal(null)}>
                  Cancelar
                </button>
                <button
                  className="admin-btn admin-btn-primary" onClick={handleTest} disabled={testSending}
                  style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', border: 'none' }}
                >
                  <FiSend size={14} /> {testSending ? 'Enviando...' : 'Enviar prueba'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
