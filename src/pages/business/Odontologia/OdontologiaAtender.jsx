// src/pages/business/Odontologia/OdontologiaAtender.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiUser, FiFileText, FiTool, FiClipboard, 
  FiActivity, FiHeart, FiDollarSign, FiFile, FiPaperclip,
  FiRefreshCw, FiSave, FiCheck, FiX, FiPhone, FiMapPin
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';
import PageTemplateOdontologia from '../../../components/PageTemplateOdontologia';
import { PacienteAvatar } from '../../../components/Odontologia/Pacientes/PacienteAvatar';
import '../../../styles/Odontologia/index.css';

// Importar los componentes de cada pestaña
import DatosPersonales from '../../../components/Odontologia/Pacientes/DatosPersonales';
import HistoriaClinica from '../../../components/Odontologia/Historias/HistoriaClinica';
import OdontogramaSeccion from '../../../components/Odontologia/Odontograma/OdontogramaSeccion';
import PeriodontogramaSeccion from '../../../components/Odontologia/Periodontograma/PeriodontogramaSeccion';
import { OrtodonciaSeccion } from '../../../components/Odontologia/Ortodoncia';
import EstadoCuentaSeccion from '../../../components/Odontologia/EstadoCuenta/EstadoCuentaSeccion';
import PrescripcionesSeccion from '../../../components/Odontologia/Prescripciones/PrescripcionesSeccion';
import ArchivosSeccion from '../../../components/Odontologia/Archivos/ArchivosSeccion';

// ============================================================
// TABS DE ATENCIÓN
// ============================================================
const TABS = [
  { id: 'datos', label: 'Datos Personales', icon: <FiUser size={16} /> },
  { id: 'historia', label: 'Historia Clínica', icon: <FiClipboard size={16} /> },
  { id: 'odontograma', label: 'Odontograma', icon: <FiTool size={16} /> },
  { id: 'periodonto', label: 'Periodontograma', icon: <FiActivity size={16} /> },
  { id: 'ortodoncia', label: 'Ortodoncia', icon: <FiHeart size={16} /> },
  { id: 'cuenta', label: 'Estado de Cuenta', icon: <FiDollarSign size={16} /> },
  { id: 'prescripciones', label: 'Prescripciones', icon: <FiFile size={16} /> },
  { id: 'archivos', label: 'Archivos', icon: <FiPaperclip size={16} /> },
];

