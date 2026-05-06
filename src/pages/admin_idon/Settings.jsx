import React, { useState, useEffect } from 'react';
import { FiCheck, FiRefreshCw, FiAlertCircle, FiSettings, FiMessageCircle } from 'react-icons/fi';
import { adminApiService as apiService } from '../../services/apiService';
import '../../styles/AdminPages.css';

const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border-light)', color: 'var(--admin-text-primary)', outline: 'none' };

const F = ({ label, hint, children }) => (
  <div className="admin-form-group" style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#8CB79B' }}>{label}</label>
    {children}
    {hint && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--admin-text-muted)' }}>{hint}</p>}
  </div>
);

export default function Settings() {
  const [cfg,       setCfg]       = useState(null);
  const [platform,  setPlatform]  = useState({ whatsapp_support_number: '' });
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [savingWa,  setSavingWa]  = useState(false);
  const [msg,       setMsg]       = useState(null);
  const [msgWa,     setMsgWa]     = useState(null);
  const [error,     setError]     = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [fiscal, plat] = await Promise.all([
        apiService.get('/admin/fiscal-config'),
        apiService.get('/admin/platform-settings'),
      ]);
      setCfg(fiscal.data || {});
      setPlatform(plat.data || { whatsapp_support_number: '' });
      setError(null);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const set = k => e => setCfg(c => ({ ...c, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try { await apiService.put('/admin/fiscal-config', cfg); setMsg({ ok: true, text: '✅ Configuración guardada correctamente' }); setTimeout(() => setMsg(null), 4000); }
    catch (e) { setMsg({ ok: false, text: '❌ Error: ' + e.message }); } finally { setSaving(false); }
  };

  const handleSavePlatform = async () => {
    setSavingWa(true); setMsgWa(null);
    try {
      await apiService.put('/admin/platform-settings', platform);
      setMsgWa({ ok: true, text: '✅ Guardado correctamente' });
      setTimeout(() => setMsgWa(null), 4000);
    } catch (e) { setMsgWa({ ok: false, text: '❌ Error: ' + e.message }); }
    finally { setSavingWa(false); }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Configuración</h1>
        <p className="admin-page-subtitle">Parámetros fiscales del sistema — Ecuador SRI</p>
      </div>

      {error && <div className="admin-card" style={{ marginBottom: 16, borderLeft: '4px solid #ef4444' }}><div className="admin-card-body"><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><FiAlertCircle size={16} style={{ color: '#ef4444' }} /><p style={{ color: '#ef4444', margin: 0 }}>Error: {error}</p></div></div></div>}

      {loading ? <div className="admin-loading"><div className="admin-spinner" />Cargando configuración...</div>
      : cfg && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* IVA */}
          <div className="admin-card">
            <div className="admin-card-header"><h2>IVA</h2></div>
            <div className="admin-card-body">
              <F label="Tarifa IVA principal (%)" hint="Actualmente 15% en Ecuador (vigente desde abril 2024)">
                <input style={inp} type="number" step="0.01" min="0" max="100" value={cfg.iva_rate || 15} onChange={set('iva_rate')} />
              </F>
              <F label="Tarifa IVA reducida (%)" hint="Para bienes y servicios con tarifa reducida o diferenciada">
                <input style={inp} type="number" step="0.01" min="0" max="100" value={cfg.iva_rate_reduced || 0} onChange={set('iva_rate_reduced')} />
              </F>
              <F label="Vigente desde">
                <input style={inp} type="date" value={cfg.iva_effective_from ? cfg.iva_effective_from.split('T')[0] : '2024-04-01'} onChange={set('iva_effective_from')} />
              </F>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,140,66,.06)', border: '1px solid rgba(255,140,66,.2)', fontSize: 12 }}>
                <p style={{ margin: 0, color: 'var(--admin-text-muted)' }}>
                  Ejemplo: $100 + {cfg.iva_rate || 15}% IVA = <strong style={{ color: '#ff8c42' }}>${(100 * (1 + (cfg.iva_rate || 15) / 100)).toFixed(2)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Retenciones */}
          <div className="admin-card">
            <div className="admin-card-header"><h2>Retenciones</h2></div>
            <div className="admin-card-body">
              <F label="Retención IR bienes (%)" hint="Retención impuesto a la renta en compra de bienes">
                <input style={inp} type="number" step="0.01" min="0" value={cfg.retention_ir_goods || 1} onChange={set('retention_ir_goods')} />
              </F>
              <F label="Retención IR servicios (%)" hint="Retención impuesto a la renta en prestación de servicios">
                <input style={inp} type="number" step="0.01" min="0" value={cfg.retention_ir_services || 2} onChange={set('retention_ir_services')} />
              </F>
              <F label="Retención IVA (%)" hint="Porcentaje de retención del IVA (30% o 70% según el caso)">
                <input style={inp} type="number" step="0.01" min="0" max="100" value={cfg.retention_iva || 30} onChange={set('retention_iva')} />
              </F>
            </div>
          </div>

          {/* SRI */}
          <div className="admin-card">
            <div className="admin-card-header"><h2>SRI Ecuador</h2></div>
            <div className="admin-card-body">
              <F label="Ambiente SRI">
                <select style={inp} value={cfg.sri_environment || 'produccion'} onChange={set('sri_environment')}>
                  <option value="produccion">Producción</option>
                  <option value="pruebas">Pruebas / Sandbox</option>
                </select>
              </F>
              <div style={{ padding: '12px 14px', borderRadius: 8, marginTop: 4,
                background: cfg.sri_environment === 'produccion' ? 'rgba(34,197,94,.08)' : 'rgba(245,158,11,.08)',
                border: `1px solid ${cfg.sri_environment === 'produccion' ? 'rgba(34,197,94,.2)' : 'rgba(245,158,11,.2)'}`,
                fontSize: 12 }}>
                <p style={{ margin: 0, fontWeight: 600, color: cfg.sri_environment === 'produccion' ? '#22c55e' : '#f59e0b' }}>
                  {cfg.sri_environment === 'produccion'
                    ? '✓ Ambiente de PRODUCCIÓN — comprobantes con validez legal'
                    : '⚠ Ambiente de PRUEBAS — los comprobantes NO son válidos legalmente'}
                </p>
              </div>
            </div>
          </div>

          {/* Moneda */}
          <div className="admin-card">
            <div className="admin-card-header"><h2>Moneda y País</h2></div>
            <div className="admin-card-body">
              <F label="Código de moneda"><input style={inp} value={cfg.currency_code || 'USD'} onChange={set('currency_code')} /></F>
              <F label="Símbolo de moneda"><input style={inp} value={cfg.currency_symbol || '$'} onChange={set('currency_symbol')} /></F>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border-light)', fontSize: 12, color: 'var(--admin-text-muted)' }}>
                País: <strong>{cfg.country_name || 'Ecuador'}</strong> · Código: <strong>{cfg.country_code || 'EC'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Soporte IDON (WhatsApp) ── */}
      {!loading && (
        <div className="admin-card" style={{ marginTop: 20 }}>
          <div className="admin-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiMessageCircle size={16} style={{ color: '#25D366' }} />
            <h2 style={{ margin: 0 }}>Soporte IDON — WhatsApp</h2>
          </div>
          <div className="admin-card-body">
            <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginBottom: 16 }}>
              Configura el número de WhatsApp de soporte IDON. Este número se incluirá en el mensaje de bienvenida
              que se envía automáticamente al dueño del negocio cuando crea su cuenta en la plataforma.
            </p>
            <F
              label="Número WhatsApp Soporte IDON"
              hint="Formato internacional sin espacios ni guiones. Ej: 593987654321"
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 20 }}>📱</span>
                <input
                  style={{ ...inp, flex: 1 }}
                  type="tel"
                  placeholder="593987654321"
                  value={platform.whatsapp_support_number || ''}
                  onChange={e => setPlatform(p => ({ ...p, whatsapp_support_number: e.target.value.replace(/[^0-9+]/g, '') }))}
                />
              </div>
            </F>
            {platform.whatsapp_support_number && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(37,211,102,.06)', border: '1px solid rgba(37,211,102,.2)', fontSize: 12, marginBottom: 12 }}>
                <span style={{ color: '#25D366', fontWeight: 600 }}>Vista previa del enlace: </span>
                <span style={{ color: 'var(--admin-text-muted)' }}>
                  wa.me/{platform.whatsapp_support_number.replace(/\D/g, '')}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              {msgWa && (
                <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: msgWa.ok ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                  color: msgWa.ok ? '#22c55e' : '#ef4444',
                  border: `1px solid ${msgWa.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}` }}>
                  {msgWa.text}
                </div>
              )}
              <button
                className="admin-btn admin-btn-primary"
                onClick={handleSavePlatform}
                disabled={savingWa}
                style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', border: 'none' }}
              >
                <FiCheck size={14} /> {savingWa ? 'Guardando...' : 'Guardar número de soporte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
        {msg && (
          <div style={{ padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: msg.ok ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)', color: msg.ok ? '#22c55e' : '#ef4444', border: `1px solid ${msg.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}` }}>
            {msg.text}
          </div>
        )}
        <button className="admin-btn admin-btn-secondary" onClick={load} disabled={saving}><FiRefreshCw size={14} /> Recargar</button>
        <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving || !cfg}
          style={{ background: 'linear-gradient(135deg,#ff9d55,#ff8c42)', color: '#fff', border: 'none' }}>
          <FiCheck size={15} /> {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  );
}
