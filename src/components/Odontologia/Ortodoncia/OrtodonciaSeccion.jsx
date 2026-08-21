// components/Odontologia/Ortodoncia/OrtodonciaSeccion.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSave,
  FiEdit3,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';
import OrtodonciaDiagnostico from './OrtodonciaDiagnostico';
import OrtodonciaTrabajo from './OrtodonciaTrabajo';
import OrtodonciaTratamiento from './OrtodonciaTratamiento';
import OrtodonciaResumen from './OrtodonciaResumen';
import OrtodonciaFotos from './OrtodonciaFotos';
import OrtodonciaPlanPagos from './OrtodonciaPlanPagos';

// ============================================================
// ESTADO INICIAL
// ============================================================
const EMPTY_STATE = {
  id: null,
  paciente_id: null,
  requiere_tratamiento: false,
  motivo_no_requiere: '',
  estado: 'diagnostico',
  doctor: '',
  fecha_inicio: '',
  fecha_fin: '',
  diagnostico: {},
  trabajo: {},
  tratamiento: {},
  resumen: {},
  fotografias: [],
};

// ============================================================
// TABS
// ============================================================
const TABS = [
  { id: 'diagnostico', label: 'Examen clínico' },
  { id: 'trabajo', label: 'Plan de Trabajo' },
  { id: 'tratamiento', label: 'Plan de tratamiento' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'fotos', label: 'Fotografías' },
  { id: 'plan', label: 'Plan de Pagos' },
];

