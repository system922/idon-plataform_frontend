import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from '../../components/PageTemplate';
import { useAlert } from '../../context/ConfirmContext';
import { adminApi, api } from '../../config/api';
import { FiRefreshCw, FiSave, FiUpload } from 'react-icons/fi';
import '../../styles/PlatformEinvoicingPage.css';

const EMPTY_CONFIG = {
  ruc: '',
  razon_social: '',
  nombre_comercial: '',
  direccion_matriz: '',
  direccion_establecimiento: '',
  contribuyente_especial: '',
  obligado_contabilidad: false,
  ambiente: '1',
  serie_estab: '001',
  serie_pto_emision: '001',
  secuencial_actual: 1,
  secuencial_credit_notes: 1,
  has_signature: false,
};

const CONFIG_FIELDS = [
  ['ruc', 'RUC', 'text'],
  ['razon_social', 'Razón social', 'text'],
  ['nombre_comercial', 'Nombre comercial', 'text'],
  ['direccion_matriz', 'Dirección matriz', 'text'],
  ['direccion_establecimiento', 'Dirección establecimiento', 'text'],
  ['contribuyente_especial', 'Contribuyente especial', 'text'],
];

export default function PlatformEinvoicingPage() {
  const navigate = useNavigate();
  const alert = useAlert();
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePassword, setSignaturePassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const configResponse = await adminApi.get('/admin/einvoicing/config');
      setConfig({ ...EMPTY_CONFIG, ...(configResponse.data || {}) });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await adminApi.put('/admin/einvoicing/config', config);
      setConfig({ ...EMPTY_CONFIG, ...(response.data || {}) });
      alert.success('Configuración de facturación guardada.', '✅ Éxito');
    } catch (saveError) {
      alert.error(`Error al guardar: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadSignature = async (event) => {
    event.preventDefault();
    if (!signatureFile || !signaturePassword) {
      alert.error('Selecciona el archivo .p12 e ingresa su contraseña.');
      return;
    }
    const form = new FormData();
    form.append('file', signatureFile);
    form.append('password', signaturePassword);
    setUploading(true);
    try {
      const response = await api.post('/admin/einvoicing/config/signature', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setConfig((current) => ({ ...current, ...(response.data.data || {}) }));
      setSignatureFile(null);
      setSignaturePassword('');
      event.target.reset();
      alert.success('Firma electrónica cargada correctamente.', '✅ Éxito');
    } catch (uploadError) {
      alert.error(`Error al cargar la firma: ${uploadError.response?.data?.message || uploadError.message}`);
    } finally {
      setUploading(false);
    }
  };

  const refreshButton = (
    <div className="platform-einvoice-header-actions">
      <button type="button" onClick={() => navigate('/admin/einvoicing/invoices')}>Ver comprobantes</button>
      <button className="dashboard-refresh-btn-header" onClick={handleRefresh} disabled={refreshing}>
        <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
        <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="FACTURACIÓN ELECTRÓNICA IDON"
      subtitle="Configura los datos fiscales y la firma electrónica del emisor de IDON."
      theme="admin"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={refreshButton}
    >
      <section className="platform-einvoice-card">
        <h2>Datos del emisor</h2>
        <p>Esta configuración y firma se usan para facturar los pagos de suscripción cobrados por IDON.</p>
        <form onSubmit={handleSave}>
          <div className="platform-einvoice-grid">
            {CONFIG_FIELDS.map(([field, label, type]) => (
              <label className="platform-einvoice-field" key={field}>
                <span>{label}</span>
                <input
                  type={type}
                  value={config[field] || ''}
                  onChange={(event) => setConfig((current) => ({ ...current, [field]: event.target.value }))}
                  maxLength={field === 'ruc' ? 13 : undefined}
                  required={['ruc', 'razon_social', 'direccion_matriz'].includes(field)}
                />
              </label>
            ))}
            <label className="platform-einvoice-field">
              <span>Ambiente SRI</span>
              <select
                value={config.ambiente}
                onChange={(event) => setConfig((current) => ({ ...current, ambiente: event.target.value }))}
              >
                <option value="1">Pruebas</option>
                <option value="2">Producción</option>
              </select>
            </label>
            <label className="platform-einvoice-field">
              <span>Establecimiento</span>
              <input
                value={config.serie_estab || ''}
                maxLength={3}
                required
                onChange={(event) => setConfig((current) => ({ ...current, serie_estab: event.target.value }))}
              />
            </label>
            <label className="platform-einvoice-field">
              <span>Punto de emisión</span>
              <input
                value={config.serie_pto_emision || ''}
                maxLength={3}
                required
                onChange={(event) => setConfig((current) => ({ ...current, serie_pto_emision: event.target.value }))}
              />
            </label>
            <label className="platform-einvoice-field">
              <span>Secuencial de facturas</span>
              <input
                type="number"
                min="1"
                value={config.secuencial_actual || 1}
                required
                onChange={(event) => setConfig((current) => ({ ...current, secuencial_actual: Number(event.target.value) }))}
              />
            </label>
            <label className="platform-einvoice-field">
              <span>Secuencial de notas de crédito</span>
              <input
                type="number"
                min="1"
                value={config.secuencial_credit_notes || 1}
                required
                onChange={(event) => setConfig((current) => ({ ...current, secuencial_credit_notes: Number(event.target.value) }))}
              />
            </label>
            <label className="platform-einvoice-checkbox">
              <input
                type="checkbox"
                checked={Boolean(config.obligado_contabilidad)}
                onChange={(event) => setConfig((current) => ({ ...current, obligado_contabilidad: event.target.checked }))}
              />
              Obligado a llevar contabilidad
            </label>
          </div>
          <button className="platform-einvoice-primary" type="submit" disabled={saving}>
            <FiSave size={16} /> {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </form>
      </section>

      <section className="platform-einvoice-card">
        <h2>Firma electrónica</h2>
        <p>
          Estado: <strong className={config.has_signature ? 'platform-einvoice-ready' : 'platform-einvoice-missing'}>
            {config.has_signature ? 'Certificado cargado' : 'Certificado pendiente'}
          </strong>
        </p>
        <form className="platform-einvoice-signature-form" onSubmit={handleUploadSignature}>
          <label className="platform-einvoice-field">
            <span>Certificado (.p12)</span>
            <input
              type="file"
              accept=".p12,application/x-pkcs12"
              onChange={(event) => setSignatureFile(event.target.files?.[0] || null)}
            />
          </label>
          <label className="platform-einvoice-field">
            <span>Contraseña del certificado</span>
            <input
              type="password"
              value={signaturePassword}
              autoComplete="new-password"
              onChange={(event) => setSignaturePassword(event.target.value)}
            />
          </label>
          <button className="platform-einvoice-primary" type="submit" disabled={uploading}>
            <FiUpload size={16} /> {uploading ? 'Cargando...' : 'Cargar firma'}
          </button>
        </form>
      </section>
    </PageTemplate>
  );
}
