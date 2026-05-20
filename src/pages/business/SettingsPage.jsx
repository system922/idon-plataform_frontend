import { useState, useEffect } from 'react';
import {
  FiRefreshCw, FiAlertCircle,
  FiEdit2, FiSave, FiX, FiCheck,
  FiGlobe, FiPhone, FiMail, FiMapPin, FiFileText, FiPrinter
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/SettingsPage.css';

// ─── Constantes ───────────────────────────────────────────────────────────────

// Fields that should silently sync to einvoice config when saved
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
    color: '#6842fe',
    className: 'identity',
    fields: [
      { key: 'company_name', label: 'Razón social',      icon: <FiFileText size={14} /> },
      { key: 'trade_name',   label: 'Nombre comercial',  icon: <FiFileText size={14} /> },
      { key: 'ruc',          label: 'RUC / NIT',         icon: <FiFileText size={14} /> },
    ],
  },
  {
    group: 'Contacto y ubicación',
    icon: <FiMapPin size={16} />,
    color: '#10b981',
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings,    setSettings   ] = useState({});
  const [loading,     setLoading    ] = useState(true);
  const [saving,      setSaving     ] = useState({});
  const [msg,         setMsg        ] = useState(null);
  const [error,       setError      ] = useState(null);
  const [editKey,     setEditKey    ] = useState(null);
  const [editValue,   setEditValue  ] = useState('');
  const [printerEdit, setPrinterEdit] = useState(null);

  // Einvoice config (solo para sincronizar campos al guardar)
  const [einvCfg, setEinvCfg] = useState(null);

  // ── Carga ────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true); setError(null); setMsg(null);
    try {
      const [settingsRes, einvRes] = await Promise.all([
        fetchWithAuth('/api/settings'),
        fetchWithAuth('/api/einvoicing/config').catch(() => null),
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

  // ── Edición de campos normales ───────────────────────────────────────────

  const startEdit  = key => { setEditKey(key); setEditValue(settings[key] ?? ''); };
  const cancelEdit = ()  => { setEditKey(null); setEditValue(''); };

  const saveEdit = async key => {
    setSaving(s => ({ ...s, [key]: true }));
    try {
      await fetchWithAuth(`/api/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value: editValue }),
      });
      setSettings(s => ({ ...s, [key]: editValue }));
      // Silently sync to einvoice config so user only enters data once
      if (EINV_SYNC[key]) {
        fetchWithAuth('/api/einvoicing/config', {
          method: 'PUT',
          body: JSON.stringify({ [EINV_SYNC[key]]: editValue }),
        }).catch(() => {});
      }
      showMsg(true, 'Guardado correctamente');
      setEditKey(null);
    } catch (e) {
      showMsg(false, e.message || 'Error al guardar');
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
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
      await fetchWithAuth(`/api/settings/${key}`, {
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

  const isSavingAny = Object.values(saving).some(Boolean);

  return (
    <PageTemplate
      title="Configuración"
      subtitle="Datos generales y configuración del negocio"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={
        <button onClick={load} disabled={loading || isSavingAny} className="printer-edit">
          <FiRefreshCw size={14} className={loading ? 'spin' : ''} /> Recargar
        </button>
      }
    >
      {msg && (
        <div className={`settings-toast ${msg.ok ? 'ok' : 'fail'}`}>
          {msg.ok ? <FiCheck size={15} /> : <FiAlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {/* ── Grupos normales ── */}
      <div className="settings-grid">
        {SETTINGS_GROUPS.map(({ group, icon, color, className, fields }) => (
          <div key={group} className={`settings-card ${className}`}>
            <div className="settings-card-header" style={{ background: `${color}10` }}>
              <span style={{ color }}>{icon}</span>
              <span className="settings-card-title">{group}</span>
            </div>

            {fields.map(({ key, label, icon: fieldIcon }) => (
              <div className="settings-field-row" key={key}>
                <div className="settings-field-label">
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>{fieldIcon}</span>
                  <span>{label}</span>
                </div>

                {editKey === key ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  saveEdit(key);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="settings-input"
                  />
                ) : (
                  <span className="settings-value" style={{ color: settings[key] ? color : '#bbb' }}>
                    {settings[key] || '— sin configurar —'}
                  </span>
                )}

                <div className="settings-actions">
                  {editKey === key ? (
                    <>
                      <button onClick={() => saveEdit(key)} disabled={!!saving[key]} className="settings-action-save">
                        <FiSave size={13} /> Guardar
                      </button>
                      <button onClick={cancelEdit} className="settings-action-cancel">
                        <FiX size={13} /> Cancelar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(key)} disabled={!!saving[key]} className="settings-action-edit">
                      <FiEdit2 size={13} /> Editar
                    </button>
                  )}
                </div>
              </div>
            ))}

          </div>
        ))}
      </div>

      {/* ── Impresoras ── */}
      <div className="settings-card printer-section">
        <div className="settings-card-header printer-header">
          <span style={{ color: '#f59e0b' }}><FiPrinter size={16} /></span>
          <span className="settings-card-title" style={{ color: '#d29a21' }}>IMPRESIÓN</span>
        </div>

        <div className="printer-list">
          {PRINTERS.map(({ key, label }) => {
            const valueObj = parsePrinter(settings[key]);
            const editing  = printerEdit?.key === key;

            return (
              <div className="printer-card" key={key}>
                <div className="printer-card-title">
                  <FiPrinter size={16} color="#f59e0b" />
                  <b style={{ color: '#f59e0b', fontSize: 16 }}>{label}</b>
                </div>

                <div className="printer-fields">
                  {['name', 'width', 'footer'].map(field => (
                    <div key={field} className="printer-field">
                      <label>
                        {{ name: 'NOMBRE:', width: 'ANCHO DE PAPEL:', footer: 'PIE DE IMPRESIÓN:' }[field]}
                      </label>
                      {editing ? (
                        <input
                          className="printer-input"
                          type={field === 'width' ? 'number' : 'text'}
                          value={printerEdit.value[field] ?? ''}
                          onChange={e => onPrinterFieldChange(field, e.target.value)}
                          disabled={saving[key]}
                        />
                      ) : (
                        <span className="printer-value" style={{ color: valueObj[field] ? '#ffd066' : '#bbb' }}>
                          {valueObj[field] ?? '— sin configurar —'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="printer-actions">
                  {editing ? (
                    <>
                      <button onClick={savePrinterEdit} disabled={saving[key]} className="printer-save">
                        <FiSave size={13} /> Guardar
                      </button>
                      <button onClick={cancelPrinterEdit} className="printer-cancel">
                        <FiX size={13} /> Cancelar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startPrinterEdit(key)} disabled={saving[key]} className="printer-edit">
                      <FiEdit2 size={13} /> Editar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageTemplate>
  );
}
