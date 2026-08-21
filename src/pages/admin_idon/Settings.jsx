import React, { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import Modal from '../../components/General/Modal';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import {
  FiCheck, FiRefreshCw, FiAlertCircle, FiMessageCircle,
  FiDollarSign, FiPercent, FiGlobe, FiShield
} from 'react-icons/fi';
import { adminApi } from '../../config/api';

const F = ({ label, hint, children }) => (
  <div className="settings-form-group">
    <label className="settings-form-label">{label}</label>
    {children}
    {hint && <p className="settings-form-hint">{hint}</p>}
  </div>
);

export default function Settings() {
  const alert = useAlert();
  const [cfg, setCfg] = useState(null);
  const [platform, setPlatform] = useState({ whatsapp_support_number: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingWa, setSavingWa] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [fiscal, plat] = await Promise.all([
        adminApi.get('/admin/fiscal-config'),
        adminApi.get('/admin/platform-settings'),
      ]);
      setCfg(fiscal.data || {});
      setPlatform(plat.data || { whatsapp_support_number: '' });
      setError(null);
    } catch (e) {
      setError(e.message);
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

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await adminApi.put('/admin/fiscal-config', cfg);
      alert.success('Configuración guardada correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlatform = async () => {
    if (savingWa) return;
    setSavingWa(true);
    try {
      await adminApi.put('/admin/platform-settings', platform);
      alert.success('Número de soporte guardado correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    } finally {
      setSavingWa(false);
    }
  };

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

  return (
    <PageTemplate
      title="CONFIGURACIÓN"
      subtitle="Parámetros fiscales del sistema — Ecuador SRI"
      theme="admin"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {!loading && cfg && (
        <>
          <div className="settings-grid">
            <div className="settings-card">
              <div className="settings-card-header">
                <FiPercent size={16} className="settings-card-icon" />
                <h2>IVA</h2>
              </div>
              <div className="settings-card-body">
                <F
                  label="Tarifa IVA principal (%)"
                  hint="Actualmente 15% en Ecuador (vigente desde abril 2024)"
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={cfg.iva_rate || 15}
                    onChange={(value) => setCfg(c => ({ ...c, iva_rate: parseFloat(value) || 0 }))}
                    size="md"
                  />
                </F>
                <F
                  label="Tarifa IVA reducida (%)"
                  hint="Para bienes y servicios con tarifa reducida o diferenciada"
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={cfg.iva_rate_reduced || 0}
                    onChange={(value) => setCfg(c => ({ ...c, iva_rate_reduced: parseFloat(value) || 0 }))}
                    size="md"
                  />
                </F>
                <F label="Vigente desde">
                  <Input
                    type="date"
                    value={cfg.iva_effective_from ? cfg.iva_effective_from.split('T')[0] : '2024-04-01'}
                    onChange={(value) => setCfg(c => ({ ...c, iva_effective_from: value }))}
                    size="md"
                  />
                </F>
                <div className="settings-example">
                  <p>
                    Ejemplo: $100 + {cfg.iva_rate || 15}% IVA ={' '}
                    <strong>${(100 * (1 + (cfg.iva_rate || 15) / 100)).toFixed(2)}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <FiShield size={16} className="settings-card-icon" />
                <h2>Retenciones</h2>
              </div>
              <div className="settings-card-body">
                <F
                  label="Retención IR bienes (%)"
                  hint="Retención impuesto a la renta en compra de bienes"
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cfg.retention_ir_goods || 1}
                    onChange={(value) => setCfg(c => ({ ...c, retention_ir_goods: parseFloat(value) || 0 }))}
                    size="md"
                  />
                </F>
                <F
                  label="Retención IR servicios (%)"
                  hint="Retención impuesto a la renta en prestación de servicios"
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cfg.retention_ir_services || 2}
                    onChange={(value) => setCfg(c => ({ ...c, retention_ir_services: parseFloat(value) || 0 }))}
                    size="md"
                  />
                </F>
                <F
                  label="Retención IVA (%)"
                  hint="Porcentaje de retención del IVA (30% o 70% según el caso)"
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={cfg.retention_iva || 30}
                    onChange={(value) => setCfg(c => ({ ...c, retention_iva: parseFloat(value) || 0 }))}
                    size="md"
                  />
                </F>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <FiGlobe size={16} className="settings-card-icon" />
                <h2>SRI Ecuador</h2>
              </div>
              <div className="settings-card-body">
                <F label="Ambiente SRI">
                  <select
                    className="settings-select"
                    value={cfg.sri_environment || 'produccion'}
                    onChange={(e) => setCfg(c => ({ ...c, sri_environment: e.target.value }))}
                  >
                    <option value="produccion">Producción</option>
                    <option value="pruebas">Pruebas / Sandbox</option>
                  </select>
                </F>
                <div className={`settings-environment ${cfg.sri_environment === 'produccion' ? 'production' : 'testing'}`}>
                  <p>
                    {cfg.sri_environment === 'produccion'
                      ? '✓ Ambiente de PRODUCCIÓN — comprobantes con validez legal'
                      : '⚠ Ambiente de PRUEBAS — los comprobantes NO son válidos legalmente'}
                  </p>
                </div>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-card-header">
                <FiDollarSign size={16} className="settings-card-icon" />
                <h2>Moneda y País</h2>
              </div>
              <div className="settings-card-body">
                <F label="Código de moneda">
                  <Input
                    type="text"
                    value={cfg.currency_code || 'USD'}
                    onChange={(value) => setCfg(c => ({ ...c, currency_code: value }))}
                    size="md"
                  />
                </F>
                <F label="Símbolo de moneda">
                  <Input
                    type="text"
                    value={cfg.currency_symbol || '$'}
                    onChange={(value) => setCfg(c => ({ ...c, currency_symbol: value }))}
                    size="md"
                  />
                </F>
                <div className="settings-country">
                  País: <strong>{cfg.country_name || 'Ecuador'}</strong> · Código: <strong>{cfg.country_code || 'EC'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-whatsapp-card">
            <div className="settings-card-header">
              <FiMessageCircle size={16} className="settings-whatsapp-icon" />
              <h2>Soporte IDON — WhatsApp</h2>
            </div>
            <div className="settings-card-body">
              <p className="settings-whatsapp-description">
                Configura el número de WhatsApp de soporte IDON. Este número se incluirá en el mensaje de bienvenida
                que se envía automáticamente al dueño del negocio cuando crea su cuenta en la plataforma.
              </p>
              <F
                label="Número WhatsApp Soporte IDON"
                hint="Formato internacional sin espacios ni guiones. Ej: 593987654321"
              >
                <div className="settings-whatsapp-input">
                  <span className="settings-whatsapp-emoji">📱</span>
                  <Input
                    type="tel"
                    value={platform.whatsapp_support_number || ''}
                    onChange={(value) => setPlatform(p => ({ ...p, whatsapp_support_number: value.replace(/[^0-9+]/g, '') }))}
                    placeholder="593987654321"
                    size="md"
                    className="settings-whatsapp-field"
                  />
                </div>
              </F>
              {platform.whatsapp_support_number && (
                <div className="settings-whatsapp-preview">
                  <span className="settings-whatsapp-preview-label">Vista previa del enlace:</span>
                  <span>wa.me/{platform.whatsapp_support_number.replace(/\D/g, '')}</span>
                </div>
              )}
              <div className="settings-whatsapp-actions">
                <IconTextButton
                  variant="success"
                  size="md"
                  icon={<FiCheck size={14} />}
                  onClick={handleSavePlatform}
                  disabled={savingWa}
                  loading={savingWa}
                >
                  {savingWa ? 'Guardando...' : 'Guardar número de soporte'}
                </IconTextButton>
              </div>
            </div>
          </div>

          <div className="settings-footer">
            <IconTextButton
              variant="secondary"
              size="md"
              icon={<FiRefreshCw size={14} />}
              onClick={handleRefresh}
              disabled={saving || refreshing}
              loading={refreshing}
            >
              Recargar
            </IconTextButton>
            <IconTextButton
              variant="primary"
              size="md"
              icon={<FiCheck size={15} />}
              onClick={handleSave}
              disabled={saving || !cfg}
              loading={saving}
            >
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </IconTextButton>
          </div>
        </>
      )}
    </PageTemplate>
  );
}