// components/Odontologia/Odontograma/OdontogramaSeccion.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { PHASES } from './OdontogramaConstants';
import OdontogramaHeader from './OdontogramaHeader';
import FaseInicial from './fases/FaseInicial';
import FaseEvolucion from './fases/FaseEvolucion';
import FaseAlta from './fases/FaseAlta';
import { fetchWithAuth } from '../../../config/apiBase_';
import '../../../styles/Odontologia/Odontograma.css';

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
  const [activeSubTab, setActiveSubTab] = useState('inicial');
  const [tratamientosAPI, setTratamientosAPI] = useState([]);
  const [loadingTratamientos, setLoadingTratamientos] = useState(false);

  // ✅ Estado de marcado múltiple (elevado)
  const [modoMultiple, setModoMultiple] = useState(false);
  const [selectedMultiple, setSelectedMultiple] = useState([]);
  const [hallazgoMultiple, setHallazgoMultiple] = useState('caries');
  const [notaMultiple, setNotaMultiple] = useState('');
  const [surfacesMultiple, setSurfacesMultiple] = useState(['oclusal']);

  // ✅ Estado para mostrar/ocultar el plan de tratamiento (elevado)
  const [showPlanTratamiento, setShowPlanTratamiento] = useState(false);

  const hasInitialData = useMemo(() => {
    const initialTeeth = odontogramPhases?.inicial?.teeth || {};
    return Object.values(initialTeeth).some(tooth => {
      if (!tooth) return false;
      const caras = tooth?.caras || {};
      const tieneSuperficial = Object.values(caras).some(cond => cond && cond !== '');
      const condition = tooth?.condition || '';
      const tieneGlobal = condition && condition !== '';
      return tieneSuperficial || tieneGlobal;
    });
  }, [odontogramPhases]);

  const planGuardado = useMemo(() => {
    return !!odontogramPhases?.evolucion?.planId;
  }, [odontogramPhases]);

  const todosCompletados = useMemo(() => {
    const evolucion = odontogramPhases?.evolucion || {};
    const plan = Array.isArray(evolucion.planTratamiento) ? evolucion.planTratamiento : [];
    if (plan.length === 0) return false;
    const activos = plan.filter(t => t.estado !== 'cancelado');
    if (activos.length === 0) return false;
    return activos.every(t => t.estado === 'completado');
  }, [odontogramPhases]);

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
    const handleCambiarFase = (e) => {
      if (e.detail?.fase) {
        setActiveSubTab(e.detail.fase);
      }
    };
    window.addEventListener('cambiarFase', handleCambiarFase);
    return () => window.removeEventListener('cambiarFase', handleCambiarFase);
  }, []);

  const handleBatchSurfaceToggle = (surface) => {
    setSurfacesMultiple((prev) =>
      prev.includes(surface) ? prev.filter((item) => item !== surface) : [...prev, surface]
    );
  };

  const applyMultiple = () => {
    if (selectedMultiple.length === 0) return;
    // La lógica se delega a FaseInicial
  };

  const renderFase = () => {
    switch (activeSubTab) {
      case 'inicial':
        return (
          <FaseInicial
            pacienteId={pacienteId}
            odontogramPhases={odontogramPhases}
            setOdontogramPhases={setOdontogramPhases}
            onSaveOdontograma={onSaveOdontograma}
            planGuardado={false}
            modoMultiple={modoMultiple}
            setModoMultiple={setModoMultiple}
            selectedMultiple={selectedMultiple}
            setSelectedMultiple={setSelectedMultiple}
            hallazgoMultiple={hallazgoMultiple}
            setHallazgoMultiple={setHallazgoMultiple}
            notaMultiple={notaMultiple}
            setNotaMultiple={setNotaMultiple}
            surfacesMultiple={surfacesMultiple}
            setSurfacesMultiple={setSurfacesMultiple}
            handleBatchSurfaceToggle={handleBatchSurfaceToggle}
            applyMultiple={applyMultiple}
          />
        );
      case 'evolucion':
        return (
          <FaseEvolucion
            pacienteId={pacienteId}
            consultaId={consultaId}
            odontogramPhases={odontogramPhases}
            setOdontogramPhases={setOdontogramPhases}
            tratamientosAPI={tratamientosAPI}
            onSaveOdontograma={onSaveOdontograma}
            onAddPresupuesto={onAddPresupuesto}
            pacienteNombre={pacienteNombre}
            showPlanTratamiento={showPlanTratamiento}
            setShowPlanTratamiento={setShowPlanTratamiento}
          />
        );
      case 'alta':
        return (
          <FaseAlta
            pacienteId={pacienteId}
            odontogramPhases={odontogramPhases}
            setOdontogramPhases={setOdontogramPhases}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="odont-atender-section">
      <OdontogramaHeader
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        isAlta={activeSubTab === 'alta'}
        isInicial={activeSubTab === 'inicial'}
        modoMultiple={modoMultiple}
        setModoMultiple={setModoMultiple}
        showPlanTratamiento={showPlanTratamiento}
        setShowPlanTratamiento={setShowPlanTratamiento}
        saving={false}
        planGuardado={planGuardado}
        todosCompletados={todosCompletados}
        generandoAlta={false}
        hasInitialData={hasInitialData}
        onGenerarAlta={() => {}} // Aquí puedes pasar la función si la tienes en el nivel superior
      />
      {renderFase()}
    </div>
  );
}