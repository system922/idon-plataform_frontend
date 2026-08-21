// components/Odontologia/Odontograma/fases/FaseEvolucion.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiLock, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiEdit2, FiSave } from 'react-icons/fi';
import Odontograma from '../index';
import { CONDITION_MAP } from '../index';
import OdontogramaPlanTratamiento from '../OdontogramaPlanTratamiento';
import OdontogramaStatusBar from '../OdontogramaStatusBar';
import {
  clonePhase,
  DEFAULT_PHASE,
  CONDICIONES_FAVORABLES,
  HALLAZGOS_GLOBALES,
  getConditionLabel,
  obtenerHallazgosNoFavorables,
  tieneHallazgosNoFavorables,
} from '../OdontogramaConstants';
import { fetchWithAuth } from '../../../../config/apiBase';

const generarIdTemp = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

export default function FaseEvolucion({
  pacienteId,
  consultaId,
  odontogramPhases,
  setOdontogramPhases,
  tratamientosAPI,
  onSaveOdontograma,
  onAddPresupuesto,
  pacienteNombre = 'Paciente',
  showPlanTratamiento,       // ✅ Recibido desde el padre
  setShowPlanTratamiento,   // ✅ Recibido desde el padre
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generandoAlta, setGenerandoAlta] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [evoluciones, setEvoluciones] = useState([]);
  const [phaseState, setPhaseState] = useState(clonePhase(odontogramPhases?.evolucion || DEFAULT_PHASE));
  const [dataLoaded, setDataLoaded] = useState(false);
  const [planId, setPlanId] = useState(odontogramPhases?.evolucion?.planId || null);

  const initialTeeth = useMemo(() => odontogramPhases?.inicial?.teeth || {}, [odontogramPhases]);

  // ✅ planGuardado = existe planId
  const planGuardado = useMemo(() => !!planId, [planId]);

  // ✅ Calcular total de tratamientos (no cancelados)
  const totalTratamientos = useMemo(() => {
    return (phaseState.planTratamiento || []).filter(t => t.estado !== 'cancelado').length;
  }, [phaseState.planTratamiento]);

  const tratamientosPendientes = useMemo(() => {
    return phaseState.planTratamiento?.filter(
      t => t.estado !== 'cancelado' && t.estado !== 'completado'
    ) || [];
  }, [phaseState.planTratamiento]);

  const todosCompletados = useMemo(() => {
    const plan = phaseState.planTratamiento || [];
    if (plan.length === 0) return false;
    const activos = plan.filter(t => t.estado !== 'cancelado');
    if (activos.length === 0) return false;
    return activos.every(t => t.estado === 'completado');
  }, [phaseState.planTratamiento]);

  const totalPresupuesto = useMemo(() => {
    return (phaseState.planTratamiento || [])
      .filter(t => t.estado !== 'cancelado')
      .reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
  }, [phaseState.planTratamiento]);

  const hallazgosNoFavorables = useMemo(() => obtenerHallazgosNoFavorables(initialTeeth), [initialTeeth]);
  const tieneHallazgos = hallazgosNoFavorables.length > 0;

  // ============================================================
  // 🔥 CARGAR PLAN DE TRATAMIENTO DESDE ENDPOINT
  // ============================================================
  const loadPlanData = useCallback(async () => {
    if (!pacienteId) return null;

    try {
      console.log('📥 Cargando plan de tratamiento para paciente:', pacienteId);
      const res = await fetchWithAuth(
        `/api/odontologia/planes-tratamiento/patient/${pacienteId}`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          // Tomar el primer plan (el más reciente) - ordenado por created_at DESC
          const plan = data.data[0];
          console.log('📦 Plan encontrado:', plan);

          // ✅ Mapear items del plan a tratamientos (estructura esperada por el frontend)
          const items = plan.items || [];
          const tratamientosMapeados = items.map((item, index) => ({
            id: item.id || `plan-${plan.id}-${index}`,
            tooth: item.tooth,
            servicio: item.tratamiento || item.tratamiento_nombre || 'Tratamiento',
            servicio_id: item.servicio_id || null,
            price: parseFloat(item.price) || 0,
            estado: item.estado || 'pendiente',
            surfaces: item.surfaces || [],
            observaciones: item.observaciones || '',
            diagnostico: item.diagnostico || '',
          }));

          console.log('✅ Tratamientos mapeados:', tratamientosMapeados);

          // ✅ Actualizar estado con los datos del plan
          const loadedPhase = {
            teeth: plan.odontograma_data?.teeth || {},
            planTratamiento: tratamientosMapeados,
            notas: '',
            lastSavedAt: plan.updated_at || new Date().toISOString(),
            planId: plan.id,
          };

          setPlanId(plan.id);
          setPhaseState(loadedPhase);
          setOdontogramPhases((prev) => ({
            ...prev,
            evolucion: loadedPhase,
          }));

          return plan;
        } else {
          console.log('ℹ️ No hay plan guardado para este paciente');
          // Inicializar con estado vacío
          const emptyPhase = {
            teeth: {},
            planTratamiento: [],
            notas: '',
            lastSavedAt: null,
            planId: null,
          };
          setPlanId(null);
          setPhaseState(emptyPhase);
          setOdontogramPhases((prev) => ({
            ...prev,
            evolucion: emptyPhase,
          }));
          return null;
        }
      }
      return null;
    } catch (err) {
      console.error('❌ Error cargando plan:', err);
      return null;
    }
  }, [pacienteId]);

  // ============================================================
  // CARGAR DATOS DE EVOLUCIÓN (odontograma visual)
  // ============================================================
  useEffect(() => {
    const loadData = async () => {
      if (!pacienteId) return;
      if (dataLoaded) return;

      setLoading(true);
      try {
        // 1. Cargar el plan de tratamiento (esto actualiza phaseState.planTratamiento)
        await loadPlanData();

        // 2. Cargar el odontograma de evolución (para visualización)
        const res = await fetchWithAuth(
          `/api/odontologia/odontogramas/patient/${pacienteId}/fase/evolucion`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            // Solo actualizar teeth si no vienen del plan
            const currentTeeth = phaseState.teeth || {};
            if (Object.keys(currentTeeth).length === 0 && data.data.teeth) {
              setPhaseState((prev) => ({
                ...prev,
                teeth: data.data.teeth || {},
                notas: data.data.notas || '',
                lastSavedAt: data.data.last_saved_at || null,
              }));
            }
          }
        }

        // 3. Cargar evoluciones clínicas
        const resEvo = await fetchWithAuth(
          `/api/odontologia/evoluciones/patient/${pacienteId}`
        );
        if (resEvo.ok) {
          const dataEvo = await resEvo.json();
          if (dataEvo.success && dataEvo.data) {
            setEvoluciones(dataEvo.data);
          }
        }

        setDataLoaded(true);
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [pacienteId]);

  // ============================================================
  // CONSTRUIR ODONTOGRAMA DE EVOLUCIÓN (visual)
  // ============================================================
  const teethForEvolucion = useMemo(() => {
    const teethEvo = structuredClone(initialTeeth);
    const evolucionesCompletadas = evoluciones.filter(e => e.estado === 'completado');

    evolucionesCompletadas.forEach(ev => {
      const toothNum = ev.tooth_number;
      if (teethEvo[toothNum]) {
        const toothData = teethEvo[toothNum];
        const surfaces = ev.surfaces || [];
        if (ev.resultado_final && surfaces.length > 0) {
          const newCaras = { ...(toothData.caras || {}) };
          surfaces.forEach(surface => {
            newCaras[surface] = ev.resultado_final;
          });
          teethEvo[toothNum] = {
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
    return teethEvo;
  }, [initialTeeth, evoluciones]);

  // ============================================================
  // ACTUALIZAR FASE
  // ============================================================
  const updatePhase = (updater) => {
    setPhaseState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      setOdontogramPhases((phases) => ({
        ...phases,
        evolucion: {
          ...next,
          teeth: { ...(next.teeth || {}) },
          planTratamiento: Array.isArray(next.planTratamiento) ? [...next.planTratamiento] : [],
        },
      }));
      return next;
    });
  };

  const updateTratamientoInterno = (tratamientoId, updatedData) => {
    updatePhase((prev) => {
      const newPlan = (prev.planTratamiento || []).map(t =>
        t.id === tratamientoId ? { ...t, ...updatedData } : t
      );
      return {
        ...prev,
        planTratamiento: newPlan,
        lastSavedAt: new Date().toISOString(),
      };
    });
  };

  // ============================================================
  // REGISTRAR EVOLUCIÓN CLÍNICA
  // ============================================================
  const registrarEvolucion = useCallback(async (toothNumber, tratamientoData) => {
    if (!pacienteId) return null;

    const tooth = initialTeeth[toothNumber];
    const caras = tooth?.caras || {};
    const condition = tooth?.condition || '';
    
    let surfaces = tratamientoData.surfaces || [];
    if (surfaces.length === 0 && HALLAZGOS_GLOBALES.includes(condition)) {
      surfaces = ['global'];
    }
    if (surfaces.length === 0) {
      surfaces = Object.keys(caras).filter(s => 
        caras[s] && !CONDICIONES_FAVORABLES.includes(caras[s])
      );
    }
    if (surfaces.length === 0 && !HALLAZGOS_GLOBALES.includes(condition)) {
      alert('Este diente no tiene hallazgos NO favorables.');
      return null;
    }

    try {
      const dataToSend = {
        patient_id: pacienteId,
        plan_id: planId || null,
        consulta_id: consultaId || null,
        tooth_number: toothNumber,
        diagnostico_inicial: HALLAZGOS_GLOBALES.includes(condition) 
          ? getConditionLabel(condition, [])
          : surfaces.map(s => caras[s] || 'sin_diagnostico').join(', '),
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
        setEvoluciones(prev => [...prev, data.data]);
        if (tratamientoData.tratamientoId) {
          updateTratamientoInterno(tratamientoData.tratamientoId, {
            estado: 'completado',
            fecha_ejecucion: new Date().toISOString()
          });
        }
        setDataLoaded(false);
        return data.data;
      } else {
        throw new Error(data.error || 'Error al registrar evolución');
      }
    } catch (err) {
      console.error('Error registrando evolución:', err);
      alert(err.message);
      return null;
    }
  }, [pacienteId, initialTeeth, planId, consultaId]);

  // ============================================================
  // AGREGAR TRATAMIENTO
  // ============================================================
  const addTratamiento = (toothNumber, tratamientoData) => {
    const tooth = initialTeeth[toothNumber];
    if (!tieneHallazgosNoFavorables(tooth)) {
      alert('Este diente no tiene hallazgos NO favorables.');
      return;
    }

    const existe = (phaseState.planTratamiento || []).some(
      t => t.tooth === toothNumber &&
           t.servicio_id === tratamientoData.servicio_id &&
           t.estado !== 'cancelado'
    );
    if (existe) {
      alert('Este tratamiento ya está agregado.');
      return;
    }

    if (tratamientoData.estado === 'completado' && planGuardado) {
      registrarEvolucion(toothNumber, tratamientoData);
      return;
    }

    updatePhase((prev) => {
      const newPlan = [...(prev.planTratamiento || [])];
      const caras = tooth?.caras || {};
      const condition = tooth?.condition || '';
      let surfaces = tratamientoData.surfaces || [];
      if (surfaces.length === 0 && !HALLAZGOS_GLOBALES.includes(condition)) {
        surfaces = Object.keys(caras).filter(s =>
          caras[s] && !CONDICIONES_FAVORABLES.includes(caras[s])
        );
      }
      if (surfaces.length === 0 && HALLAZGOS_GLOBALES.includes(condition)) {
        surfaces = ['global'];
      }

      newPlan.push({
        id: generarIdTemp(),
        tooth: toothNumber,
        ...tratamientoData,
        estado: tratamientoData.estado || 'pendiente',
        surfaces: surfaces,
      });
      return {
        ...prev,
        planTratamiento: newPlan,
        lastSavedAt: new Date().toISOString(),
      };
    });
  };

  // ============================================================
  // ACTUALIZAR TRATAMIENTO
  // ============================================================
  const updateTratamiento = (tratamientoId, updatedData) => {
    const tratamiento = (phaseState.planTratamiento || []).find(t => t.id === tratamientoId);
    if (!tratamiento) return;

    if (updatedData.estado === 'completado' && tratamiento.estado === 'completado') {
      alert('Este tratamiento ya está completado.');
      return;
    }

    if (updatedData.estado === 'completado' && planGuardado) {
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

  // ============================================================
  // COMPLETAR TRATAMIENTO
  // ============================================================
  const completarTratamiento = (tratamientoId, tratamiento) => {
    if (!planGuardado) {
      alert('⚠️ Debes guardar el plan de tratamiento primero.');
      return;
    }
    if (!tratamiento) return;

    const tooth = initialTeeth[tratamiento.tooth];
    const caras = tooth?.caras || {};
    const condition = tooth?.condition || '';
    
    let surfaces = tratamiento.surfaces || [];
    if (surfaces.length === 0 && !HALLAZGOS_GLOBALES.includes(condition)) {
      surfaces = Object.keys(caras).filter(s =>
        caras[s] && !CONDICIONES_FAVORABLES.includes(caras[s])
      );
    }
    if (surfaces.length === 0 && HALLAZGOS_GLOBALES.includes(condition)) {
      surfaces = ['global'];
    }
    if (surfaces.length === 0 && !HALLAZGOS_GLOBALES.includes(condition)) {
      alert('Este diente no tiene hallazgos NO favorables.');
      return;
    }

    const confirmar = window.confirm(
      `¿Estás seguro de completar el tratamiento "${tratamiento.servicio}" para el diente #${tratamiento.tooth}?`
    );
    if (confirmar) {
      registrarEvolucion(tratamiento.tooth, {
        ...tratamiento,
        estado: 'completado',
        surfaces: surfaces,
        tratamientoId: tratamientoId,
        resultado: tratamiento.resultado || null
      });
    }
  };

  // ============================================================
  // ELIMINAR TRATAMIENTO
  // ============================================================
  const deleteTratamiento = (tratamientoId) => {
    const tratamiento = (phaseState.planTratamiento || []).find(t => t.id === tratamientoId);
    if (!tratamiento) return;
    if (tratamiento.estado === 'completado') {
      alert('No se puede eliminar un tratamiento ya completado.');
      return;
    }
    updatePhase((prev) => {
      const newPlan = (prev.planTratamiento || []).filter(t => t.id !== tratamientoId);
      return {
        ...prev,
        planTratamiento: newPlan,
        lastSavedAt: new Date().toISOString(),
      };
    });
  };

  // ============================================================
  // ✅ GUARDAR PLAN (POST o PUT según corresponda)
  // ============================================================
  const savePlanTratamiento = async () => {
    if (!pacienteId) {
      alert('No hay paciente seleccionado');
      return;
    }

    const tratamientosActivos = (phaseState.planTratamiento || []).filter(t => t.estado !== 'cancelado');
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
        const condition = tooth?.condition || '';
        const surfaces = Array.isArray(t.surfaces) ? t.surfaces : [];
        
        let diagnostico = '';
        if (HALLAZGOS_GLOBALES.includes(condition)) {
          diagnostico = getConditionLabel(condition, []);
        } else {
          diagnostico = surfaces.map(s => {
            const label = caras[s] ? (CONDITION_MAP[caras[s]]?.label || caras[s]) : 'Sin diagnóstico';
            return `${label} (${s})`;
          }).join(', ');
        }

        return {
          tooth: t.tooth,
          diagnostico: diagnostico || 'Sin diagnóstico',
          tratamiento: t.servicio || 'Tratamiento',
          estado: t.estado || 'pendiente',
          price: parseFloat(t.price) || 0,
          observaciones: (t.observaciones || '').toString(),
          surfaces: surfaces,
        };
      });

      const total = items.reduce((sum, t) => sum + (t.price || 0), 0);

      const planName = `Plan de Tratamiento - ${pacienteNombre || 'Paciente'} - ${new Date().toISOString().slice(0, 10)}`;

      const dataToSend = {
        patient_id: pacienteId,
        name: planName,
        description: 'Plan generado desde el odontograma',
        fase: 'evolucion',
        status: 'active',
        costo_total: total,
        items: items,
        odontograma_data: {
          teeth: initialTeeth,
          planTratamiento: tratamientosActivos
        }
      };

      let url = '/api/odontologia/planes-tratamiento';
      let method = 'POST';

      // ✅ Si ya tiene planId, actualizar (PUT)
      if (planId) {
        url = `/api/odontologia/planes-tratamiento/${planId}`;
        method = 'PUT';
        delete dataToSend.patient_id; // No enviamos patient_id en PUT
      }

      console.log(`📤 [Plan] ${method} ${url}`, JSON.stringify(dataToSend, null, 2));

      const res = await fetchWithAuth(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await res.json();
      console.log('📥 [Plan] Respuesta:', data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el plan');
      }

      const newPlanId = data.data?.id || planId;
      if (!newPlanId) throw new Error('No se recibió ID del plan');

      setPlanId(newPlanId);

      setSaveMessage({ type: 'success', text: '✅ Plan de tratamiento guardado exitosamente' });

      updatePhase((prev) => ({
        ...prev,
        planId: newPlanId,
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
  // GENERAR PRESUPUESTO (eliminado o mantenido según decidas)
  // ============================================================
  // [La función generateBudget se mantiene igual, pero no se usa en el botón]

  // ============================================================
  // GENERAR ALTA
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
      'Esta acción:\n' +
      '• Guardará el odontograma final\n' +
      '• Cerrará el caso clínico\n' +
      '• El paciente será dado de alta\n\n' +
      '¿Confirmar?'
    );
    if (confirmar) {
      await guardarAlta();
    }
  };

  const guardarAlta = useCallback(async () => {
    if (!pacienteId) return null;

    setGenerandoAlta(true);
    setSaveMessage(null);

    try {
      const dataToSend = {
        patient_id: pacienteId,
        fase: 'alta',
        teeth: JSON.stringify(teethForEvolucion),
        plan_tratamiento: JSON.stringify(phaseState.planTratamiento),
        notas: `Alta generada el ${new Date().toLocaleDateString()} - Todos los tratamientos completados`,
        plan_id: planId || null,
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
          teeth: teethForEvolucion,
          planTratamiento: phaseState.planTratamiento,
          notas: `Alta generada el ${new Date().toLocaleDateString()}`,
          lastSavedAt: new Date().toISOString(),
          planId: planId,
        },
      }));

      setSaveMessage({ type: 'success', text: '✅ Alta generada exitosamente' });
      setTimeout(() => setSaveMessage(null), 3000);

      if (onSaveOdontograma) onSaveOdontograma(data.data);
      window.dispatchEvent(new CustomEvent('cambiarFase', { detail: { fase: 'alta' } }));

      return data.data;
    } catch (err) {
      console.error('Error generando Alta:', err);
      setSaveMessage({ type: 'error', text: err.message });
      setTimeout(() => setSaveMessage(null), 3000);
      return null;
    } finally {
      setGenerandoAlta(false);
    }
  }, [pacienteId, teethForEvolucion, phaseState.planTratamiento, planId]);

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
        <FiRefreshCw size={32} className="spin" style={{ color: '#94a3b8' }} />
      </div>
    );
  }

  if (!tieneHallazgos && !planGuardado) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}>
        <FiCheckCircle size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
        <h3 style={{ color: '#475569' }}>No hay hallazgos NO favorables</h3>
        <p style={{ color: '#94a3b8' }}>Todos los dientes están en condiciones favorables.</p>
      </div>
    );
  }

  return (
    <div>
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

      <OdontogramaStatusBar
        activeSubTab="evolucion"
        currentTeeth={teethForEvolucion}
        phaseState={phaseState}
        isSaving={saving}
        planGuardado={planGuardado}
        tratamientosPendientes={tratamientosPendientes.length}
      />

      <div style={{
        marginTop: '8px',
        padding: '8px 16px',
        background: planGuardado ? '#ecfdf5' : '#fef3c7',
        borderRadius: '6px',
        border: `1px solid ${planGuardado ? '#6ee7b7' : '#fcd34d'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: planGuardado ? '#065f46' : '#92400e'
      }}>
        {planGuardado ? (
          <>
            <FiCheckCircle size={16} style={{ color: '#10b981' }} />
            <span>✅ Plan guardado - {totalTratamientos} tratamientos asignados</span>
          </>
        ) : (
          <>
            <FiEdit2 size={16} style={{ color: '#f59e0b' }} />
            <span>⚠️ Plan sin guardar - Asigna tratamientos y presiona <strong>"Guardar Plan"</strong></span>
          </>
        )}
      </div>

      <div style={{ padding: '16px 20px' }}>
        <Odontograma
          odontogramData={teethForEvolucion}
          onUpdateTooth={() => {}}
          readOnly={true}
        />
      </div>

      {showPlanTratamiento && (
        <OdontogramaPlanTratamiento
          activeSubTab="evolucion"
          initialTeeth={initialTeeth}
          currentPlan={phaseState.planTratamiento || []}
          tratamientosAPI={tratamientosAPI}
          totalTratamientos={totalTratamientos}
          totalPresupuesto={totalPresupuesto}
          tratamientosPendientes={tratamientosPendientes}
          todosCompletados={todosCompletados}
          saving={saving}
          generandoAlta={generandoAlta}
          planGuardado={planGuardado}
          onAddTratamiento={addTratamiento}
          onUpdateTratamiento={updateTratamiento}
          onDeleteTratamiento={deleteTratamiento}
          onCompletarTratamiento={completarTratamiento}
          onSavePlan={savePlanTratamiento}
          onGenerarAlta={handleGenerarAlta}
          onClosePlan={() => setShowPlanTratamiento(false)}
        />
      )}
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}