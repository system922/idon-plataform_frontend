import { useState, useEffect, useRef } from 'react';
import {
  FiRefreshCw, FiAlertCircle,
  FiEdit2, FiSave, FiX, FiCheck,
  FiImage, FiUploadCloud,
  FiShield, FiLock, FiHash
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';

export default function AccountingSriPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [warn, setWarn] = useState(null);

  const [einvCfg, setEinvCfg] = useState(null);
  const [ambEditing, setAmbEditing] = useState(false);
  const [ambValue, setAmbValue] = useState('1');
  const [ambSaving, setAmbSaving] = useState(false);

  const [logoUrl, setLogoUrl] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);

  const sigFileRef = useRef();
  const [sigPassword, setSigPassword] = useState('');
  const [sigUploading, setSigUploading] = useState(false);

  const [seqEdit, setSeqEdit] = useState(null);
  const [seqValue, setSeqValue] = useState('');
  const [seqSaving, setSeqSaving] = useState(false);

  const SEQ_FIELDS = [
    { key: 'serie_estab', label: 'Establecimiento', type: 'text', maxLen: 3, hint: 'Ej: 001' },
    { key: 'serie_pto_emision', label: 'Punto de emisión', type: 'text', maxLen: 3, hint: 'Ej: 001' },
    { key: 'secuencial_actual', label: 'Secuencial actual', type: 'number', maxLen: 9, hint: 'Nro. siguiente a emitir' },
  ];

  // ── Carga ────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    setError(null);
    setWarn(null);
    setMsg(null);
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

  // ── Refresh (igual que en RolesPage) ────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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
    if (!file) { showMsg(false, 'Selecciona el archivo .p12'); return; }
    if (!sigPassword) { showMsg(false, 'Ingresa la contraseña del certificado'); return; }
    setSigUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
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

  const startSeqEdit = key => { setSeqEdit(key); setSeqValue(String(einvCfg?.[key] ?? '')); };
  const cancelSeqEdit = () => { setSeqEdit(null); setSeqValue(''); };

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

  // ── Botón de refrescar (igual que en RolesPage) ────────────────────────

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

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <PageTemplate
      title="Configuración SRI"
      subtitle="Logo, firma electrónica y secuenciales para facturación electrónica"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={refreshButton}
    >
      {warn && (
        <div className="sri-warning">
          <FiAlertCircle size={15} /> {warn}
        </div>
      )}

      {msg && (
        <div className={`sri-toast ${msg.ok ? 'success' : 'error'}`}>
          {msg.ok ? <FiCheck size={15} /> : <FiAlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {/* ── Logo ── */}
      <div className="sri-card">
        <div className="sri-card-header">
          <span className="sri-card-header-icon" style={{ color: 'var(--text-primary)' }}>
            <FiImage size={16} />
          </span>
          <span className="sri-card-title">Logo del negocio</span>
        </div>

        <div className="sri-card-body">
          <p className="sri-logo-description">
            Este logo aparecerá en la cabecera de las facturas electrónicas (RIDE PDF).
          </p>

          {(logoPreview || logoUrl) && (
            <div className="sri-logo-preview-container">
              <img
                src={logoPreview || logoUrl}
                alt="Logo"
                className="sri-logo-preview"
              />
              <div className="sri-logo-status-preview">
              </div>
            </div>
          )}

          <div className="sri-logo-actions">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={onLogoChange}
              className="sri-logo-file-input"
              id="logo-file-input-sri"
            />
            <label htmlFor="logo-file-input-sri" className="sri-btn-select">
              <FiImage size={14} /> Seleccionar imagen
            </label>

            {logoFile && (
              <ButtonGroup>
                <IconTextButton
                  variant="success"
                  size="sm"
                  icon={<FiUploadCloud size={14} className={logoUploading ? 'sri-spin' : ''} />}
                  onClick={uploadLogo}
                  disabled={logoUploading}
                  loading={logoUploading}
                >
                  {logoUploading ? 'Subiendo…' : 'Guardar logo'}
                </IconTextButton>
                <IconTextButton
                  variant="danger"
                  size="sm"
                  icon={<FiX size={13} />}
                  onClick={cancelLogoPreview}
                  disabled={logoUploading}
                >
                  Cancelar
                </IconTextButton>
              </ButtonGroup>
            )}
          </div>
          {logoFile && (
            <p className="sri-logo-file-info">
              {logoFile.name} · {(logoFile.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
      </div>

      {/* ── Firma Electrónica ── */}
      <div className="sri-card">
        <div className="sri-card-header">
          <span className="sri-card-header-icon" style={{ color: 'var(--text-primary)' }}>
            <FiLock size={16} />
          </span>
          <span className="sri-card-title">Firma Electrónica · Certificado .p12</span>
        </div>

        <div className="sri-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className={`sri-signature-status ${einvCfg?.has_signature ? 'active' : 'inactive'}`}>
            <div className="sri-signature-status-content">
              <div className={`sri-signature-icon-wrapper ${einvCfg?.has_signature ? 'active' : 'inactive'}`}>
                {einvCfg?.has_signature
                  ? <FiCheck size={20} className="icon-success" />
                  : <FiX size={20} className="icon-danger" />
                }
              </div>
              <div>
                <div className={`sri-signature-title ${einvCfg?.has_signature ? 'active' : 'inactive'}`}>
                  {einvCfg?.has_signature ? 'Certificado activo' : 'Sin certificado'}
                </div>
                <div className="sri-signature-subtitle">
                  {einvCfg?.has_signature ? 'Firma electrónica cargada' : 'Carga tu archivo .p12 del SRI'}
                </div>
              </div>
            </div>

            {einvCfg?.has_signature && (
              <div className="sri-signature-details">
                {einvCfg.cert_valid_until && (
                  <div className="sri-signature-detail">
                    <span className="sri-signature-detail-label">Válido hasta: </span>
                    <span className="sri-signature-detail-value">{einvCfg.cert_valid_until}</span>
                  </div>
                )}
                {einvCfg.razon_social && (
                  <div className="sri-signature-detail">
                    <span className="sri-signature-detail-label">Emisor: </span>
                    <span className="sri-signature-detail-value">{einvCfg.razon_social}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sri-signature-upload-section">
            <div className="sri-signature-form-group">
              <label className="sri-signature-label">Archivo .p12</label>
              <input
                ref={sigFileRef}
                type="file"
                accept=".p12"
                className="sri-signature-file-input"
              />
            </div>
            <div className="sri-signature-form-group">
              <label className="sri-signature-label">Contraseña del certificado</label>
              <input
                type="password"
                value={sigPassword}
                onChange={e => setSigPassword(e.target.value)}
                placeholder="Contraseña del .p12"
                className="sri-signature-password-input"
              />
            </div>
            <IconTextButton
              variant={einvCfg?.has_signature ? 'warning' : 'purple'}
              size="md"
              icon={<FiUploadCloud size={14} className={sigUploading ? 'sri-spin' : ''} />}
              onClick={handleSignatureUpload}
              disabled={sigUploading}
              loading={sigUploading}
              fullWidth
            >
              {sigUploading ? 'Cargando...' : einvCfg?.has_signature ? 'Reemplazar certificado' : 'Cargar certificado'}
            </IconTextButton>
          </div>
        </div>
      </div>

      {/* ── Secuenciales ── */}
      <div className="sri-card">
        <div className="sri-card-header">
          <span className="sri-card-header-icon" style={{ color: 'var(--text-primary)' }}>
            <FiHash size={16} />
          </span>
          <span className="sri-card-title">Secuenciales SRI · Numeración de comprobantes</span>
        </div>

        <div style={{ padding: 'var(--space-2) 0' }}>
          <p style={{ color: 'var(--text-primary)', fontSize: 12, margin: 'var(--space-2)' }}>
            Número de serie y secuencial usado al emitir facturas electrónicas.
            El secuencial se incrementa automáticamente con cada emisión.
          </p>

          {SEQ_FIELDS.map(({ key, label, type, maxLen, hint }) => {
            const editing = seqEdit === key;
            const currentVal = einvCfg?.[key] ?? '—';
            return (
              <div className="sri-field-row" key={key}>
                <div className="sri-field-label">
                  <span style={{ color: 'var(--text-muted)' }}><FiHash size={14} /></span>
                  <span className="sri-field-label-text">{label}</span>
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
                      if (e.key === 'Enter') saveSeqField(key);
                      if (e.key === 'Escape') cancelSeqEdit();
                    }}
                    className="sri-field-input"
                  />
                ) : (
                  <span className={`sri-field-value ${currentVal !== '—' ? 'has-value' : 'empty'}`}>
                    {key === 'secuencial_actual'
                      ? String(currentVal).padStart(9, '0')
                      : currentVal}
                  </span>
                )}

                <div className="sri-field-actions">
                  {editing ? (
                    <ButtonGroup>
                      <IconTextButton
                        variant="success"
                        size="sm"
                        icon={<FiSave size={13} />}
                        onClick={() => saveSeqField(key)}
                        disabled={seqSaving}
                        loading={seqSaving}
                      >
                        Guardar
                      </IconTextButton>
                      <IconTextButton
                        variant="danger"
                        size="sm"
                        icon={<FiX size={13} />}
                        onClick={cancelSeqEdit}
                        disabled={seqSaving}
                      >
                        Cancelar
                      </IconTextButton>
                    </ButtonGroup>
                  ) : (
                    <IconTextButton
                      variant="primary"
                      size="sm"
                      icon={<FiEdit2 size={13} />}
                      onClick={() => startSeqEdit(key)}
                    >
                      Editar
                    </IconTextButton>
                  )}
                </div>
              </div>
            );
          })}

          {einvCfg && (
            <div className="sri-invoice-number-display">
              Número de factura resultante:{' '}
              <span className="sri-invoice-number">
                {String(einvCfg.serie_estab ?? '001').padStart(3, '0')}-
                {String(einvCfg.serie_pto_emision ?? '001').padStart(3, '0')}-
                {String(einvCfg.secuencial_actual ?? 1).padStart(9, '0')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Ambiente ── */}
      <div className="sri-card">
        <div className="sri-card-header">
          <span className="sri-card-header-icon" style={{ color: 'var(--purple)' }}>
            <FiShield size={16} />
          </span>
          <span className="sri-card-title">Ambiente SRI</span>
        </div>

        <div className="sri-ambiente-row">
          <div className="sri-ambiente-label">
            <span style={{ color: 'var(--text-muted)' }}><FiShield size={14} /></span>
            <span className="sri-field-label-text">Ambiente</span>
          </div>

          {ambEditing ? (
            <select
              autoFocus
              value={ambValue}
              onChange={e => setAmbValue(e.target.value)}
              className="sri-ambiente-select"
            >
              <option value="1">Pruebas (Certificación)</option>
              <option value="2">Producción</option>
            </select>
          ) : (
            <span className={`sri-ambiente-value ${einvCfg?.ambiente === '2' ? 'production' : 'test'}`}>
              {einvCfg?.ambiente === '2' ? 'Producción' : 'Pruebas (Certificación)'}
            </span>
          )}

          <div className="sri-field-actions">
            {ambEditing ? (
              <ButtonGroup>
                <IconTextButton
                  variant="success"
                  size="sm"
                  icon={<FiSave size={13} />}
                  onClick={saveAmbiente}
                  disabled={ambSaving}
                  loading={ambSaving}
                >
                  Guardar
                </IconTextButton>
                <IconTextButton
                  variant="danger"
                  size="sm"
                  icon={<FiX size={13} />}
                  onClick={() => { setAmbEditing(false); setAmbValue(einvCfg?.ambiente || '1'); }}
                >
                  Cancelar
                </IconTextButton>
              </ButtonGroup>
            ) : (
              <IconTextButton
                variant="primary"
                size="sm"
                icon={<FiEdit2 size={13} />}
                onClick={() => setAmbEditing(true)}
              >
                Editar
              </IconTextButton>
            )}
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}