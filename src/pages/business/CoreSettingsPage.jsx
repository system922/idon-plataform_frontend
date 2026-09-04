// settings/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { fetchWithAuth } from '../../config/api';
import {
  FiRefreshCw, FiAlertCircle,
  FiEdit2, FiSave, FiX, FiCheck,
  FiGlobe, FiPhone, FiMail, FiMapPin, FiFileText, FiPrinter
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';


// ─── Constantes ───────────────────────────────────────────────────────────────

const EINV_SYNC = {
  company_name: 'razon_social',
  trade_name:   'nombre_comercial',
  ruc:          'ruc',
  address:      'direccion_matriz',
};

const SETTINGS_GROUPS = [
  {
    group: 'Identidad del negocio',
    icon: <FiFileText size={16} />,
    color: 'var(--primary)',
    className: 'identity',
    fields: [
      { key: 'company_name', label: 'Razón social', icon: <FiFileText size={14} /> },
      { key: 'trade_name',   label: 'Nombre comercial', icon: <FiFileText size={14} /> },
      { key: 'ruc',          label: 'RUC / NIT', icon: <FiFileText size={14} /> },
    ],
  },
  {
    group: 'Contacto y ubicación',
    icon: <FiMapPin size={16} />,
    color: 'var(--primary)',
    className: 'contact',
    fields: [
      { key: 'address', label: 'Dirección', icon: <FiMapPin size={14} /> },
      { key: 'city',    label: 'Ciudad',    icon: <FiGlobe  size={14} /> },
      { key: 'country', label: 'País',      icon: <FiGlobe  size={14} /> },
      { key: 'phone',   label: 'Teléfono',  icon: <FiPhone  size={14} /> },
      { key: 'email',   label: 'Email',     icon: <FiMail   size={14} /> },
    ],
  },
];

const PRINTERS = [
  { key: 'printer_main',   label: 'Impresora principal (Caja)', color: '#f59e0b' },
  { key: 'printer_ticket', label: 'Impresora tickets',          color: '#f59e0b' },
];

const parsePrinter = value => {
  try { return value ? JSON.parse(value) : {}; } catch { return {}; }
};

// ─── SKELETON COMPONENT ──────────────────────────────────────────────────────

const SettingsSkeleton = () => (
  <div className="settings-skeleton">
    {/* Skeleton para las tarjetas */}
    <div className="settings-grid">
      {[1, 2].map(i => (
        <div key={i} className="settings-card skeleton-card">
          <div className="settings-card-header skeleton-header">
            <div className="skeleton-line skeleton-title" style={{ width: '60%' }} />
            <div className="skeleton-btn" />
          </div>
          {[1, 2, 3].map(j => (
            <div key={j} className="settings-field-row skeleton-field">
              <div className="settings-field-label">
                <div className="skeleton-line" style={{ width: '30%' }} />
              </div>
              <div className="skeleton-line skeleton-value" style={{ width: '50%' }} />
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* Skeleton para impresoras */}
    <div className="settings-card printer-section skeleton-card">
      <div className="settings-card-header skeleton-header">
        <div className="skeleton-line skeleton-title" style={{ width: '40%' }} />
      </div>
      <div className="printer-list">
        {[1, 2].map(i => (
          <div key={i} className="printer-card skeleton-printer">
            <div className="printer-card-header">
              <div className="skeleton-line" style={{ width: '35%' }} />
              <div className="skeleton-btn" />
            </div>
            <div className="printer-fields">
              {[1, 2, 3].map(j => (
                <div key={j} className="printer-field">
                  <div className="skeleton-line" style={{ width: '25%' }} />
                  <div className="skeleton-line" style={{ width: '45%' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>

    <style>{`
      .settings-skeleton {
        animation: fadeIn 0.3s ease;
      }

      .skeleton-card {
        animation: pulse 1.5s ease-in-out infinite;
      }

      .skeleton-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
      }

      .skeleton-line {
        height: 16px;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        border-radius: 4px;
        animation: shimmer 1.5s ease-in-out infinite;
      }

      .skeleton-title {
        height: 20px;
        border-radius: 4px;
      }

      .skeleton-btn {
        width: 80px;
        height: 32px;
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        border-radius: 6px;
        animation: shimmer 1.5s ease-in-out infinite;
      }

      .skeleton-field {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 16px;
      }

      .skeleton-value {
        height: 14px;
        border-radius: 4px;
      }

      .skeleton-printer {
        padding: 16px;
        border-bottom: 1px solid #e2e8f0;
      }

      .skeleton-printer:last-child {
        border-bottom: none;
      }

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `}</style>
  </div>
);

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useSession();
  const [settings,    setSettings   ] = useState({});
  const [loading,     setLoading    ] = useState(true);
  const [saving,      setSaving     ] = useState({});
  const [msg,         setMsg        ] = useState(null);
  const [error,       setError      ] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupValues, setGroupValues] = useState({});
  const [printerEdit, setPrinterEdit] = useState(null);
  const [einvCfg, setEinvCfg] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Carga ────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    
    try {
      const [settingsRes, einvRes] = await Promise.all([
        fetchWithAuth('/settings'),
        fetchWithAuth('/einvoicing/config').catch(() => null),
      ]);
      
      const data = await settingsRes.json();
      const s = data?.data ?? data ?? {};
      setSettings(s);
      
      if (einvRes?.ok) {
        const einvData = await einvRes.json();
        setEinvCfg(einvData);
      }
    } catch (e) {
      setError(e.message || 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Helpers de feedback ──────────────────────────────────────────────────

  const showMsg = (ok, text) => {
    setMsg({ ok, text });
    if (ok) setTimeout(() => setMsg(null), 3000);
  };

  // ── Edición de grupos ────────────────────────────────────────────────────

  const startGroupEdit = (groupName, fields) => {
    const values = {};
    fields.forEach(({ key }) => {
      values[key] = settings[key] ?? '';
    });
    setGroupValues(values);
    setEditingGroup(groupName);
  };

  const cancelGroupEdit = () => {
    setEditingGroup(null);
    setGroupValues({});
  };

  const handleGroupFieldChange = (key, value) => {
    setGroupValues(prev => ({ ...prev, [key]: value }));
  };

  const saveGroupEdit = async (groupName, fields) => {
    setSaving(s => ({ ...s, [groupName]: true }));
    
    try {
      const savePromises = fields.map(({ key }) => 
        fetchWithAuth(`/settings/${key}`, {
          method: 'PUT',
          body: JSON.stringify({ value: groupValues[key] }),
        })
      );
      
      await Promise.all(savePromises);
      
      const newSettings = { ...settings };
      fields.forEach(({ key }) => {
        newSettings[key] = groupValues[key];
      });
      setSettings(newSettings);
      
      fields.forEach(({ key }) => {
        if (EINV_SYNC[key]) {
          fetchWithAuth('/einvoicing/config', {
            method: 'PUT',
            body: JSON.stringify({ [EINV_SYNC[key]]: groupValues[key] }),
          }).catch(() => {});
        }
      });
      
      showMsg(true, 'Guardado correctamente');
      setEditingGroup(null);
      setGroupValues({});
    } catch (e) {
      showMsg(false, e.message || 'Error al guardar');
    } finally {
      setSaving(s => ({ ...s, [groupName]: false }));
    }
  };

  // ── Edición de impresoras ────────────────────────────────────────────────

  const startPrinterEdit = key =>
    setPrinterEdit({ key, value: { ...parsePrinter(settings[key]) } });

  const cancelPrinterEdit = () => setPrinterEdit(null);

  const onPrinterFieldChange = (field, newValue) =>
    setPrinterEdit(e => ({
      ...e,
      value: { ...e.value, [field]: field === 'width' ? Number(newValue) : newValue },
    }));

  const savePrinterEdit = async () => {
    const { key, value } = printerEdit;
    setSaving(s => ({ ...s, [key]: true }));
    
    try {
      await fetchWithAuth(`/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value: JSON.stringify(value) }),
      });
      
      setSettings(s => ({ ...s, [key]: JSON.stringify(value) }));
      showMsg(true, 'Guardado correctamente');
      setPrinterEdit(null);
    } catch (e) {
      showMsg(false, e.message || 'Error al guardar');
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  async function handleRefresh() {
    setRefreshing(true);
    setError('');
    try {
      await load();
    } catch {
      setError('Error al actualizar los datos');
    } finally {
      setRefreshing(false);
    }
  }

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

  // SI ESTÁ CARGANDO, MOSTRAR SKELETON
  if (loading) {
    return (
      <PageTemplate
        title="CONFIGURACIÓN"
        subtitle="Datos generales y configuración del negocio"
        loading={false}
        headerAction={refreshButton}
      >
        <SettingsSkeleton />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="CONFIGURACIÓN"
      subtitle="Datos generales y configuración del negocio"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={refreshButton}
    >
      {msg && (
        <div className={`settings-toast ${msg.ok ? 'ok' : 'fail'}`}>
          {msg.ok ? <FiCheck size={15} /> : <FiAlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {/* ── Grupos normales ── */}
      <div className="settings-grid">
        {SETTINGS_GROUPS.map(({ group, icon, color, className, fields }) => {
          const isEditing = editingGroup === group;
          
          return (
            <div key={group} className={`settings-card ${className}`}>
              <div className="settings-card-header" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="settings-card-header-left">
                  <span style={{ color: 'var(--text-primary)' }}>{icon}</span>
                  <span className="settings-card-title" style={{ color: 'var(--text-primary)' }}>{group}</span>
                </div>
                <div className="settings-card-header-right">
                  {isEditing ? (
                    <ButtonGroup>
                      <IconTextButton
                        variant=""
                        size="sm"
                        icon={<FiX size={13} />}
                        onClick={cancelGroupEdit}
                        disabled={!!saving[group]}
                      >
                        Cancelar
                      </IconTextButton>
                      <IconTextButton
                        variant="success"
                        size="sm"
                        icon={<FiSave size={13} />}
                        onClick={() => saveGroupEdit(group, fields)}
                        disabled={!!saving[group]}
                        loading={!!saving[group]}
                      >
                        Guardar
                      </IconTextButton>
                    </ButtonGroup>
                  ) : (
                    <IconTextButton
                      variant="success"
                      size="sm"
                      icon={<FiEdit2 size={13} />}
                      onClick={() => startGroupEdit(group, fields)}
                      disabled={!!saving[group]}
                    >
                      Editar
                    </IconTextButton>
                  )}
                </div>
              </div>

              {fields.map(({ key, label, icon: fieldIcon }) => (
                <div className="settings-field-row" key={key}>
                  <div className="settings-field-label">
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{fieldIcon}</span>
                    <span>{label}</span>
                  </div>

                  {isEditing ? (
                    <Input
                      value={groupValues[key] ?? ''}
                      onChange={(value) => handleGroupFieldChange(key, value)}
                      placeholder={`Ingrese ${label}`}
                      size="sm"
                      variant="bordered"
                      autoFocus={fields[0].key === key}
                      disabled={!!saving[group]}
                    />
                  ) : (
                    <span className="settings-value" style={{ color: settings[key] ? 'var(--text-primary)' : '#bbb' }}>
                      {settings[key] || '— sin configurar —'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Impresoras ── */}
      <div className="settings-card printer-section">
        <div className="settings-card-header printer-header" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="settings-card-header-left">
            <span style={{ color: 'var(--text-primary)' }}><FiPrinter size={16} /></span>
            <span className="settings-card-title" style={{ color: 'var(--text-primary)' }}>IMPRESIÓN</span>
          </div>
        </div>

        <div className="printer-list">
          {PRINTERS.map(({ key, label }) => {
            const valueObj = parsePrinter(settings[key]);
            const editing  = printerEdit?.key === key;

            return (
              <div className="printer-card" key={key}>
                <div className="printer-card-header">
                  <div className="printer-card-title">
                    <FiPrinter size={16} color="var(--text-primary)" />
                    <b style={{ color: 'var(--text-primary)', fontSize: 16 }}>{label}</b>
                  </div>
                  <div className="printer-card-actions">
                    {editing ? (
                      <ButtonGroup>
                        <IconTextButton
                          variant=""
                          size="sm"
                          icon={<FiX size={13} />}
                          onClick={cancelPrinterEdit}
                          disabled={saving[key]}
                        >
                          Cancelar
                        </IconTextButton>
                        <IconTextButton
                          variant="success"
                          size="sm"
                          icon={<FiSave size={13} />}
                          onClick={savePrinterEdit}
                          disabled={saving[key]}
                          loading={saving[key]}
                        >
                          Guardar
                        </IconTextButton>
                      </ButtonGroup>
                    ) : (
                      <IconTextButton
                        variant="success"
                        size="sm"
                        icon={<FiEdit2 size={13} />}
                        onClick={() => startPrinterEdit(key)}
                        disabled={saving[key]}
                      >
                        Editar
                      </IconTextButton>
                    )}
                  </div>
                </div>

                <div className="printer-fields">
                  {['name', 'width', 'footer'].map(field => (
                    <div key={field} className="printer-field">
                      <label>
                        {{ name: 'NOMBRE:', width: 'ANCHO DE PAPEL:', footer: 'PIE DE IMPRESIÓN:' }[field]}
                      </label>
                      {editing ? (
                        <Input
                          type={field === 'width' ? 'number' : 'text'}
                          value={printerEdit.value[field] ?? ''}
                          onChange={value => onPrinterFieldChange(field, value)}
                          placeholder={
                            field === 'name' ? 'Nombre de la impresora' :
                            field === 'width' ? 'Ancho en mm' :
                            'Texto del pie de impresión'
                          }
                          size="sm"
                          variant="bordered"
                          disabled={saving[key]}
                        />
                      ) : (
                        <span className="printer-value" style={{ color: valueObj[field] ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {valueObj[field] ?? '— sin configurar —'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageTemplate>
  );
}