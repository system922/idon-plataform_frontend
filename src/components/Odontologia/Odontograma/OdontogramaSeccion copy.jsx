// components/Odontologia/Odontograma/OdontogramaSeccion.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { 
  FiCheckCircle, FiRefreshCw, FiAlertCircle, FiPlus, FiTrash2, 
  FiCheck, FiDollarSign, FiList, FiSave, FiClock, FiTool,
  FiEdit2, FiClipboard, FiActivity, FiUser, FiCalendar, FiLock
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase';
import Odontograma, { CONDITION_MAP } from './index';
import OdontogramaHeader from './OdontogramaHeader';
import OdontogramaStatusBar from './OdontogramaStatusBar';
import OdontogramaMultipleSelection from './OdontogramaMultipleSelection';
import '../../../styles/Odontologia/Odontograma.css';

// ============================================================
// CONSTANTES
// ============================================================
export const PHASES = [
  { id: 'inicial', label: 'Odo. Inicial', editable: true, hasPlan: false },
  { id: 'evolucion', label: 'Odo. Evolución', editable: true, hasPlan: true },
  { id: 'alta', label: 'Odo. Alta', editable: false, hasPlan: false },
];

export const CONDICIONES_FAVORABLES = [
  'diente_sano',
  'resina_adaptada',
  'amalgama_adaptada',
  'sellante_bueno',
  'corona_buena',
  'provisional',
  'endodoncia_buena',
  'perno_bueno',
  'implante_bueno',
  'ponico'
];

