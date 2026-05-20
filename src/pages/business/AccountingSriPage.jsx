import { useState, useEffect, useRef } from 'react';
import {
  FiRefreshCw, FiAlertCircle,
  FiEdit2, FiSave, FiX, FiCheck,
  FiImage, FiUploadCloud,
  FiShield, FiLock, FiHash
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/SettingsPage.css';

export default function AccountingSriPage() {
  const [loading,     setLoading    ] = useState(true);
  const [msg,         setMsg        ] = useState(null);
  const [error,       setError      ] = useState(null);   // bloquea el render
  const [warn,        setWarn       ] = useState(null);   // aviso sin bloquear

  // Einvoice config
  const [einvCfg,    setEinvCfg   ] = useState(null);
  const [ambEditing, setAmbEditing] = useState(false);
  const [ambValue,   setAmbValue  ] = useState('1');
  const [ambSaving,  setAmbSaving ] = useState(false);

  // Logo
  const [logoUrl,       setLogoUrl      ] = useState(null);
  const [logoPreview,   setLogoPreview  ] = useState(null);
  const [logoFile,      setLogoFile     ] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);

  // Firma electrónica
  const sigFileRef = useRef();
  const [sigPassword,  setSigPassword ] = useState('');
  const [sigUploading, setSigUploading] = useState(false);

  // Secuenciales
  const [seqEdit,   setSeqEdit  ] = useState(null);
  const [seqValue,  setSeqValue ] = useState('');
  const [seqSaving, setSeqSaving] = useState(false);

  const SEQ_FIELDS = [
    { key: 'serie_estab',       label: 'Establecimiento',   type: 'text',   maxLen: 3, hint: 'Ej: 001' },
    { key: 'serie_pto_emision', label: 'Punto de emisión',  type: 'text',   maxLen: 3, hint: 'Ej: 001' },
    { key: 'secuencial_actual', label: 'Secuencial actual', type: 'number', maxLen: 9, hint: 'Nro. siguiente a emitir' },
  ];

  // ── Carga ────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true); setError(null); setWarn(null); setMsg(null);
    try {
      const res = await fetchWithAuth('/api/einvoicing/config');
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setEinvCfg({});
          setWarn(data?.error || 'El módulo de facturación electrónica no está activo para este negocio');
        } else {
          throw new Error(data?.error || `Error ${res.status}`);
        }
        return;
      }
      setEinvCfg(data);
      setLogoUrl(data?.logo_url || null);
      setAmbValue(data?.ambiente || '1');
    } catch (e) {
      setError(e.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (ok, text) => {
    setMsg({ ok, text });
    if (ok) setTimeout(() => setMsg(null), 3000);
  };

  // ── Ambiente SRI ─────────────────────────────────────────────────────────

  const saveAmbiente = async () => {
    setAmbSaving(true);
    try {
      const res = await fetchWithAuth('/api/einvoicing/config', {
        method: 'PUT',
        body: JSON.stringify({ ambiente: ambValue }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      setEinvCfg(c => ({ ...c, ambiente: ambValue }));
      showMsg(true, 'Ambiente actualizado');
      setAmbEditing(false);
    } catch (e) {
      showMsg(false, e.message || 'Error al guardar');
    } finally {
      setAmbSaving(false);
    }
  };

  // ── Logo ─────────────────────────────────────────────────────────────────

  const onLogoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const uploadLogo = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append('file', logoFile);
      const res = await fetchWithAuth('/api/einvoicing/config/logo', { method: 'POST', body: form });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error al subir'); }
      const { logo_url } = await res.json();
      setLogoUrl(logo_url);
      setLogoFile(null);
      setLogoPreview(null);
      if (logoInputRef.current) logoInputRef.current.value = '';
      showMsg(true, 'Logo guardado correctamente');
    } catch (e) {
      showMsg(false, e.message || 'Error al subir el logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const cancelLogoPreview = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // ── Firma electrónica ─────────────────────────────────────────────────────

  const handleSignatureUpload = async () => {
    const file = sigFileRef.current?.files?.[0];
    if (!file)        { showMsg(false, 'Selecciona el archivo .p12'); return; }
    if (!sigPassword) { showMsg(false, 'Ingresa la contraseña del certificado'); return; }
    setSigUploading(true);
    try {
      const fd = new FormData();
      fd.append('file',     file);
      fd.append('password', sigPassword);
      const res = await fetchWithAuth('/api/einvoicing/config/signature', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar firma');
      setEinvCfg(data);
      setSigPassword('');
      if (sigFileRef.current) sigFileRef.current.value = '';
      showMsg(true, 'Firma electrónica cargada correctamente');
    } catch (e) {
      showMsg(false, e.message);
    } finally {
      setSigUploading(false);
    }
  };

  // ── Secuenciales ─────────────────────────────────────────────────────────

  const startSeqEdit  = key => { setSeqEdit(key); setSeqValue(String(einvCfg?.[key] ?? '')); };
  const cancelSeqEdit = ()  => { setSeqEdit(null); setSeqValue(''); };

  const saveSeqField = async key => {
    setSeqSaving(true);
    try {
      const payload = { [key]: key === 'secuencial_actual' ? Number(seqValue) : seqValue };
      const res = await fetchWithAuth('/api/einvoicing/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error'); }
      setEinvCfg(c => ({ ...c, [key]: payload[key] }));
      showMsg(true, 'Secuencial actualizado');
      setSeqEdit(null);
    } catch (e) {
      showMsg(false, e.message || 'Error al guardar');
    } finally {
      setSeqSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PageTemplate
      title="Configuración SRI"
      subtitle="Logo, firma electrónica y secuenciales para facturación electrónica"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={
        <button onClick={load} disabled={loading} className="printer-edit">
          <FiRefreshCw size={14} className={loading ? 'spin' : ''} /> Recargar
        </button>
      }
    >
      {warn && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', color: '#f59e0b', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          <FiAlertCircle size={15} /> {warn}
        </div>
      )}
      {msg && (
        <div className={`settings-toast ${msg.ok ? 'ok' : 'fail'}`}>
          {msg.ok ? <FiCheck size={15} /> : <FiAlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {/* ── Logo del negocio ── */}
      <div className="settings-card">
        <div className="settings-card-header" style={{ background: 'rgba(16,185,129,0.08)' }}>
          <span style={{ color: '#10b981' }}><FiImage size={16} /></span>
          <span className="settings-card-title">Logo del negocio</span>
        </div>

        <div style={{ padding: '18px 20px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#94a3b8' }}>
            Este logo aparecerá en la cabecera de las facturas electrónicas (RIDE PDF).
          </p>

          {(logoPreview || logoUrl) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <img
                src={logoPreview || logoUrl}
                alt="Logo"
                style={{ height: 80, maxWidth: 200, objectFit: 'contain', borderRadius: 8, background: '#fff', padding: 6, border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {logoPreview
                  ? <span style={{ color: '#f59e0b' }}>Vista previa — aún no guardado</span>
                  : <span style={{ color: '#22c55e' }}>Logo actual guardado en Cloudinary</span>
                }
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={onLogoChange}
              style={{ display: 'none' }}
              id="logo-file-input-sri"
            />
            <label
              htmlFor="logo-file-input-sri"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              <FiImage size={14} /> Seleccionar imagen
            </label>

            {logoFile && (
              <>
                <button
                  onClick={uploadLogo}
                  disabled={logoUploading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  <FiUploadCloud size={14} style={{ animation: logoUploading ? 'spin 1s linear infinite' : 'none' }} />
                  {logoUploading ? 'Subiendo…' : 'Guardar logo'}
                </button>
                <button
                  onClick={cancelLogoPreview}
                  disabled={logoUploading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(225,29,72,0.08)', color: '#e11d48', border: '1px solid rgba(225,29,72,0.3)', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                >
                  <FiX size={13} /> Cancelar
                </button>
              </>
            )}
          </div>
          {logoFile && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b' }}>
              {logoFile.name} · {(logoFile.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
      </div>

      {/* ── Firma Electrónica ── */}
      <div className="settings-card" style={{ marginTop: 20 }}>
        <div className="settings-card-header" style={{ background: 'rgba(104,66,254,0.08)' }}>
          <span style={{ color: '#6842fe' }}><FiLock size={16} /></span>
          <span className="settings-card-title" style={{ color: '#a78bfa' }}>Firma Electrónica · Certificado .p12</span>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Estado del certificado */}
          <div style={{
            borderRadius: 10, padding: '14px 16px',
            background: einvCfg?.has_signature
              ? 'linear-gradient(135deg,rgba(34,197,94,0.07),rgba(16,185,129,0.04))'
              : 'linear-gradient(135deg,rgba(225,29,72,0.06),rgba(239,68,68,0.03))',
            border: einvCfg?.has_signature ? '1.5px solid rgba(34,197,94,0.3)' : '1.5px solid rgba(225,29,72,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: einvCfg?.has_signature ? 'rgba(34,197,94,0.15)' : 'rgba(225,29,72,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {einvCfg?.has_signature
                  ? <FiCheck size={20} color="#22c55e" />
                  : <FiX    size={20} color="#e11d48" />
                }
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: einvCfg?.has_signature ? '#15803d' : '#b91c1c' }}>
                  {einvCfg?.has_signature ? 'Certificado activo' : 'Sin certificado'}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {einvCfg?.has_signature ? 'Firma electrónica cargada' : 'Carga tu archivo .p12 del SRI'}
                </div>
              </div>
            </div>

            {einvCfg?.has_signature && (
              <div style={{ display: 'flex', gap: 24, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(34,197,94,0.15)', flexWrap: 'wrap' }}>
                {einvCfg.cert_valid_until && (
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: '#888' }}>Válido hasta: </span>
                    <span style={{ fontWeight: 700 }}>{einvCfg.cert_valid_until}</span>
                  </div>
                )}
                {einvCfg.razon_social && (
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: '#888' }}>Emisor: </span>
                    <span style={{ fontWeight: 600 }}>{einvCfg.razon_social}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cargar / reemplazar firma */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Archivo .p12
              </label>
              <input
                ref={sigFileRef}
                type="file"
                accept=".p12"
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 7, boxSizing: 'border-box',
                  border: '1.5px dashed rgba(255,255,255,0.12)',
                  fontSize: 13, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.03)', color: 'var(--color-text,#e2e8f0)',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Contraseña del certificado
              </label>
              <input
                type="password"
                value={sigPassword}
                onChange={e => setSigPassword(e.target.value)}
                placeholder="Contraseña del .p12"
                style={{
                  width: '100%', padding: '8px 11px', borderRadius: 7, boxSizing: 'border-box',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  fontSize: 13, background: 'rgba(255,255,255,0.03)',
                  color: 'var(--color-text,#e2e8f0)', outline: 'none',
                }}
              />
            </div>
            <button
              onClick={handleSignatureUpload}
              disabled={sigUploading}
              style={{
                background: sigUploading ? '#a78bfa' : einvCfg?.has_signature
                  ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                  : 'linear-gradient(135deg,#6842fe,#7c3aed)',
                color: '#fff', border: 'none', padding: '9px 18px',
                borderRadius: 7, fontWeight: 700, fontSize: 13,
                cursor: sigUploading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              }}
            >
              <FiUploadCloud size={14} />
              {sigUploading ? 'Cargando...' : einvCfg?.has_signature ? 'Reemplazar certificado' : 'Cargar certificado'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Secuenciales SRI ── */}
      <div className="settings-card" style={{ marginTop: 20 }}>
        <div className="settings-card-header" style={{ background: 'rgba(234,179,8,0.08)' }}>
          <span style={{ color: '#eab308' }}><FiHash size={16} /></span>
          <span className="settings-card-title" style={{ color: '#facc15' }}>Secuenciales SRI · Numeración de comprobantes</span>
        </div>

        <div style={{ padding: '6px 0' }}>
          <p style={{ margin: '10px 20px', fontSize: 12, color: '#94a3b8' }}>
            Número de serie y secuencial usado al emitir facturas electrónicas.
            El secuencial se incrementa automáticamente con cada emisión.
          </p>

          {SEQ_FIELDS.map(({ key, label, type, maxLen, hint }) => {
            const editing    = seqEdit === key;
            const currentVal = einvCfg?.[key] ?? '—';
            return (
              <div className="settings-field-row" key={key}>
                <div className="settings-field-label">
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}><FiHash size={14} /></span>
                  <span>{label}</span>
                </div>

                {editing ? (
                  <input
                    autoFocus
                    type={type}
                    value={seqValue}
                    maxLength={maxLen}
                    placeholder={hint}
                    onChange={e => setSeqValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  saveSeqField(key);
                      if (e.key === 'Escape') cancelSeqEdit();
                    }}
                    className="settings-input"
                    style={{ maxWidth: 160 }}
                  />
                ) : (
                  <span className="settings-value" style={{ color: currentVal !== '—' ? '#facc15' : '#bbb' }}>
                    {key === 'secuencial_actual'
                      ? String(currentVal).padStart(9, '0')
                      : currentVal}
                  </span>
                )}

                <div className="settings-actions">
                  {editing ? (
                    <>
                      <button onClick={() => saveSeqField(key)} disabled={seqSaving} className="settings-action-save" style={{ background: '#eab308', color: '#fff', border: 'none' }}>
                        <FiSave size={13} /> Guardar
                      </button>
                      <button onClick={cancelSeqEdit} disabled={seqSaving} className="settings-action-cancel" style={{ background: '#1e1a09', color: '#eab308', border: '1.5px solid #eab308' }}>
                        <FiX size={13} /> Cancelar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startSeqEdit(key)} className="settings-action-edit">
                      <FiEdit2 size={13} /> Editar
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {einvCfg && (
            <div style={{ margin: '8px 20px 14px', padding: '8px 12px', borderRadius: 8, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', fontSize: 12, color: '#94a3b8' }}>
              Número de factura resultante:{' '}
              <span style={{ fontWeight: 700, color: '#facc15', fontFamily: 'monospace' }}>
                {String(einvCfg.serie_estab ?? '001').padStart(3,'0')}-
                {String(einvCfg.serie_pto_emision ?? '001').padStart(3,'0')}-
                {String(einvCfg.secuencial_actual ?? 1).padStart(9,'0')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Ambiente SRI ── */}
      <div className="settings-card" style={{ marginTop: 20 }}>
        <div className="settings-card-header" style={{ background: 'rgba(104,66,254,0.08)' }}>
          <span style={{ color: '#6842fe' }}><FiShield size={16} /></span>
          <span className="settings-card-title" style={{ color: '#a78bfa' }}>Ambiente SRI</span>
        </div>

        <div className="settings-field-row">
          <div className="settings-field-label">
            <span style={{ color: 'rgba(255,255,255,0.3)' }}><FiShield size={14} /></span>
            <span>Ambiente</span>
          </div>

          {ambEditing ? (
            <select
              autoFocus
              value={ambValue}
              onChange={e => setAmbValue(e.target.value)}
              className="settings-input"
              style={{ minWidth: 180 }}
            >
              <option value="1">Pruebas (Certificación)</option>
              <option value="2">Producción</option>
            </select>
          ) : (
            <span className="settings-value" style={{ color: einvCfg?.ambiente === '2' ? '#10b981' : '#f59e0b' }}>
              {einvCfg?.ambiente === '2' ? 'Producción' : 'Pruebas (Certificación)'}
            </span>
          )}

          <div className="settings-actions">
            {ambEditing ? (
              <>
                <button onClick={saveAmbiente} disabled={ambSaving} className="settings-action-save" style={{ background: '#6842fe', color: '#fff', border: 'none' }}>
                  <FiSave size={13} /> Guardar
                </button>
                <button onClick={() => { setAmbEditing(false); setAmbValue(einvCfg?.ambiente || '1'); }} className="settings-action-cancel" style={{ background: '#221d32', color: '#6842fe', border: '1.5px solid #6842fe' }}>
                  <FiX size={13} /> Cancelar
                </button>
              </>
            ) : (
              <button onClick={() => setAmbEditing(true)} className="settings-action-edit">
                <FiEdit2 size={13} /> Editar
              </button>
            )}
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
