// components/Odontologia/Odontograma/fases/FaseInicial.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiLock, FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Odontograma from '../index';
import OdontogramaMultipleSelection from '../OdontogramaMultipleSelection';
import OdontogramaStatusBar from '../OdontogramaStatusBar';
import { clonePhase, DEFAULT_PHASE } from '../OdontogramaConstants';
import { fetchWithAuth } from '../../../../config/apiBase_';

export default function FaseInicial({
  pacienteId,
  odontogramPhases,
  setOdontogramPhases,
  onSaveOdontograma,
  planGuardado = false,
  modoMultiple,
  setModoMultiple,
  selectedMultiple,
  setSelectedMultiple,
  hallazgoMultiple,
  setHallazgoMultiple,
  notaMultiple,
  setNotaMultiple,
  surfacesMultiple,
  setSurfacesMultiple,
  handleBatchSurfaceToggle,
  applyMultiple,
}) {
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phaseState, setPhaseState] = useState(clonePhase(odontogramPhases?.inicial || DEFAULT_PHASE));
  const [dataLoaded, setDataLoaded] = useState(false);

  const autoSaveTimeout = useRef(null);
  const autoSaveRef = useRef({ isSaving: false });

  useEffect(() => {
    const loadData = async () => {
      if (!pacienteId) return;
      if (dataLoaded) return;

      setLoading(true);
      try {
        const res = await fetchWithAuth(
          `/api/odontologia/odontogramas/patient/${pacienteId}/fase/inicial`
        );

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            const loadedPhase = {
              teeth: data.data.teeth || {},
              planTratamiento: data.data.plan_tratamiento || [],
              notas: data.data.notas || '',
              lastSavedAt: data.data.last_saved_at || null,
              planId: data.data.plan_id || null,
            };
            setPhaseState(loadedPhase);
            setOdontogramPhases((prev) => ({
              ...prev,
              inicial: loadedPhase,
            }));
          }
        }
        setDataLoaded(true);
      } catch (err) {
        console.error('Error cargando fase inicial:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [pacienteId]);

  const autoSave = useCallback(async () => {
    if (!pacienteId) return;
    if (autoSaveRef.current.isSaving) return;
    if (Object.keys(phaseState.teeth).length === 0) return;

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
          teeth: JSON.stringify(phaseState.teeth),
          notas: phaseState.notas || '',
        };

        const res = await fetchWithAuth('/api/odontologia/odontogramas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setPhaseState((prev) => ({
            ...prev,
            lastSavedAt: new Date().toISOString(),
          }));

          setOdontogramPhases((prev) => ({
            ...prev,
            inicial: {
              ...prev.inicial,
              lastSavedAt: new Date().toISOString(),
            },
          }));

          if (onSaveOdontograma) {
            onSaveOdontograma(data.data);
          }
        }
      } catch (err) {
        console.error('Error en auto-save:', err);
      } finally {
        autoSaveRef.current.isSaving = false;
        setIsSaving(false);
      }
    }, 1500);
  }, [pacienteId, phaseState.teeth, phaseState.notas]);

  useEffect(() => {
    if (dataLoaded) {
      autoSave();
    }
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [phaseState.teeth, dataLoaded]);

  const updatePhase = (updater) => {
    setPhaseState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      setOdontogramPhases((phases) => ({
        ...phases,
        inicial: {
          ...next,
          teeth: { ...(next.teeth || {}) },
          planTratamiento: Array.isArray(next.planTratamiento) ? [...next.planTratamiento] : [],
        },
      }));
      return next;
    });
  };

  const syncTooth = (toothNumber, updates) => {
    // ✅ Siempre editable, sin bloqueo por planGuardado
    updatePhase((prev) => {
      const prevTooth = prev.teeth?.[toothNumber] || {};
      return {
        ...prev,
        teeth: {
          ...(prev.teeth || {}),
          [toothNumber]: { ...prevTooth, ...updates },
        },
        lastSavedAt: new Date().toISOString(),
      };
    });
  };

  const handleApplyMultiple = () => {
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
        <FiRefreshCw size={32} className="spin" style={{ color: '#94a3b8' }} />
      </div>
    );
  }

  return (
    <div>
      <OdontogramaStatusBar
        activeSubTab="inicial"
        currentTeeth={phaseState.teeth}
        isInicial={true}
        phaseState={phaseState}
        isSaving={isSaving}
        planGuardado={false}
        tratamientosPendientes={0}
      />

      {modoMultiple && (
        <OdontogramaMultipleSelection
          selectedMultiple={selectedMultiple}
          hallazgoMultiple={hallazgoMultiple}
          setHallazgoMultiple={setHallazgoMultiple}
          notaMultiple={notaMultiple}
          setNotaMultiple={setNotaMultiple}
          surfacesMultiple={surfacesMultiple}
          handleBatchSurfaceToggle={handleBatchSurfaceToggle}
          applyMultiple={handleApplyMultiple}
          setModoMultiple={setModoMultiple}
          setSelectedMultiple={setSelectedMultiple}
        />
      )}

      <div style={{ padding: '16px 20px' }}>
        <Odontograma
          odontogramData={phaseState.teeth}
          onUpdateTooth={syncTooth}
          readOnly={false}
          selectionMode={modoMultiple}
          selectedTeeth={selectedMultiple}
          onSelectionChange={setSelectedMultiple}
        />
      </div>

      <div style={{
        marginTop: '12px',
        padding: '12px 20px',
        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
        borderRadius: '8px',
        border: '1px solid #93c5fd',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#1e40af'
      }}>
        <FiCheckCircle size={20} style={{ color: '#3b82f6' }} />
        <span style={{ fontSize: '14px', fontWeight: 500 }}>
          Fase de Diagnóstico Inicial - Registra hallazgos (caries, fracturas, etc.)
          {planGuardado && ' (Puedes seguir agregando hallazgos aunque exista un plan)'}
        </span>
      </div>

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