// ============================================================
// FUNCIÓN PARA CONSTRUIR ESTADO POR DEFECTO
// ============================================================
const buildDefaultAttentionState = (cita, paciente, tratamiento, odontologo) => ({
  historial: [
    {
      id: 'hist-1',
      created_at: new Date().toISOString().slice(0, 10),
      doctor: odontologo?.nombre || 'Dr. Jefferson Cagua',
      motivo_consulta: cita?.motivo_consulta || '',
      observaciones: cita?.notas || '',
    },
  ],
  odontograma: { inicial: {}, evolucion: {}, alta: {} },
  periodonto: {
    doctor: odontologo?.nombre || 'Jefferson Cagua',
    seccion: 'diagnostico',
    notas: 'Registro inicial cargado desde atención.',
    control_placa: '',
    tecnica_cepillado: '',
    tecnica_hilo: '',
    eliminacion_supragingival: '',
    raspado_aislado: '',
    procedimientos_quirurgicos: '',
    notas_fase2: '',
    mantenimiento: '',
    teeth: {},
  },
  ortodoncia: {
    doctor: odontologo?.nombre || 'Jefferson Cagua',
    fecha_inicio: '',
    duracion_meses: '',
    fecha_fin: '',
    retraso_meses: '',
    nueva_fecha_fin: '',
    inasistencias: 0,
    diagnostico: '',
    plan_trabajo: '',
    plan_tratamiento: '',
    resumen: '',
    fotografias: [],
    examen: {},
    trabajo: {},
    tratamiento: {},
    resumenCampos: {},
  },
  presupuestos: [],
  pagos: [],
  laboratorios: [],
  recetas: [],
  archivos: [],
  patientProfile: paciente ? { ...paciente } : null,
  cita: cita ? { ...cita } : null,
  ultimaActualizacion: new Date().toISOString(),
});

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function OdontologiaAtender() {
  const { citaId } = useParams();
  const navigate = useNavigate();

  // ============================================================
  // ESTADOS
  // ============================================================
  const [cita, setCita] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [tratamiento, setTratamiento] = useState(null);
  const [odontologo, setOdontologo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('datos');
  const [bizInfo, setBizInfo] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tratamientosAPI, setTratamientosAPI] = useState([]);

  const [attentionState, setAttentionState] = useState({
    historial: [],
    odontograma: { inicial: {}, evolucion: {}, alta: {} },
    periodonto: null,
    ortodoncia: null,
    presupuestos: [],
    pagos: [],
    laboratorios: [],
    recetas: [],
    archivos: [],
    patientProfile: null,
    cita: null,
    ultimaActualizacion: null,
  });

  const attentionStorageKey = useMemo(() => `odontologia-atencion:${citaId}`, [citaId]);

  // ============================================================
  // CARGAR TRATAMIENTOS DESDE API
  // ============================================================
  const loadTratamientos = async () => {
    try {
      const res = await fetchWithAuth('/api/odontologia/tratamientos');
      const data = await res.json();
      
      let tratamientosData = [];
      if (Array.isArray(data)) {
        tratamientosData = data;
      } else if (data.success && data.data) {
        tratamientosData = Array.isArray(data.data) ? data.data : [];
      } else if (data.data && Array.isArray(data.data)) {
        tratamientosData = data.data;
      }
      
      setTratamientosAPI(tratamientosData);
      console.log('✅ [Atender] Tratamientos cargados:', tratamientosData.length);
    } catch (err) {
      console.error('❌ [Atender] Error cargando tratamientos:', err);
    }
  };

  // ============================================================
  // FUNCIÓN PARA CARGAR ODONTOGRAMAS DESDE API
  // ============================================================
  const loadOdontogramData = async (patientId) => {
    if (!patientId) return null;
    
    try {
      const fases = ['inicial', 'evolucion', 'alta'];
      const loadedData = {};
      
      for (const fase of fases) {
        const res = await fetchWithAuth(
          `/api/odontologia/odontogramas/patient/${patientId}/fase/${fase}`
        );
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            loadedData[fase] = {
              teeth: data.data.teeth || {},
              planTratamiento: data.data.plan_tratamiento || [],
              notas: data.data.notas || '',
              lastSavedAt: data.data.last_saved_at || null,
              planId: data.data.plan_id || null,
            };
            console.log(`✅ [Atender] Cargada fase ${fase}:`, Object.keys(loadedData[fase].teeth).length, 'dientes');
          } else {
            loadedData[fase] = { teeth: {}, planTratamiento: [], notas: '', lastSavedAt: null, planId: null };
          }
        } else {
          loadedData[fase] = { teeth: {}, planTratamiento: [], notas: '', lastSavedAt: null, planId: null };
        }
      }
      
      return loadedData;
    } catch (err) {
      console.error('❌ [Atender] Error cargando odontogramas:', err);
      return null;
    }
  };

  // ============================================================
  // CARGAR DATOS DESDE API
  // ============================================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('📋 [Atender] Cargando cita ID:', citaId);

        // Cargar cita
        const citaRes = await fetchWithAuth(`/api/odontologia/citas/${citaId}`);
        const citaData = await citaRes.json();

        if (!citaRes.ok || !citaData.success) {
          throw new Error(citaData.error || 'Cita no encontrada');
        }

        const citaEncontrada = citaData.data;
        console.log('✅ [Atender] Cita encontrada:', citaEncontrada);
        setCita(citaEncontrada);

        // Variables para paciente y otros datos
        let pacienteData = null;
        let odontologoData = null;
        let tratamientoData = null;
        let odontogramaData = null;

        // Cargar paciente
        if (citaEncontrada.patient_id) {
          try {
            const patientRes = await fetchWithAuth(`/api/odontologia/pacientes/${citaEncontrada.patient_id}`);
            const patientData = await patientRes.json();
            if (patientRes.ok && patientData.success) {
              console.log('✅ [Atender] Paciente encontrado:', patientData.data);
              pacienteData = patientData.data;
              setPaciente(pacienteData);
            }
          } catch (err) {
            console.warn('⚠️ [Atender] Error cargando paciente:', err);
          }
        }

        // Cargar especialista
        if (citaEncontrada.especialista_id) {
          try {
            const espRes = await fetchWithAuth(`/api/odontologia/especialistas/${citaEncontrada.especialista_id}`);
            const espData = await espRes.json();
            if (espRes.ok && espData.success) {
              console.log('✅ [Atender] Especialista encontrado:', espData.data);
              odontologoData = espData.data;
              setOdontologo(odontologoData);
            }
          } catch (err) {
            console.warn('⚠️ [Atender] Error cargando especialista:', err);
          }
        }

        // Cargar tratamiento
        if (citaEncontrada.tratamiento_id) {
          try {
            const tratRes = await fetchWithAuth(`/api/odontologia/tratamientos/${citaEncontrada.tratamiento_id}`);
            const tratData = await tratRes.json();
            if (tratRes.ok && tratData.success) {
              console.log('✅ [Atender] Tratamiento encontrado:', tratData.data);
              tratamientoData = tratData.data;
              setTratamiento(tratamientoData);
            }
          } catch (err) {
            console.warn('⚠️ [Atender] Error cargando tratamiento:', err);
          }
        }

        // Cargar lista de tratamientos (para selects)
        await loadTratamientos();

        // Cargar odontogramas del paciente
        if (pacienteData?.id) {
          odontogramaData = await loadOdontogramData(pacienteData.id);
          console.log('✅ [Atender] Odontogramas cargados:', odontogramaData);
        }

        // Inicializar el estado con los datos cargados
        const defaultState = buildDefaultAttentionState(citaEncontrada, pacienteData, tratamientoData, odontologoData);
        
        // Sobrescribir odontograma con datos cargados
        if (odontogramaData) {
          defaultState.odontograma = odontogramaData;
        }

        // Verificar localStorage para datos no guardados
        try {
          const stored = window.localStorage.getItem(attentionStorageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            defaultState.odontograma = {
              ...defaultState.odontograma,
              ...(parsed.odontograma || {}),
            };
            defaultState.periodonto = { ...defaultState.periodonto, ...(parsed.periodonto || {}) };
            defaultState.ortodoncia = { ...defaultState.ortodoncia, ...(parsed.ortodoncia || {}) };
            defaultState.presupuestos = parsed.presupuestos || defaultState.presupuestos;
            defaultState.pagos = parsed.pagos || defaultState.pagos;
            console.log('📦 [Atender] Combinado con datos locales');
          }
        } catch (err) {
          console.warn('⚠️ [Atender] Error cargando datos locales:', err);
        }

        setAttentionState(defaultState);
        setDataLoaded(true);

      } catch (err) {
        console.error('❌ [Atender] Error:', err);
        setError(err.message || 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    if (citaId) {
      loadData();
    }
  }, [citaId, attentionStorageKey]);

  // ============================================================
  // PERSISTIR ESTADO LOCAL
  // ============================================================
  useEffect(() => {
    if (!attentionState?.ultimaActualizacion || !citaId || loading || !dataLoaded) return;
    try {
      window.localStorage.setItem(attentionStorageKey, JSON.stringify(attentionState));
    } catch (error) {
      console.warn('No se pudo persistir la atención odontológica', error);
    }
  }, [attentionState, attentionStorageKey, citaId, loading, dataLoaded]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const updateAttentionState = (updater) => {
    setAttentionState(prev => {
      const nextState = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return {
        ...nextState,
        ultimaActualizacion: new Date().toISOString(),
      };
    });
  };

  // Función para actualizar odontograma phases
  const updateOdontogramPhases = (updater) => {
    setAttentionState(prev => {
      const currentOdontograma = prev.odontograma || { inicial: {}, evolucion: {}, alta: {} };
      const nextOdontograma = typeof updater === 'function' ? updater(currentOdontograma) : updater;
      
      return {
        ...prev,
        odontograma: nextOdontograma,
        ultimaActualizacion: new Date().toISOString(),
      };
    });
  };

  const handleSaveHistoria = (data) => {
    updateAttentionState(prev => ({
      ...prev,
      historial: [
        {
          id: `hist-${Date.now()}`,
          created_at: new Date().toISOString().slice(0, 10),
          doctor: odontologo?.nombre || 'Jefferson Cagua',
          motivo_consulta: data?.motivo_consulta || '',
          observaciones: data?.observaciones || '',
          snapshot: data,
        },
        ...(prev.historial || []),
      ],
    }));
  };

  const handleSavePeriodonto = (data) => {
    updateAttentionState(prev => ({
      ...prev,
      periodonto: {
        ...(prev.periodonto || {}),
        ...data,
      },
    }));
  };

  const handleSaveOrtodoncia = (data) => {
    updateAttentionState(prev => ({
      ...prev,
      ortodoncia: {
        ...(prev.ortodoncia || {}),
        ...data,
      },
    }));
  };

  const handleCreateBudget = (newPresupuesto) => {
    updateAttentionState(prev => {
      const maxId = (prev.presupuestos || []).reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
      return {
        ...prev,
        presupuestos: [...(prev.presupuestos || []), { ...newPresupuesto, id: maxId + 1 }],
      };
    });
  };

  const handleProcesarPago = (pagoData) => {
    updateAttentionState(prev => {
      const presupuestosActualizados = (prev.presupuestos || []).map(pres => {
        if (pres.id === pagoData.presupuesto_id) {
          const nuevoPagado = (pres.paid || 0) + pagoData.total;
          const nuevoPendiente = Math.max(0, (pres.total || 0) - nuevoPagado);
          return {
            ...pres,
            paid: nuevoPagado,
            pending: nuevoPendiente,
          };
        }
        return pres;
      });

      const nuevoPago = {
        id: (prev.pagos || []).length + 1,
        date: pagoData.date || new Date().toISOString().slice(0, 10),
        doctor: pagoData.doctor || odontologo?.nombre || 'Jefferson Cagua',
        reason: `Pago - ${pagoData.presupuesto_name || 'Presupuesto'}`,
        comment: `Pago de ${pagoData.metodo_pago} ${pagoData.referencia ? `- Ref: ${pagoData.referencia}` : ''}`,
        price: pagoData.total,
        method: pagoData.metodo_pago,
        reference: pagoData.referencia || null,
      };

      return {
        ...prev,
        presupuestos: presupuestosActualizados,
        pagos: [nuevoPago, ...(prev.pagos || [])],
      };
    });
  };

  const handleAddPresupuesto = (newPresupuesto) => {
    handleCreateBudget(newPresupuesto);
  };

  // Función para agregar presupuesto desde el plan de tratamiento
  const handleAddPresupuestoFromPlan = (newPresupuesto) => {
    handleCreateBudget(newPresupuesto);
  };

  const handleAddReceta = (newReceta) => {
    updateAttentionState(prev => ({
      ...prev,
      recetas: [
        {
          id: (prev.recetas || []).length + 1,
          ...newReceta,
          created_at: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
          doctor: odontologo?.nombre || 'Dr. Desconocido',
        },
        ...(prev.recetas || []),
      ],
    }));
  };

  const handleAddFiles = (files) => {
    updateAttentionState(prev => ({
      ...prev,
      archivos: [
        ...files,
        ...(prev.archivos || []),
      ],
    }));
  };

  const handleFinalizar = async () => {
    if (!cita || !cita.id) {
      alert('Error: No se puede finalizar la atención');
      return;
    }

    setSaving(true);

    try {
      const res = await fetchWithAuth(`/api/odontologia/citas/${cita.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al finalizar la atención');
      }

      console.log('✅ [Atender] Atención finalizada:', data);
      alert('Atención completada exitosamente');
      
      window.localStorage.removeItem(attentionStorageKey);
      navigate('/app/odontologia/odontologia.agenda');
    } catch (err) {
      console.error('❌ [Atender] Error al finalizar:', err);
      alert(err.message || 'Error al finalizar la atención');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#080810',
        color: '#fff'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <PageTemplateOdontologia title="Error" subtitle="No se pudo cargar la atención">
        <div className="odont-empty-state" style={{ padding: '40px', textAlign: 'center' }}>
          <h3 style={{ color: '#ef4444' }}>❌ {error}</h3>
          <button 
            className="odont-btn-secondary" 
            onClick={() => navigate('/app/odontologia/odontologia.agenda')}
            style={{ marginTop: '16px' }}
          >
            <FiArrowLeft /> Volver a la Agenda
          </button>
        </div>
      </PageTemplateOdontologia>
    );
  }

  if (!cita) {
    return (
      <PageTemplateOdontologia title="Cita no encontrada" subtitle="La cita que buscas no existe">
        <div className="odont-empty-state" style={{ padding: '40px', textAlign: 'center' }}>
          <h3>🔍 Cita no encontrada</h3>
          <p>La cita con ID {citaId} no existe en el sistema.</p>
          <button 
            className="odont-btn-secondary" 
            onClick={() => navigate('/app/odontologia/odontologia.agenda')}
            style={{ marginTop: '16px' }}
          >
            <FiArrowLeft /> Volver a la Agenda
          </button>
        </div>
      </PageTemplateOdontologia>
    );
  }

  // ============================================================
  // INLINE STYLES PARA LAS TARJETAS DE INFORMACIÓN DEL PACIENTE
  // ============================================================
  const cardStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s ease'
  };

  const iconStyle = (color) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: color,
    color: '#fff',
    flexShrink: 0
  });

  const infoStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: 500,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const valueStyle = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  const avatarStyle = {
    width: '70px',
    height: '70px',
    borderRadius: '8px',
    flexShrink: 0,
    overflow: 'hidden',
    padding: '0px',
  };

  return (
    <PageTemplateOdontologia
      title={`Atención Odontológica`}
      subtitle={`Paciente: ${paciente ? `${paciente.first_name || ''} ${paciente.last_name || ''}` : 'Cargando...'} | ${cita.fecha ? new Date(cita.fecha).toLocaleDateString() : ''} - ${cita.hora_inicio?.slice(0, 5) || ''}`}
      loading={loading}
      icon={<FiUser size={24} />}
      headerAction={
        <div className="odonto-header-actions">
          <button 
            className="odonto-btn-secondary" 
            onClick={() => navigate('/app/odontologia/odontologia.agenda')}
            title="Volver a la Agenda"
          >
            <FiArrowLeft size={18} /> Volver
          </button>
          
          <button 
            className="odonto-btn-primary" 
            onClick={handleFinalizar}
            disabled={saving}
            title="Finalizar Atención"
          >
            {saving ? (
              <><FiRefreshCw size={18} className="spin" /> Finalizando...</>
            ) : (
              <><FiCheck size={18} /> Finalizar Atención</>
            )}
          </button>
        </div>
      }
    >
      {/* ============================================================
          TARJETAS DE INFORMACIÓN DEL PACIENTE
          ============================================================ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '10px'
      }}>
        <div style={cardStyle}>
          <div style={avatarStyle}>
            <PacienteAvatar 
              firstName={paciente?.first_name}
              lastName={paciente?.last_name}
              imageUrl={paciente?.image_url}
              size={70}
            />
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Paciente</span>
            <span style={valueStyle}>
              {paciente ? `${paciente.first_name || ''} ${paciente.last_name || ''}` : '—'}
            </span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={iconStyle('#8b5cf6')}>
            <FiFileText size={18} />
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>No. Cédula</span>
            <span style={valueStyle}>{paciente?.document_number || '—'}</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={iconStyle('#3b82f6')}>
            <FiUser size={18} />
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Odontólogo</span>
            <span style={valueStyle}>{odontologo?.nombre || '—'}</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={iconStyle('#10b981')}>
            <FiTool size={18} />
          </div>
          <div style={infoStyle}>
            <span style={labelStyle}>Tratamiento</span>
            <span style={valueStyle}>{tratamiento?.name || '—'}</span>
          </div>
        </div>
      </div>

      {/* Tabs de atención */}
      <div className="odonto-config-tabs-wrapper">
        <div className="odonto-config-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`odonto-config-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                fontSize: '14px',
                padding: '6px 10px',
                gap: '4px'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="odonto-config-content-wrapper">
        {activeTab === 'datos' && <DatosPersonales paciente={paciente} />}
        {activeTab === 'historia' && (
          <HistoriaClinica
            paciente={paciente}
            historialPrevio={attentionState.historial || []}
            onSave={handleSaveHistoria}
          />
        )}
        {activeTab === 'odontograma' && (
          <OdontogramaSeccion
            odontogramPhases={attentionState.odontograma || { inicial: {}, evolucion: {}, alta: {} }}
            setOdontogramPhases={updateOdontogramPhases}
            onAddPresupuesto={handleAddPresupuestoFromPlan}
            pacienteId={paciente?.id}
            pacienteNombre={paciente ? `${paciente.first_name || ''} ${paciente.last_name || ''}`.trim() : 'Paciente'}
            onSaveOdontograma={(data) => {
              console.log('✅ [Atender] Odontograma guardado:', data);
            }}
          />
        )}
        {activeTab === 'periodonto' && (
          <PeriodontogramaSeccion
            periodontoState={attentionState.periodonto || null}
            onSave={(data) => {
              updateAttentionState(prev => ({
                ...prev,
                periodonto: {
                  ...(prev.periodonto || {}),
                  ...data,
                  lastSavedAt: new Date().toISOString()
                }
              }));
              if (handleSavePeriodonto) {
                handleSavePeriodonto(data);
              }
            }}
            pacienteId={paciente?.id}        
            pacienteData={paciente}           
          />
        )}
        {activeTab === 'ortodoncia' && (
          <OrtodonciaSeccion
            paciente={paciente}
            pacienteId={paciente?.id}
            ortodonciaState={attentionState.ortodoncia || null}
            onSave={handleSaveOrtodoncia}
          />
        )}
        {activeTab === 'cuenta' && (
          <EstadoCuentaSeccion
            paciente={paciente}
            presupuestos={attentionState.presupuestos || []}
            pagos={attentionState.pagos || []}
            laboratorios={attentionState.laboratorios || []}
            onCreateBudget={handleCreateBudget}
            onProcesarPago={handleProcesarPago}
            currencySymbol="US$"
            bizInfo={bizInfo}
          />
        )}
        {activeTab === 'prescripciones' && (
          <PrescripcionesSeccion
            paciente={paciente}
            odontologo={odontologo}
            recetas={attentionState.recetas || []}
            onSaveReceta={handleAddReceta}
          />
        )}
        {activeTab === 'archivos' && (
          <ArchivosSeccion
            archivos={attentionState.archivos || []}
            onAddFiles={handleAddFiles}
          />
        )}
      </div>
    </PageTemplateOdontologia>
  );
}