// ============================================================
// ESTILOS
// ============================================================
const styles = {
  container: {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    background: '#fafbfc',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerBadge: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#64748b',
    background: '#f1f5f9',
    padding: '2px 10px',
    borderRadius: '12px',
    marginLeft: '8px',
  },
  saveButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
    transition: 'all 0.2s',
  },
  saveButtonDisabled: {
    opacity: 0.7,
    cursor: 'wait',
  },
  requiereBox: {
    padding: '16px 20px',
    background: '#f0fdf4',
    borderRadius: '8px',
    margin: '16px 20px',
    border: '1px solid #bbf7d0',
  },
  requiereLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#065f46',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#10b981',
  },
  tabsContainer: {
    display: 'flex',
    gap: '4px',
    padding: '0 20px',
    borderBottom: '1px solid #e2e8f0',
    background: '#ffffff',
    flexWrap: 'wrap',
  },
  tab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    fontSize: '13px',
    fontWeight: 500,
    color: '#94a3b8',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  tabActive: {
    color: '#0f172a',
    fontWeight: 600,
    borderBottom: '2px solid #10b981',
  },
  tabDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  formContainer: {
    padding: '20px',
  },
  motivoTextarea: {
    width: '100%',
    marginTop: '4px',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
    fontFamily: 'inherit',
    background: '#ffffff',
    color: '#1e293b',
    boxSizing: 'border-box',
  },
  noRequiereBox: {
    padding: '16px 20px',
    background: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fcd34d',
    margin: '0 20px 20px 20px',
  },
  noRequiereText: {
    margin: 0,
    color: '#92400e',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  message: {
    margin: '12px 20px',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  messageError: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
  },
  messageSuccess: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '60px',
  },
  loadingSpinner: {
    animation: 'spin 1s linear infinite',
    color: '#6366f1',
    fontSize: '32px',
  },
  motivoLabel: {
    fontWeight: 500,
    fontSize: '13px',
    color: '#475569',
    display: 'block',
    marginBottom: '4px',
  },
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function OrtodonciaSeccion({ paciente, pacienteId, onSave }) {
  const [activeTab, setActiveTab] = useState('diagnostico');
  const [form, setForm] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [ortodonciaId, setOrtodonciaId] = useState(null);

  // ============================================================
  // CARGAR DATOS
  // ============================================================
  const loadData = useCallback(async () => {
    if (!pacienteId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth(`/api/odontologia/ortodoncias/patient/${pacienteId}`);
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const registro = data.data;
        setForm({
          ...EMPTY_STATE,
          ...registro,
          id: registro.id,
          paciente_id: registro.paciente_id,
          requiere_tratamiento: registro.requiere_tratamiento || false,
          estado: registro.estado || 'diagnostico',
          doctor: registro.doctor || 'Dr. Jefferson Cagua',
          fecha_inicio: registro.fecha_inicio || '',
          fecha_fin: registro.fecha_fin || '',
          diagnostico: { ...(registro.diagnostico || {}) },
          trabajo: { ...(registro.trabajo || {}) },
          tratamiento: { ...(registro.tratamiento || {}) },
          resumen: { ...(registro.resumen || {}) },
          fotografias: registro.fotografias || [],
        });
        setOrtodonciaId(registro.id);
        if (onSave) onSave(registro);
      } else {
        setForm({
          ...EMPTY_STATE,
          paciente_id: pacienteId,
          doctor: 'Dr. Jefferson Cagua',
        });
        setOrtodonciaId(null);
      }
    } catch (err) {
      console.error('❌ Error cargando ortodoncia:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [pacienteId, onSave]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  // ============================================================
  // GUARDAR DATOS
  // ============================================================
  const saveData = async () => {
    if (!pacienteId) {
      setError('No hay paciente seleccionado');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const dataToSend = {
        paciente_id: pacienteId,
        requiere_tratamiento: form.requiere_tratamiento,
        diagnostico: form.diagnostico,
        trabajo: form.trabajo,
        tratamiento: form.tratamiento,
        resumen: form.resumen,
        doctor: form.doctor || form.resumen?.doctor || 'Dr. Jefferson Cagua',
        estado: form.requiere_tratamiento ? 'diagnostico' : 'no_requiere',
        fecha_inicio: form.fecha_inicio || form.tratamiento?.fecha_inicial || null,
        fecha_fin: form.fecha_fin || form.tratamiento?.fecha_final || null,
      };

      let url, method;

      if (ortodonciaId) {
        url = `/api/odontologia/ortodoncias/${ortodonciaId}`;
        method = 'PUT';
      } else {
        url = '/api/odontologia/ortodoncias';
        method = 'POST';
      }

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Error al guardar');
      }

      const savedData = result.data;

      setForm((prev) => ({
        ...prev,
        ...savedData,
        id: savedData.id,
        paciente_id: savedData.paciente_id,
        requiere_tratamiento: savedData.requiere_tratamiento,
        estado: savedData.estado,
        doctor: savedData.doctor,
        fecha_inicio: savedData.fecha_inicio,
        fecha_fin: savedData.fecha_fin,
        diagnostico: { ...(savedData.diagnostico || {}) },
        trabajo: { ...(savedData.trabajo || {}) },
        tratamiento: { ...(savedData.tratamiento || {}) },
        resumen: { ...(savedData.resumen || {}) },
        fotografias: savedData.fotografias || [],
      }));
      setOrtodonciaId(savedData.id);

      if (onSave) onSave(savedData);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('❌ Error guardando:', err);
      setError(err.message || 'Error al guardar');
      setTimeout(() => setError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleNestedChange = (section, name, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value,
      },
    }));
  };

  const handleSectionUpdate = (section, data) => {
    setForm((prev) => ({
      ...prev,
      [section]: data,
    }));
  };

  const handleRequiereChange = (checked) => {
    setForm((prev) => ({
      ...prev,
      requiere_tratamiento: checked,
      motivo_no_requiere: checked ? '' : prev.motivo_no_requiere,
    }));
    if (!checked) setActiveTab('diagnostico');
  };

  const handleMotivoChange = (e) => {
    setForm((prev) => ({ ...prev, motivo_no_requiere: e.target.value }));
  };

  const handleFotosUpdate = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  const visibleTabs = form.requiere_tratamiento === true
    ? TABS
    : TABS.filter((t) => t.id === 'diagnostico');

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <FiRefreshCw style={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.headerTitle}>
            <FiEdit3 size={20} style={{ color: '#6366f1' }} />
            Ortodoncia
            {ortodonciaId && (
              <span style={styles.headerBadge}>
                ID: {ortodonciaId.slice(0, 8)}
              </span>
            )}
            {saving && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: '#3b82f6',
                marginLeft: '8px',
              }}>
                <FiRefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...
              </span>
            )}
          </h3>
        </div>
        <div>
          <button
            style={{
              ...styles.saveButton,
              ...(saving ? styles.saveButtonDisabled : {}),
            }}
            onClick={saveData}
            disabled={saving}
          >
            <FiSave size={16} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* MENSAJES */}
      {error && (
        <div style={{ ...styles.message, ...styles.messageError }}>
          <FiAlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ ...styles.message, ...styles.messageSuccess }}>
          <FiCheckCircle size={16} /> Datos guardados correctamente
        </div>
      )}

      {/* CHECKBOX REQUIERE TRATAMIENTO */}
      <div style={styles.requiereBox}>
        <label style={styles.requiereLabel}>
          <input
            type="checkbox"
            style={styles.checkbox}
            checked={form.requiere_tratamiento === true}
            onChange={(e) => handleRequiereChange(e.target.checked)}
          />
          <span>Requiere tratamiento de ortodoncia</span>
        </label>
        {form.requiere_tratamiento === false && (
          <div style={{ marginTop: '10px' }}>
            <label style={styles.motivoLabel}>Motivo de no requerir tratamiento</label>
            <textarea
              style={styles.motivoTextarea}
              value={form.motivo_no_requiere || ''}
              onChange={handleMotivoChange}
              placeholder="Ej: Paciente sin alteraciones oclusales que requieran tratamiento ortodóntico."
              rows={2}
            />
          </div>
        )}
      </div>

      {/* TABS */}
      {form.requiere_tratamiento === true && (
        <div style={styles.tabsContainer}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                style={{
                  ...styles.tab,
                  ...(isActive ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* CONTENIDO */}
      <div style={styles.formContainer}>
        {activeTab === 'diagnostico' && (
          <OrtodonciaDiagnostico
            form={form}
            handleNestedChange={handleNestedChange}
          />
        )}
        {activeTab === 'trabajo' && form.requiere_tratamiento === true && (
          <OrtodonciaTrabajo
            form={form}
            handleNestedChange={handleNestedChange}
          />
        )}
        {activeTab === 'tratamiento' && form.requiere_tratamiento === true && (
          <OrtodonciaTratamiento
            form={form}
            handleNestedChange={handleNestedChange}
            pacienteId={pacienteId}
            ortodonciaId={ortodonciaId}
            onPlanGenerado={(plan) => {
              console.log('Plan generado:', plan);
              // Recargar datos si es necesario
            }}
          />
        )}
        {activeTab === 'resumen' && form.requiere_tratamiento === true && (
          <OrtodonciaResumen
            form={form}
            handleNestedChange={handleNestedChange}
          />
        )}
        {activeTab === 'fotos' && form.requiere_tratamiento === true && (
          <OrtodonciaFotos
            form={form}
            pacienteId={pacienteId}
            ortodonciaId={ortodonciaId}
            onUpdate={handleFotosUpdate}
          />
        )}
        {activeTab === 'plan' && form.requiere_tratamiento === true && (
          <OrtodonciaPlanPagos
            pacienteId={pacienteId}
            paciente={paciente}
            onPlanGenerated={(plan) => {
              console.log('Plan cargado:', plan);
            }}
          />
        )}
      </div>

      {/* MENSAJE NO REQUIERE TRATAMIENTO */}
      {form.requiere_tratamiento === false && (
        <div style={styles.noRequiereBox}>
          <p style={styles.noRequiereText}>
            <FiAlertCircle size={16} />
            {form.motivo_no_requiere || 'Paciente no requiere tratamiento de ortodoncia.'}
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}