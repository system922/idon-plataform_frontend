import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from '../../components/PageTemplate';
import { Settings, ArrowRight, Save, RefreshCw, AlertCircle, Check } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import Input from '../../components/General/Input';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import '../../styles/EinvoicingSignaturePage.css';

export default function EinvoicingSignaturePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [config, setConfig] = useState({
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
    logo_url: '',
  });

  const loadConfig = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/einvoicing/config');
      const data = await res.json();
      if (res.ok) {
        setConfig({
          ruc: data.ruc || '',
          razon_social: data.razon_social || '',
          nombre_comercial: data.nombre_comercial || '',
          direccion_matriz: data.direccion_matriz || '',
          direccion_establecimiento: data.direccion_establecimiento || '',
          contribuyente_especial: data.contribuyente_especial || '',
          obligado_contabilidad: data.obligado_contabilidad || false,
          ambiente: data.ambiente || '1',
          serie_estab: data.serie_estab || '001',
          serie_pto_emision: data.serie_pto_emision || '001',
          secuencial_actual: data.secuencial_actual || 1,
          secuencial_credit_notes: data.secuencial_credit_notes || 1,
          has_signature: data.has_signature || false,
          logo_url: data.logo_url || '',
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetchWithAuth('/api/einvoicing/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setSuccess('Configuración guardada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <PageTemplate title="Firma Electrónica" theme="business">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <RefreshCw size={24} className="spinning" />
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate 
      title="Firma Electrónica" 
      theme="business"
      subtitle="Configuración de firma digital y secuenciales para comprobantes electrónicos"
    >
      <div className="signature-config-container">
        {/* Botón para ir a ajustes */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 24,
          padding: '16px 20px',
          background: 'rgba(104,66,254,0.06)',
          borderRadius: 12,
          border: '1px solid rgba(104,66,254,0.12)'
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
              ⚙️ Gestión de firma electrónica (.p12)
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              La firma electrónica se gestiona desde Ajustes del negocio
            </div>
          </div>
          <button
            onClick={() => navigate('/app/core/core.settings')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px',
              background: 'linear-gradient(135deg,#6842fe,#7c3aed)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Ir a Ajustes <ArrowRight size={14} />
          </button>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="alert-error" style={{ marginBottom: 16 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="alert-success" style={{ marginBottom: 16 }}>
            <Check size={16} /> {success}
          </div>
        )}

        {/* Formulario de configuración */}
        <div className="signature-config-form">
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>📋 Datos del Emisor</h3>
          
          <div className="config-grid">
            <Input
              label="RUC"
              value={config.ruc}
              onChange={(e) => handleChange('ruc', e.target.value)}
              placeholder="Ingrese el RUC"
              maxLength={13}
            />
            
            <Input
              label="Razón Social"
              value={config.razon_social}
              onChange={(e) => handleChange('razon_social', e.target.value)}
              placeholder="Ingrese la razón social"
            />
            
            <Input
              label="Nombre Comercial"
              value={config.nombre_comercial}
              onChange={(e) => handleChange('nombre_comercial', e.target.value)}
              placeholder="Ingrese el nombre comercial"
            />
            
            <Input
              label="Dirección Matriz"
              value={config.direccion_matriz}
              onChange={(e) => handleChange('direccion_matriz', e.target.value)}
              placeholder="Ingrese la dirección matriz"
            />
            
            <Input
              label="Dirección Establecimiento"
              value={config.direccion_establecimiento}
              onChange={(e) => handleChange('direccion_establecimiento', e.target.value)}
              placeholder="Ingrese la dirección del establecimiento"
            />
            
            <Input
              label="Contribuyente Especial"
              value={config.contribuyente_especial}
              onChange={(e) => handleChange('contribuyente_especial', e.target.value)}
              placeholder="Ej: 123456-7"
            />
            
            <div className="config-checkbox">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={config.obligado_contabilidad}
                  onChange={(e) => handleChange('obligado_contabilidad', e.target.checked)}
                />
                Obligado a llevar contabilidad
              </label>
            </div>
            
            <Input
              label="Ambiente SRI"
              value={config.ambiente}
              onChange={(e) => handleChange('ambiente', e.target.value)}
              placeholder="1=Pruebas, 2=Producción"
              maxLength={1}
            />
          </div>

          <hr style={{ margin: '24px 0', borderColor: 'var(--border-color)' }} />

          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>📄 Secuenciales</h3>
          
          <div className="config-grid">
            <Input
              label="Establecimiento"
              value={config.serie_estab}
              onChange={(e) => handleChange('serie_estab', e.target.value)}
              placeholder="001"
              maxLength={3}
            />
            
            <Input
              label="Punto de Emisión"
              value={config.serie_pto_emision}
              onChange={(e) => handleChange('serie_pto_emision', e.target.value)}
              placeholder="001"
              maxLength={3}
            />
            
            <Input
              label="Secuencial Facturas"
              type="number"
              value={config.secuencial_actual}
              onChange={(e) => handleChange('secuencial_actual', parseInt(e.target.value) || 1)}
              min={1}
            />
            
            <Input
              label="Secuencial Notas de Crédito"
              type="number"
              value={config.secuencial_credit_notes}
              onChange={(e) => handleChange('secuencial_credit_notes', parseInt(e.target.value) || 1)}
              min={1}
            />
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <IconTextButton
              variant="primary"
              size="md"
              icon={<Save size={16} />}
              onClick={handleSave}
              disabled={saving}
              loading={saving}
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </IconTextButton>
          </div>
        </div>

        {/* Información de estado */}
        <div style={{ 
          marginTop: 24,
          padding: '16px 20px',
          background: config.has_signature ? 'rgba(34,197,94,0.06)' : 'rgba(225,29,72,0.06)',
          borderRadius: 12,
          border: `1px solid ${config.has_signature ? 'rgba(34,197,94,0.2)' : 'rgba(225,29,72,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: config.has_signature ? '#22c55e' : '#ef4444',
            flexShrink: 0
          }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {config.has_signature ? '✅ Firma electrónica configurada' : '❌ Firma electrónica no configurada'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {config.has_signature 
                ? 'El certificado digital está cargado y listo para firmar comprobantes'
                : 'Configure la firma electrónica en Ajustes del negocio para poder emitir comprobantes electrónicos'
              }
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}