const ESTADOS_TRATAMIENTO = [
  { value: 'pendiente', label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d' },
  { value: 'en_proceso', label: 'En proceso', color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd' },
  { value: 'completado', label: 'Completado', color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' },
  { value: 'cancelado', label: 'Cancelado', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
];

const DEFAULT_PHASE = {
  teeth: {},
  planTratamiento: [],
  notas: '',
  lastSavedAt: null,
  planId: null,
};

export const clonePhase = (phase) => ({
  ...DEFAULT_PHASE,
  ...(phase || {}),
  teeth: { ...(phase?.teeth || {}) },
  planTratamiento: [...(phase?.planTratamiento || [])],
});

export const getConditionLabel = (condition, surfaces = []) => {
  const info = CONDITION_MAP[condition];
  const surfacesText = surfaces.length > 0 ? ` (${surfaces.join(', ')})` : '';
  return `${info?.label || condition || 'Sin hallazgo'}${surfacesText}`;
};

// ============================================================
// COMPONENTE PARA AGREGAR TRATAMIENTO
// ============================================================
const AgregarTratamiento = ({ toothNumber, tratamientosAPI, onAdd }) => {
  const [servicioId, setServicioId] = useState('');
  const [showSelect, setShowSelect] = useState(false);

  const handleAdd = () => {
    if (!servicioId) return;
    const tratamiento = tratamientosAPI.find(t => t.id === servicioId);
    onAdd(toothNumber, {
      servicio_id: servicioId,
      servicio: tratamiento?.name || 'Tratamiento',
      price: tratamiento?.price || 0,
      estado: 'pendiente',
      observaciones: '',
    });
    setServicioId('');
    setShowSelect(false);
  };

  if (!showSelect) {
    return (
      <button
        onClick={() => setShowSelect(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 12px',
          borderRadius: '6px',
          border: '1px dashed #10b981',
          background: 'transparent',
          color: '#10b981',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#ecfdf5';
          e.currentTarget.style.borderColor = '#10b981';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = '#10b981';
        }}
      >
        <FiPlus size={14} /> Agregar tratamiento
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={servicioId}
        onChange={(e) => setServicioId(e.target.value)}
        style={{
          padding: '4px 10px',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          fontSize: '12px',
          background: '#fff',
          minWidth: '140px',
          outline: 'none',
          transition: 'all 0.2s'
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = '#10b981'}
        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
        autoFocus
      >
        <option value="">Seleccionar...</option>
        {tratamientosAPI.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} {t.price ? `($${t.price})` : ''}
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        style={{
          padding: '4px 12px',
          borderRadius: '6px',
          border: 'none',
          background: '#10b981',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
      >
        Añadir
      </button>
      <button
        onClick={() => setShowSelect(false)}
        style={{
          padding: '4px 8px',
          borderRadius: '6px',
          border: 'none',
          background: '#ef4444',
          color: '#fff',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
      >
        ✕
      </button>
    </div>
  );
};

// ============================================================
// COMPONENTE PARA LISTAR TRATAMIENTOS DE UN DIENTE
// ============================================================
const TratamientosDiente = ({ toothNumber, tratamientos, tratamientosAPI, onUpdate, onDelete }) => {
  const tratamientosDiente = tratamientos.filter(t => t.tooth === toothNumber && t.estado !== 'cancelado');

  if (tratamientosDiente.length === 0) {
    return <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sin tratamientos</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
      {tratamientosDiente.map((t, idx) => {
        const estadoInfo = ESTADOS_TRATAMIENTO.find(e => e.value === t.estado) || ESTADOS_TRATAMIENTO[0];
        return (
          <div
            key={t.id || idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              background: estadoInfo.bg,
              borderRadius: '6px',
              border: `1px solid ${estadoInfo.border}`,
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ flex: 1, fontWeight: 500, color: '#0f172a' }}>{t.servicio}</span>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: estadoInfo.color,
              padding: '1px 8px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.5)'
            }}>
              ${t.price || 0}
            </span>
            <select
              value={t.estado || 'pendiente'}
              onChange={(e) => onUpdate(t.id || idx, { ...t, estado: e.target.value })}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: `1px solid ${estadoInfo.border}`,
                fontSize: '10px',
                background: '#fff',
                color: estadoInfo.color,
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {ESTADOS_TRATAMIENTO.map((e) => (
                <option key={e.value} value={e.value} style={{ color: e.color }}>
                  {e.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => onDelete(t.id || idx)}
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              <FiTrash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function OdontogramaSeccion({
  odontogramPhases = {},
  setOdontogramPhases,
  tratamientos = [],
  onAddPresupuesto,
  pacienteNombre = 'Paciente',
  pacienteId = null,
  onSaveOdontograma,
  consultaId = null,
}) {
  // ============================================================
  // ESTADOS
  // ============================================================
  const [activeSubTab, setActiveSubTab] = useState('inicial');
  const [modoMultiple, setModoMultiple] = useState(false);
  const [selectedMultiple, setSelectedMultiple] = useState([]);
  const [hallazgoMultiple, setHallazgoMultiple] = useState('caries');
  const [notaMultiple, setNotaMultiple] = useState('');
  const [surfacesMultiple, setSurfacesMultiple] = useState(['oclusal']);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState({ inicial: false, evolucion: false, alta: false });
  const [tratamientosAPI, setTratamientosAPI] = useState([]);
  const [loadingTratamientos, setLoadingTratamientos] = useState(false);
  const [showPlanTratamiento, setShowPlanTratamiento] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generandoAlta, setGenerandoAlta] = useState(false);
  const [evoluciones, setEvoluciones] = useState([]);
  const [loadingEvoluciones, setLoadingEvoluciones] = useState(false);
  const [snapshotGuardado, setSnapshotGuardado] = useState(false);

  // ============================================================
  // 🔥 MEMO: Obtener datos de la fase actual (PRIMERO)
  // ============================================================
  const phaseState = useMemo(() => {
    const currentPhase = odontogramPhases?.[activeSubTab] || {};
    return clonePhase(currentPhase);
  }, [activeSubTab, odontogramPhases]);

  // ============================================================
  // 🔥 planGuardado desde BD (DESPUÉS de phaseState)
  // ============================================================
  const planGuardado = useMemo(() => {
    return !!(
      odontogramPhases?.evolucion?.planId ||
      odontogramPhases?.evolucion?.plan_tratamiento?.length > 0 ||
      phaseState?.planId
    );
  }, [odontogramPhases, phaseState]);

  const currentTeeth = phaseState.teeth || {};
  const currentPlan = phaseState.planTratamiento || [];
  const isEditable = PHASES.find(p => p.id === activeSubTab)?.editable ?? true;
  const hasPlan = PHASES.find(p => p.id === activeSubTab)?.hasPlan ?? false;
  const isAlta = activeSubTab === 'alta';
  const isInicial = activeSubTab === 'inicial';

  // 🔥 Obtener los dientes iniciales (fuente de verdad)
  const initialTeeth = useMemo(() => {
    return odontogramPhases?.inicial?.teeth || {};
  }, [odontogramPhases]);

  // 🔥 Verificar si todos los tratamientos están completados
  const todosCompletados = useMemo(() => {
    if (currentPlan.length === 0) return false;
    const tratamientosActivos = currentPlan.filter(t => t.estado !== 'cancelado');
    if (tratamientosActivos.length === 0) return false;
    return tratamientosActivos.every(t => t.estado === 'completado');
  }, [currentPlan]);

  // 🔥 Obtener tratamientos pendientes
  const tratamientosPendientes = useMemo(() => {
    return currentPlan.filter(t => t.estado !== 'cancelado' && t.estado !== 'completado');
  }, [currentPlan]);

  // 🔥 MEMO: Para EVOLUCIÓN
  const teethForEvolucion = useMemo(() => {
    if (activeSubTab !== 'evolucion') return currentTeeth;

    const teethEvolucion = structuredClone(initialTeeth);
    
    const evolucionesCompletadas = evoluciones.filter(e => e.estado === 'completado');
    
    evolucionesCompletadas.forEach(ev => {
      const toothNum = ev.tooth_number;
      if (teethEvolucion[toothNum]) {
        const toothData = teethEvolucion[toothNum];
        const surfaces = ev.surfaces || [];
        
        if (ev.resultado_final && surfaces.length > 0) {
          const newCaras = { ...(toothData.caras || {}) };
          surfaces.forEach(surface => {
            newCaras[surface] = ev.resultado_final;
          });
          
          teethEvolucion[toothNum] = {
            ...toothData,
            caras: newCaras,
            _evolucion: {
              diagnostico_inicial: ev.diagnostico_inicial,
              tratamiento: ev.tratamiento_nombre,
              fecha_ejecucion: ev.fecha_ejecucion,
              resultado_final: ev.resultado_final,
              surfaces: surfaces,
              consulta_id: ev.consulta_id
            }
          };
        }
      }
    });
    
    return teethEvolucion;
  }, [activeSubTab, initialTeeth, evoluciones]);

  // 🔥 MEMO: Para ALTA
  const teethForAlta = useMemo(() => {
    if (!isAlta) return currentTeeth;

    const teethAlta = structuredClone(initialTeeth);
    
    const evolucionesCompletadas = evoluciones.filter(e => e.estado === 'completado');
    
    evolucionesCompletadas.forEach(ev => {
      const toothNum = ev.tooth_number;
      if (teethAlta[toothNum]) {
        const toothData = teethAlta[toothNum];
        const surfaces = ev.surfaces || [];
        
        if (ev.resultado_final && surfaces.length > 0) {
          const newCaras = { ...(toothData.caras || {}) };
          surfaces.forEach(surface => {
            newCaras[surface] = ev.resultado_final;
          });
          
          teethAlta[toothNum] = {
            ...toothData,
            caras: newCaras,
            _evolucion: {
              diagnostico_inicial: ev.diagnostico_inicial,
              tratamiento: ev.tratamiento_nombre,
              fecha_ejecucion: ev.fecha_ejecucion,
              resultado_final: ev.resultado_final,
              surfaces: surfaces,
              consulta_id: ev.consulta_id
            }
          };
        }
      }
    });
    
    return teethAlta;
  }, [isAlta, initialTeeth, evoluciones]);

  // Calcular total del presupuesto
  const totalPresupuesto = useMemo(() => {
    return currentPlan
      .filter(t => t.estado !== 'cancelado')
      .reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
  }, [currentPlan]);

  const totalTratamientos = useMemo(() => {
    return currentPlan.filter(t => t.estado !== 'cancelado').length;
  }, [currentPlan]);

  // 🔥 VERIFICAR SI EVOLUCION Y ALTA ESTÁN BLOQUEADAS
  const evolucionBloqueada = !planGuardado && activeSubTab === 'evolucion';
  const altaBloqueada = !todosCompletados && activeSubTab === 'alta';

  // ============================================================
  // 🔥 FUNCIÓN PARA GUARDAR ODONTOGRAMA DE EVOLUCIÓN (SNAPSHOT)
  // ============================================================
  const guardarEvolucionSnapshot = useCallback(async () => {
    if (!pacienteId) return;
    if (snapshotGuardado) return;
    if (Object.keys(teethForEvolucion).length === 0 && currentPlan.length === 0) return;
    
    try {
      const dataToSend = {
        patient_id: pacienteId,
        fase: 'evolucion',
        teeth: JSON.stringify(teethForEvolucion),
        plan_tratamiento: JSON.stringify(currentPlan),
        notas: phaseState.notas || '',
        plan_id: phaseState.planId || null,
        snapshot: true,
      };

      const res = await fetchWithAuth('/api/odontologia/odontogramas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        console.log('✅ [Evolución] Snapshot guardado en BD');
        setSnapshotGuardado(true);
        return data.data;
      }
    } catch (err) {
      console.error('❌ Error guardando evolución snapshot:', err);
    }
    return null;
  }, [pacienteId, teethForEvolucion, currentPlan, phaseState.notas, phaseState.planId, snapshotGuardado]);

  // ============================================================
  // 🔥 FUNCIÓN PARA GUARDAR ALTA
  // ============================================================
  const guardarAlta = useCallback(async () => {
    if (!pacienteId) return null;
    
    if (tratamientosPendientes.length > 0) {
      alert(`No se puede generar Alta. Hay ${tratamientosPendientes.length} tratamientos pendientes.`);
      return null;
    }

    if (!todosCompletados) {
      alert('No se puede generar Alta. Hay tratamientos no completados.');
      return null;
    }

    setGenerandoAlta(true);
    setSaveMessage(null);

    try {
      const dataToSend = {
        patient_id: pacienteId,
        fase: 'alta',
        teeth: JSON.stringify(teethForAlta),
        plan_tratamiento: JSON.stringify(currentPlan),
        notas: `Alta generada el ${new Date().toLocaleDateString()} - Todos los tratamientos completados`,
        plan_id: phaseState.planId || null,
      };

      const res = await fetchWithAuth('/api/odontologia/odontogramas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al generar Alta');
      }

      setOdontogramPhases((prev) => ({
        ...prev,
        alta: {
          teeth: teethForAlta,
          planTratamiento: currentPlan,
          notas: `Alta generada el ${new Date().toLocaleDateString()}`,
          lastSavedAt: new Date().toISOString(),
          planId: phaseState.planId,
        },
      }));

      setSaveMessage({ type: 'success', text: '✅ Alta generada exitosamente' });
      setTimeout(() => setSaveMessage(null), 3000);

      setActiveSubTab('alta');

      if (onSaveOdontograma) {
        onSaveOdontograma(data.data);
      }

      return data.data;
    } catch (err) {
      console.error('❌ Error generando Alta:', err);
      setSaveMessage({ type: 'error', text: err.message });
      setTimeout(() => setSaveMessage(null), 3000);
      return null;
    } finally {
      setGenerandoAlta(false);
    }
  }, [pacienteId, teethForAlta, currentPlan, phaseState.planId, tratamientosPendientes, todosCompletados]);

  // ============================================================
  // 🔥 EFECTO: Guardar snapshot de Evolución (solo una vez)
  // ============================================================
  useEffect(() => {
    if (activeSubTab === 'evolucion' && dataLoaded.evolucion && currentPlan.length > 0 && !snapshotGuardado) {
      const timer = setTimeout(() => {
        guardarEvolucionSnapshot();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [activeSubTab, currentPlan, dataLoaded.evolucion, snapshotGuardado]);

  // ============================================================
  // 🔥 CARGAR EVOLUCIONES CLÍNICAS DESDE API
  // ============================================================
  const loadEvoluciones = useCallback(async () => {
    if (!pacienteId) return;

    setLoadingEvoluciones(true);
    try {
      const res = await fetchWithAuth(`/api/odontologia/evoluciones/patient/${pacienteId}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        setEvoluciones(data.data);
        console.log('✅ [Evoluciones] Cargadas:', data.data.length);
      }
    } catch (err) {
      console.error('❌ Error cargando evoluciones:', err);
    } finally {
      setLoadingEvoluciones(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    if (pacienteId) {
      loadEvoluciones();
    }
  }, [pacienteId]);

  // ============================================================
  // 🔥 AUTO-GUARDADO DE INICIAL
  // ============================================================
  const autoSaveTimeout = useRef(null);
  const autoSaveRef = useRef({ isSaving: false });

  const autoSaveOdontograma = useCallback(async () => {
    if (!pacienteId || activeSubTab !== 'inicial') return;
    if (autoSaveRef.current.isSaving) return;
    if (planGuardado) return;
    if (Object.keys(currentTeeth).length === 0) return;
    
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(async () => {
      try {
        autoSaveRef.current.isSaving = true;
        setIsSaving(true);

        const dataToSend = {
          patient_id: pacienteId,
          fase: 'inicial',
          teeth: JSON.stringify(currentTeeth),
          notas: phaseState.notas || '',
        };

        const res = await fetchWithAuth('/api/odontologia/odontogramas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          console.warn('⚠️ [AutoSave] Error al guardar:', data.error);
          return;
        }

        updatePhase((prevPhase) => ({
          ...prevPhase,
          lastSavedAt: new Date().toISOString(),
        }));

        if (onSaveOdontograma) {
          onSaveOdontograma(data.data);
        }

        console.log(`✅ [AutoSave] Inicial guardada`);

      } catch (err) {
        console.error('❌ [AutoSave] Error:', err);
      } finally {
        autoSaveRef.current.isSaving = false;
        setIsSaving(false);
      }
    }, 1500);
  }, [pacienteId, currentTeeth, phaseState.notas, onSaveOdontograma, planGuardado]);

  // ============================================================
  // 🔥 CARGAR DATOS DESDE API
  // ============================================================
  const loadPhaseData = useCallback(async () => {
    if (!pacienteId) {
      setLoadingData(false);
      return;
    }

    if (dataLoaded[activeSubTab]) {
      console.log(`📦 [Odontograma] Usando datos existentes para ${activeSubTab}`);
      return;
    }

    setLoadingData(true);
    try {
      console.log(`📥 [Odontograma] Cargando fase ${activeSubTab} desde API...`);
      const res = await fetchWithAuth(
        `/api/odontologia/odontogramas/patient/${pacienteId}/fase/${activeSubTab}`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const phaseData = {
            teeth: data.data.teeth || {},
            planTratamiento: data.data.plan_tratamiento || [],
            notas: data.data.notas || '',
            lastSavedAt: data.data.last_saved_at || null,
            planId: data.data.plan_id || null,
          };

          if (setOdontogramPhases) {
            setOdontogramPhases((prev) => ({
              ...prev,
              [activeSubTab]: phaseData,
            }));
          }
          console.log(`✅ [Odontograma] Fase ${activeSubTab} cargada:`, {
            dientes: Object.keys(phaseData.teeth).length,
            plan: phaseData.planTratamiento.length
          });
          
          setDataLoaded(prev => ({ ...prev, [activeSubTab]: true }));
          setLoadingData(false);
          return;
        }
      }

      console.log(`ℹ️ [Odontograma] No hay datos para ${activeSubTab}, inicializando vacío`);
      
      if (activeSubTab === 'inicial') {
        if (setOdontogramPhases) {
          setOdontogramPhases((prev) => ({
            ...prev,
            inicial: { teeth: {}, planTratamiento: [], notas: '', lastSavedAt: null, planId: null },
          }));
        }
      } else if (activeSubTab === 'evolucion') {
        const initialData = odontogramPhases?.inicial;
        if (initialData && Object.keys(initialData.teeth || {}).length > 0) {
          console.log('🔄 [Evolución] Usando datos de Inicial');
          setOdontogramPhases((prev) => ({
            ...prev,
            evolucion: {
              ...(prev.evolucion || {}),
              teeth: structuredClone(initialData.teeth),
              planTratamiento: [],
              lastSavedAt: null,
              notas: '',
            },
          }));
          setDataLoaded(prev => ({ ...prev, evolucion: true }));
          setLoadingData(false);
          return;
        }
        
        if (setOdontogramPhases) {
          setOdontogramPhases((prev) => ({
            ...prev,
            evolucion: { teeth: {}, planTratamiento: [], notas: '', lastSavedAt: null, planId: null },
          }));
        }
      } else if (activeSubTab === 'alta') {
        if (setOdontogramPhases) {
          setOdontogramPhases((prev) => ({
            ...prev,
            alta: { teeth: {}, planTratamiento: [], notas: '', lastSavedAt: null, planId: null },
          }));
        }
      }
      
      setDataLoaded(prev => ({ ...prev, [activeSubTab]: true }));
      setLoadingData(false);
    } catch (err) {
      console.error(`❌ [Odontograma] Error cargando fase ${activeSubTab}:`, err);
      if (setOdontogramPhases) {
        setOdontogramPhases((prev) => ({
          ...prev,
          [activeSubTab]: { teeth: {}, planTratamiento: [], notas: '', lastSavedAt: null, planId: null },
        }));
      }
      setDataLoaded(prev => ({ ...prev, [activeSubTab]: true }));
      setLoadingData(false);
    }
  }, [pacienteId, activeSubTab, odontogramPhases, setOdontogramPhases, dataLoaded]);

  useEffect(() => {
    loadPhaseData();
  }, [pacienteId, activeSubTab]);

  // 🔥 Auto-guardar solo para Inicial
  useEffect(() => {
    if (dataLoaded.inicial && activeSubTab === 'inicial' && !planGuardado) {
      autoSaveOdontograma();
    }
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [currentTeeth, activeSubTab]);

  // ============================================================
  // 🔥 Cargar tratamientos desde API
  // ============================================================
  useEffect(() => {
    const loadTratamientos = async () => {
      setLoadingTratamientos(true);
      try {
        const res = await fetchWithAuth('/api/odontologia/tratamientos');
        const data = await res.json();
        let tratamientosData = [];
        if (Array.isArray(data)) {
          tratamientosData = data;
        } else if (data.success && data.data) {
          tratamientosData = Array.isArray(data.data) ? data.data : [];
        }
        setTratamientosAPI(tratamientosData);
      } catch (err) {
        console.error('Error cargando tratamientos:', err);
      } finally {
        setLoadingTratamientos(false);
      }
    };
    loadTratamientos();
  }, []);

  useEffect(() => {
    setSelectedMultiple([]);
    setModoMultiple(false);
    setShowPlanTratamiento(false);
  }, [activeSubTab]);

  // ============================================================
  // 🔥 ACTUALIZAR FASE
  // ============================================================
  const updatePhase = (updater) => {
    if (!setOdontogramPhases) return;

    setOdontogramPhases((prev = {}) => {
      const previousPhase = clonePhase(prev[activeSubTab]);
      const nextPhase = typeof updater === 'function' ? updater(previousPhase) : { ...previousPhase, ...updater };

      return {
        ...prev,
        [activeSubTab]: {
          ...previousPhase,
          ...nextPhase,
          teeth: { ...(nextPhase.teeth || {}) },
          planTratamiento: [...(nextPhase.planTratamiento || [])],
        },
      };
    });
  };

  // ============================================================
  // 🔥 SYNC TOOTH - SOLO HALLASGOS (Fase Inicial)
  // ============================================================
  const syncTooth = (toothNumber, updates) => {
    if (!isEditable) {
      alert('En la fase de Alta no se pueden editar dientes.');
      return;
    }

    if (activeSubTab === 'evolucion') {
      alert('En la fase de Evolución no se pueden editar hallazgos directamente.\nLos cambios se registran a través de las evoluciones clínicas.');
      return;
    }

    if (planGuardado) {
      alert('El plan de tratamiento ya fue guardado. No se pueden modificar los hallazgos iniciales.');
      return;
    }

    updatePhase((prevPhase) => {
      const prevTooth = prevPhase.teeth?.[toothNumber] || {};
      const nextTooth = {
        ...prevTooth,
        ...updates,
      };

      return {
        ...prevPhase,
        teeth: {
          ...(prevPhase.teeth || {}),
          [toothNumber]: nextTooth,
        },
        lastSavedAt: new Date().toISOString(),
      };
    });
  };

  // ============================================================
  // 🔥 GENERAR ID ÚNICO
  // ============================================================
  const generarId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // ============================================================
  // 🔥 REGISTRAR EVOLUCIÓN CLÍNICA
  // ============================================================
  const registrarEvolucion = useCallback(async (toothNumber, tratamientoData) => {
    if (!pacienteId) return;

    const tooth = initialTeeth[toothNumber];
    const caras = tooth?.caras || {};
    
    const surfaces = tratamientoData.surfaces || Object.keys(caras).filter(s => 
      caras[s] && !CONDICIONES_FAVORABLES.includes(caras[s])
    );

    if (surfaces.length === 0) {
      alert('Este diente no tiene hallazgos NO favorables en las superficies seleccionadas.');
      return null;
    }

    try {
      const dataToSend = {
        patient_id: pacienteId,
        plan_id: phaseState.planId || null,
        consulta_id: consultaId || null,
        tooth_number: toothNumber,
        diagnostico_inicial: surfaces.map(s => caras[s]).join(', '),
        surfaces: surfaces,
        tratamiento_id: tratamientoData.servicio_id || null,
        tratamiento_nombre: tratamientoData.servicio,
        estado: 'completado',
        observaciones: tratamientoData.observaciones || '',
        fecha_ejecucion: new Date().toISOString(),
        resultado_final: tratamientoData.resultado || null
      };

      const res = await fetchWithAuth('/api/odontologia/evoluciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await res.json();

      if (data.success) {
        console.log('✅ [Evolución] Registrada:', data.data);
        setEvoluciones(prev => [...prev, data.data]);
        
        if (tratamientoData.tratamientoId) {
          updateTratamientoInterno(tratamientoData.tratamientoId, {
            estado: 'completado',
            fecha_ejecucion: new Date().toISOString()
          });
        }

        setSnapshotGuardado(false);

        alert('✅ Evolución clínica registrada correctamente');
        return data.data;
      } else {
        throw new Error(data.error || 'Error al registrar evolución');
      }
    } catch (err) {
      console.error('❌ Error registrando evolución:', err);
      alert(err.message);
      return null;
    }
  }, [pacienteId, initialTeeth, phaseState.planId, consultaId]);

  // ============================================================
  // 🔥 ACTUALIZAR TRATAMIENTO INTERNO (sin loop)
  // ============================================================
  const updateTratamientoInterno = (tratamientoId, updatedData) => {
    updatePhase((prevPhase) => {
      const newPlan = (prevPhase.planTratamiento || []).map(t =>
        t.id === tratamientoId ? { ...t, ...updatedData } : t
      );

      return {
        ...prevPhase,
        planTratamiento: newPlan,
        lastSavedAt: new Date().toISOString(),
      };
    });
  };

  // ============================================================
  // 🔥 GESTIÓN DE TRATAMIENTOS (EVOLUCIÓN)
  // ============================================================
  const addTratamiento = (toothNumber, tratamientoData) => {
    // 🔥 ELIMINADO: No verificar planGuardado aquí
    // Los tratamientos se agregan ANTES de guardar el plan
    // if (!planGuardado) {
    //   alert('Primero debes guardar el plan de tratamiento.');
    //   return;
    // }

    const tooth = initialTeeth[toothNumber];
    const caras = tooth?.caras || {};
    const tieneHallazgoNoFavorable = Object.values(caras).some(h => h && !CONDICIONES_FAVORABLES.includes(h));

    if (!tieneHallazgoNoFavorable) {
      alert('Este diente no tiene hallazgos NO favorables. No se puede agregar tratamiento.');
      return;
    }

    const existe = currentPlan.some(
      t =>
        t.tooth === toothNumber &&
        t.servicio_id === tratamientoData.servicio_id &&
        t.estado !== 'cancelado'
    );

    if (existe) {
      alert('Este tratamiento ya está agregado para este diente.');
      return;
    }

    if (tratamientoData.estado === 'completado') {
      if (!tratamientoData.surfaces) {
        tratamientoData.surfaces = Object.keys(caras).filter(s => 
          caras[s] && !CONDICIONES_FAVORABLES.includes(caras[s])
        );
      }
      registrarEvolucion(toothNumber, tratamientoData);
      return;
    }

    updatePhase((prevPhase) => {
      const newPlan = [...(prevPhase.planTratamiento || [])];
      const newId = generarId();

      newPlan.push({
        id: newId,
        tooth: toothNumber,
        ...tratamientoData,
        surfaces: tratamientoData.surfaces || Object.keys(caras).filter(s => 
          caras[s] && !CONDICIONES_FAVORABLES.includes(caras[s])
        ),
      });

      return {
        ...prevPhase,
        planTratamiento: newPlan,
        lastSavedAt: new Date().toISOString(),
      };
    });
  };

  const updateTratamiento = (tratamientoId, updatedData) => {
    if (!hasPlan) return;

    const tratamiento = currentPlan.find(t => t.id === tratamientoId);
    if (!tratamiento) return;

    if (updatedData.estado === 'completado' && tratamiento.estado === 'completado') {
      alert('Este tratamiento ya está completado.');
      return;
    }

    if (updatedData.estado === 'completado') {
      const tooth = initialTeeth[tratamiento.tooth];
      const caras = tooth?.caras || {};
      const surfaces = tratamiento.surfaces || Object.keys(caras).filter(s => 
        caras[s] && !CONDICIONES_FAVORABLES.includes(caras[s])
      );
      
      registrarEvolucion(tratamiento.tooth, {
        ...tratamiento,
        ...updatedData,
        surfaces: surfaces,
        tratamientoId: tratamientoId
      });
      return;
    }

    updateTratamientoInterno(tratamientoId, updatedData);
  };

  const deleteTratamiento = (tratamientoId) => {
    if (!hasPlan) return;

    updatePhase((prevPhase) => {
      const newPlan = (prevPhase.planTratamiento || []).filter(t => t.id !== tratamientoId);

      return {
        ...prevPhase,
        planTratamiento: newPlan,
        lastSavedAt: new Date().toISOString(),
      };
    });
  };

  // ============================================================
  // 🔥 HANDLERS PARA SELECCIÓN MÚLTIPLE (solo Inicial)
  // ============================================================
  const handleBatchSurfaceToggle = (surface) => {
    setSurfacesMultiple((prev) => (
      prev.includes(surface) ? prev.filter((item) => item !== surface) : [...prev, surface]
    ));
  };

  const applyMultiple = () => {
    if (!isEditable || activeSubTab !== 'inicial') {
      alert('La selección múltiple solo está disponible en la fase Inicial.');
      return;
    }

    if (planGuardado) {
      alert('El plan de tratamiento ya fue guardado. No se pueden modificar los hallazgos iniciales.');
      return;
    }

    if (selectedMultiple.length === 0) return;

    selectedMultiple.forEach((toothNumber) => {
      syncTooth(toothNumber, {
        condition: hallazgoMultiple,
        surfaces: surfacesMultiple,
        observations: notaMultiple,
        caras: surfacesMultiple.reduce((acc, surf) => {
          acc[surf] = hallazgoMultiple;
          return acc;
        }, {}),
      });
    });

    setSelectedMultiple([]);
    setModoMultiple(false);
  };

  // ============================================================
  // 🔥 GENERAR PRESUPUESTO DESDE PLAN DE TRATAMIENTO
  // ============================================================
  const generateBudget = () => {
    if (!hasPlan) {
      alert('El plan de tratamiento solo está disponible en la fase de Evolución.');
      return;
    }

    const planActivo = currentPlan.filter(t => t.estado !== 'cancelado' && t.estado !== 'completado');

    if (!planActivo.length) {
      alert('No hay tratamientos activos para generar presupuesto');
      return;
    }

    const items = planActivo.map((item) => {
      const tooth = initialTeeth[item.tooth];
      const caras = tooth?.caras || {};
      const surfaces = item.surfaces || [];
      const hallazgos = surfaces.map(s => getConditionLabel(caras[s], [s])).join(', ');

      return {
        service: item.servicio || 'Tratamiento',
        tooth: item.tooth,
        quantity: 1,
        currency: 'US$',
        price: parseFloat(item.price) || 0,
        discount: 0,
        subtotal: parseFloat(item.price) || 0,
        paid: 0,
        pending: parseFloat(item.price) || 0,
        comment: `Diagnóstico: ${hallazgos || 'Sin diagnóstico'} - ${item.observaciones || ''}`,
        estado: item.estado || 'pendiente',
        surfaces: surfaces,
      };
    });

    const total = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const faseLabel = PHASES.find((p) => p.id === activeSubTab)?.label || activeSubTab;

    const budget = {
      name: `${pacienteNombre} - ${faseLabel}`,
      items,
      total: total,
      paid: 0,
      pending: total,
      created_at: new Date().toISOString().slice(0, 10),
      internal_note: `Generado desde ${faseLabel}`,
      patient_note: 'Presupuesto derivado del plan de tratamiento odontológico.',
    };

    onAddPresupuesto?.(budget);
  };

  // ============================================================
  // 🔥 GUARDAR PLAN DE TRATAMIENTO
  // ============================================================
  const savePlanTratamiento = async () => {
    if (!pacienteId) {
      alert('No hay paciente seleccionado');
      return;
    }

    const tratamientosActivos = currentPlan.filter(t => t.estado !== 'cancelado');

    if (tratamientosActivos.length === 0) {
      alert('No hay tratamientos activos para guardar como plan');
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const items = tratamientosActivos.map(t => {
        const tooth = initialTeeth[t.tooth];
        const caras = tooth?.caras || {};
        const surfaces = t.surfaces || Object.keys(caras).filter(s => 
          caras[s] && !CONDICIONES_FAVORABLES.includes(caras[s])
        );
        const hallazgos = surfaces.map(s => getConditionLabel(caras[s], [s])).join(', ');

        return {
          tooth: t.tooth,
          diagnostico: hallazgos || 'Sin diagnóstico',
          tratamiento: t.servicio || 'Tratamiento',
          estado: t.estado || 'pendiente',
          price: t.price || 0,
          observaciones: t.observaciones || '',
          surfaces: surfaces,
        };
      });

      const total = items.reduce((sum, t) => sum + (t.price || 0), 0);

      const dataToSend = {
        patient_id: pacienteId,
        nombre: `Plan de Tratamiento - ${new Date().toLocaleDateString()}`,
        descripcion: 'Plan generado desde el odontograma',
        status: 'active',
        items: items,
        costo_total: total,
        odontograma_data: {
          teeth: initialTeeth,
          planTratamiento: currentPlan
        }
      };

      const res = await fetchWithAuth('/api/odontologia/planes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el plan');
      }

      setSaveMessage({ type: 'success', text: '✅ Plan de tratamiento guardado exitosamente' });
      
      updatePhase((prevPhase) => ({
        ...prevPhase,
        planId: data.data.id,
        lastSavedAt: new Date().toISOString(),
      }));

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('❌ Error guardando plan:', err);
      setSaveMessage({ type: 'error', text: err.message });
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // 🔥 GENERAR ALTA (desde Evolución)
  // ============================================================
  const handleGenerarAlta = async () => {
    if (tratamientosPendientes.length > 0) {
      alert(`No se puede generar Alta. Hay ${tratamientosPendientes.length} tratamientos pendientes.`);
      return;
    }

    if (!todosCompletados) {
      alert('No se puede generar Alta. Hay tratamientos no completados.');
      return;
    }

    const confirmar = window.confirm(
      '⚠️ ¿Estás seguro de generar el Alta?\n\n' +
      'Todos los tratamientos están completados.\n' +
      'Esta acción: \n' +
      '• Guardará el odontograma final\n' +
      '• Cerrará el caso clínico\n' +
      '• El paciente será dado de alta\n\n' +
      '¿Confirmar?'
    );

    if (confirmar) {
      await guardarAlta();
    }
  };

  // ============================================================
  // RENDER PLAN DE TRATAMIENTO (EVOLUCIÓN)
  // ============================================================
  const renderPlanTratamiento = () => {
    if (isInicial) {
      return (
        <div style={{
          marginTop: '16px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          padding: '30px 20px',
          textAlign: 'center'
        }}>
          <FiAlertCircle size={32} style={{ color: '#94a3b8', marginBottom: '12px' }} />
          <h4 style={{ color: '#475569', marginBottom: '8px' }}>Plan de Tratamiento no disponible</h4>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            El plan de tratamiento solo está disponible en la fase <strong>Evolución</strong>.
          </p>
        </div>
      );
    }

    if (isAlta) {
      return (
        <div style={{
          marginTop: '16px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          padding: '30px 20px',
          textAlign: 'center'
        }}>
          <FiCheckCircle size={32} style={{ color: '#10b981', marginBottom: '12px' }} />
          <h4 style={{ color: '#475569', marginBottom: '8px' }}>Fase de Alta</h4>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Todos los tratamientos han sido completados exitosamente.
          </p>
        </div>
      );
    }

    const dientesConHallazgos = Object.keys(initialTeeth).filter(key => {
      const tooth = initialTeeth[key];
      const caras = tooth.caras || {};
      return Object.values(caras).some(h => h && !CONDICIONES_FAVORABLES.includes(h));
    });

    const allCompleted = currentPlan.length > 0 && todosCompletados;

    return (
      <div style={{
        marginTop: '16px',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        maxHeight: '550px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
          borderBottom: '2px solid #e2e8f0',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiList size={20} style={{ color: '#6366f1' }} />
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Plan de Tratamiento
            </h4>
            <span style={{
              background: '#6366f1',
              padding: '2px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#ffffff',
              fontWeight: 600
            }}>
              {totalTratamientos} {totalTratamientos === 1 ? 'tratamiento' : 'tratamientos'}
            </span>
            {allCompleted && (
              <span style={{
                background: '#10b981',
                padding: '2px 12px',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#ffffff',
                fontWeight: 600
              }}>
                ✅ Todos completados
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {allCompleted && (
              <button
                onClick={handleGenerarAlta}
                disabled={generandoAlta}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: generandoAlta ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  opacity: generandoAlta ? 0.7 : 1
                }}
              >
                <FiCheckCircle size={14} /> {generandoAlta ? 'Generando...' : 'Generar Alta'}
              </button>
            )}
            <button
              onClick={savePlanTratamiento}
              disabled={saving || currentPlan.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: (saving || currentPlan.length === 0) ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
                opacity: (saving || currentPlan.length === 0) ? 0.7 : 1
              }}
            >
              <FiSave size={14} /> {saving ? 'Guardando...' : 'Guardar Plan'}
            </button>
            <button
              onClick={() => setShowPlanTratamiento(false)}
              style={{
                padding: '4px 14px',
                fontSize: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#64748b',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
                e.currentTarget.style.borderColor = '#94a3b8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <span>✕</span> Cerrar
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div style={{
          padding: '16px 24px',
          overflowY: 'auto',
          flex: 1,
          background: '#fafbfc'
        }}>
          {dientesConHallazgos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <p style={{ fontSize: '14px', fontWeight: 500 }}>No hay hallazgos NO favorables</p>
              <p style={{ fontSize: '12px' }}>Todos los dientes están en condiciones favorables</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{
                    background: '#f1f5f9',
                    borderBottom: '2px solid #e2e8f0'
                  }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                      Diente
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                      Diagnóstico Inicial
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                      Superficies
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                      Tratamiento
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                      Estado
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dientesConHallazgos.map((toothKey) => {
                    const tooth = initialTeeth[toothKey];
                    const caras = tooth.caras || {};
                    const hallazgos = Object.entries(caras)
                      .filter(([_, h]) => h && !CONDICIONES_FAVORABLES.includes(h))
                      .map(([surface, hallazgo]) => ({
                        surface,
                        hallazgo,
                        label: getConditionLabel(hallazgo, [surface])
                      }));

                    const tratamientosDiente = currentPlan.filter(t => t.tooth === parseInt(toothKey) && t.estado !== 'cancelado');
                    
                    const estadoGeneral = 
                      tratamientosDiente.length === 0
                        ? 'sin_asignar'
                        : tratamientosDiente.every(t => t.estado === 'completado')
                          ? 'completado'
                          : tratamientosDiente.some(t => t.estado === 'en_proceso')
                            ? 'en_proceso'
                            : tratamientosDiente.some(t => t.estado === 'pendiente')
                              ? 'pendiente'
                              : 'sin_asignar';

                    const estadoInfo = ESTADOS_TRATAMIENTO.find(e => e.value === estadoGeneral) || ESTADOS_TRATAMIENTO[0];
                    const isCompletado = estadoGeneral === 'completado';

                    return (
                      <tr key={toothKey} style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: isCompletado ? '#f0fdf4' : (parseInt(toothKey) % 2 === 0 ? '#ffffff' : '#fafbfc'),
                        opacity: isCompletado ? 0.85 : 1
                      }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                          #{toothKey}
                          {isCompletado && (
                            <span style={{
                              marginLeft: '4px',
                              fontSize: '10px',
                              color: '#10b981'
                            }}>
                              ✓
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {hallazgos.map((h, idx) => {
                            const condColor = CONDITION_MAP[h.hallazgo]?.color || '#64748b';
                            return (
                              <span
                                key={idx}
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  background: `${condColor}22`,
                                  color: condColor,
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  marginRight: '4px',
                                  marginBottom: '2px'
                                }}
                              >
                                {h.label}
                              </span>
                            );
                          })}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '11px', color: '#64748b' }}>
                          {hallazgos.map(h => h.surface).join(', ')}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {isCompletado ? (
                            <span style={{ color: '#10b981', fontWeight: 500, fontSize: '12px' }}>
                              {tratamientosDiente.map(t => t.servicio).join(', ')}
                            </span>
                          ) : (
                            <AgregarTratamiento
                              toothNumber={parseInt(toothKey)}
                              tratamientosAPI={tratamientosAPI}
                              onAdd={addTratamiento}
                            />
                          )}
                          {tratamientosDiente.length > 0 && !isCompletado && (
                            <div style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                              {tratamientosDiente.map(t => t.servicio).join(', ')}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: estadoInfo.bg,
                            color: estadoInfo.color,
                            border: `1px solid ${estadoInfo.border}`
                          }}>
                            {estadoInfo.label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {!isCompletado && (
                            <TratamientosDiente
                              toothNumber={parseInt(toothKey)}
                              tratamientos={currentPlan}
                              tratamientosAPI={tratamientosAPI}
                              onUpdate={updateTratamiento}
                              onDelete={deleteTratamiento}
                            />
                          )}
                          {isCompletado && (
                            <span style={{ fontSize: '11px', color: '#10b981' }}>
                              ✅ Completado
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {currentPlan.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 24px',
            background: '#ffffff',
            borderTop: '2px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '12px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  <strong>Total:</strong>
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  {totalTratamientos} {totalTratamientos === 1 ? 'tratamiento' : 'tratamientos'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiDollarSign size={16} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  <strong>Presupuesto:</strong>
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>
                  ${totalPresupuesto.toFixed(2)}
                </span>
              </div>
              {tratamientosPendientes.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#f59e0b' }}>
                    <strong>Pendientes:</strong>
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>
                    {tratamientosPendientes.length}
                  </span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={generateBudget}
                disabled={currentPlan.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: currentPlan.length > 0 ? 'pointer' : 'not-allowed',
                  opacity: currentPlan.length > 0 ? 1 : 0.5,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentPlan.length > 0) {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#94a3b8';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <FiCheck size={16} /> Crear Presupuesto
              </button>
              {todosCompletados && (
                <button
                  onClick={handleGenerarAlta}
                  disabled={generandoAlta}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: generandoAlta ? 'wait' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    opacity: generandoAlta ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!generandoAlta) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
                  }}
                >
                  <FiCheckCircle size={16} /> {generandoAlta ? 'Generando Alta...' : 'Generar Alta'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loadingData) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 20px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <FiRefreshCw size={32} className="spin" style={{ color: '#94a3b8' }} />
        <span style={{ color: '#94a3b8', fontSize: '14px' }}>Cargando odontograma...</span>
      </div>
    );
  }

  // Determinar qué datos mostrar según la fase
  const getDisplayData = () => {
    if (isAlta) {
      if (odontogramPhases?.alta?.teeth && Object.keys(odontogramPhases.alta.teeth).length > 0) {
        return odontogramPhases.alta.teeth;
      }
      return teethForAlta;
    }
    if (activeSubTab === 'evolucion') return teethForEvolucion;
    return currentTeeth;
  };

  const displayData = getDisplayData();
  const esAltaGuardada = isAlta && odontogramPhases?.alta?.teeth && Object.keys(odontogramPhases.alta.teeth).length > 0;

  const showEvolucionBloqueada = activeSubTab === 'evolucion' && !planGuardado;
  const showAltaBloqueada = activeSubTab === 'alta' && !todosCompletados;

  return (
    <div className="odont-atender-section">
      {/* HEADER */}
      <OdontogramaHeader
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        isAlta={isAlta}
        isInicial={isInicial}
        modoMultiple={modoMultiple}
        setModoMultiple={setModoMultiple}
        showPlanTratamiento={showPlanTratamiento}
        setShowPlanTratamiento={setShowPlanTratamiento}
        saving={saving || isSaving}
        saveCurrentPhase={() => {}}
        onSavePlan={savePlanTratamiento}
        planGuardado={planGuardado}
        onGenerarAlta={handleGenerarAlta}
        todosCompletados={todosCompletados}
        generandoAlta={generandoAlta}
      />

      {/* Mensajes de estado */}
      {saveMessage && (
        <div style={{
          padding: '10px 20px',
          background: saveMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          borderBottom: `2px solid ${saveMessage.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: saveMessage.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {saveMessage.type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
          {saveMessage.text}
        </div>
      )}

      {/* STATUS BAR */}
      <OdontogramaStatusBar
        activeSubTab={activeSubTab}
        currentTeeth={displayData}
        isAlta={isAlta || esAltaGuardada}
        isInicial={isInicial}
        phaseState={phaseState}
        isSaving={isSaving}
        planGuardado={planGuardado}
        tratamientosPendientes={tratamientosPendientes.length}
      />

      {/* MENSAJE DE EVOLUCION BLOQUEADA */}
      {showEvolucionBloqueada && (
        <div style={{
          marginTop: '8px',
          padding: '10px 20px',
          background: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #fcd34d',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#92400e'
        }}>
          <FiLock size={18} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            La fase Evolución está bloqueada. Debes guardar un Plan de Tratamiento primero.
          </span>
        </div>
      )}

      {/* MENSAJE DE ALTA BLOQUEADA */}
      {showAltaBloqueada && (
        <div style={{
          marginTop: '8px',
          padding: '10px 20px',
          background: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #fcd34d',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#92400e'
        }}>
          <FiLock size={18} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            La fase Alta está bloqueada. Debes completar todos los tratamientos primero.
            {tratamientosPendientes.length > 0 && ` (${tratamientosPendientes.length} pendientes)`}
          </span>
        </div>
      )}

      {/* SELECCIÓN MÚLTIPLE (solo Inicial) */}
      {modoMultiple && !isAlta && activeSubTab === 'inicial' && !planGuardado && (
        <OdontogramaMultipleSelection
          selectedMultiple={selectedMultiple}
          hallazgoMultiple={hallazgoMultiple}
          setHallazgoMultiple={setHallazgoMultiple}
          notaMultiple={notaMultiple}
          setNotaMultiple={setNotaMultiple}
          surfacesMultiple={surfacesMultiple}
          handleBatchSurfaceToggle={handleBatchSurfaceToggle}
          applyMultiple={applyMultiple}
          setModoMultiple={setModoMultiple}
          setSelectedMultiple={setSelectedMultiple}
        />
      )}

      {/* Mensaje de Inicial bloqueado */}
      {isInicial && planGuardado && (
        <div style={{
          marginTop: '8px',
          padding: '10px 20px',
          background: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #fcd34d',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#92400e'
        }}>
          <FiLock size={18} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>
            La fase Inicial está bloqueada porque ya existe un plan de tratamiento. 
            Para modificar hallazgos, crea una nueva versión del plan.
          </span>
        </div>
      )}

      {/* ODONTOGRAMA */}
      <div style={{ padding: '16px 20px' }}>
        <Odontograma
          odontogramData={displayData}
          onUpdateTooth={syncTooth}
          readOnly={
            isAlta || 
            esAltaGuardada || 
            activeSubTab === 'evolucion' || 
            (isInicial && planGuardado) ||
            showEvolucionBloqueada ||
            showAltaBloqueada
          }
          selectionMode={modoMultiple && !isAlta && activeSubTab === 'inicial' && !planGuardado}
          selectedTeeth={selectedMultiple}
          onSelectionChange={setSelectedMultiple}
        />
      </div>

      {/* PLAN DE TRATAMIENTO */}
      {!isInicial && !isAlta && showPlanTratamiento && renderPlanTratamiento()}
      
      {/* Mensaje de fase Alta */}
      {isAlta && (
        <div style={{
          marginTop: '12px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
          borderRadius: '8px',
          border: '1px solid #6ee7b7',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#065f46'
        }}>
          <FiCheckCircle size={20} style={{ color: '#10b981' }} />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>
            {esAltaGuardada 
              ? '✅ Alta registrada - Caso clínico finalizado' 
              : 'Fase de Alta - Estado final del paciente (diagnóstico inicial + rehabilitaciones)'}
          </span>
        </div>
      )}
    </div>
  );
}