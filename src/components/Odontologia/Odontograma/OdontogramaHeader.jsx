// components/Odontologia/Odontograma/OdontogramaHeader.jsx
import React from 'react';
import { FiTool, FiLayers, FiList, FiCheckCircle, FiLock } from 'react-icons/fi';
import { PHASES } from './OdontogramaConstants';

export default function OdontogramaHeader({
  activeSubTab,
  setActiveSubTab,
  isAlta,
  isInicial,
  modoMultiple,
  setModoMultiple,
  showPlanTratamiento,
  setShowPlanTratamiento,
  saving,
  planGuardado,
  todosCompletados,
  generandoAlta,
  hasInitialData = false,
  onGenerarAlta,
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      borderBottom: '1px solid #e2e8f0',
      marginBottom: '0',
      flexWrap: 'wrap',
      gap: '10px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FiTool size={20} style={{ color: '#6366f1' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
          Odontograma
        </h3>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Fases */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          {PHASES.map((phase) => {
            let isDisabled = false;
            let disabledReason = '';

            if (phase.id === 'inicial') {
              isDisabled = false;
            } else if (phase.id === 'evolucion') {
              isDisabled = !hasInitialData;
              disabledReason = !hasInitialData ? 'Registra hallazgos en Inicial primero' : '';
            } else if (phase.id === 'alta') {
              isDisabled = !todosCompletados;
              disabledReason = !todosCompletados ? 'Completa todos los tratamientos primero' : '';
            }

            const isActive = activeSubTab === phase.id;

            return (
              <button
                key={phase.id}
                onClick={() => {
                  if (!isDisabled) {
                    setActiveSubTab(phase.id);
                  }
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 500,
                  background: isActive
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'transparent',
                  color: isActive ? '#fff' : isDisabled ? '#94a3b8' : '#64748b',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isDisabled ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  position: 'relative',
                }}
                title={disabledReason || ''}
              >
                {phase.label}
                {isDisabled && <FiLock size={10} />}
                {isActive && !isDisabled && <FiCheckCircle size={10} />}
              </button>
            );
          })}
        </div>

        {/* ✅ Marcado múltiple - SIEMPRE visible en Inicial */}
        {!isAlta && isInicial && (
          <button
            onClick={() => setModoMultiple(!modoMultiple)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: modoMultiple ? 'linear-gradient(135deg, #10b981, #059669)' : '#f8fafc',
              color: modoMultiple ? '#fff' : '#475569',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FiLayers size={14} /> Marcado múltiple
          </button>
        )}

        {/* Plan de Tratamiento (solo Evolución) */}
        {!isInicial && !isAlta && (
          <button
            onClick={() => setShowPlanTratamiento(!showPlanTratamiento)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: showPlanTratamiento
                ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: showPlanTratamiento
                ? '0 4px 12px rgba(99, 102, 241, 0.25)'
                : '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            <FiList size={14} />
            {showPlanTratamiento ? 'Ocultar Plan' : 'Plan de Tratamiento'}
          </button>
        )}

        {/* Generar Alta (solo Evolución) */}
        {!isInicial && !isAlta && todosCompletados && planGuardado && (
          <button
            onClick={onGenerarAlta}
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

        {/* Indicador de Auto-Guardado (Inicial) */}
        {isInicial && !planGuardado && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '10px',
            color: '#64748b',
            background: '#f1f5f9'
          }}>
            <FiCheckCircle size={12} style={{ color: '#10b981' }} />
            Auto-guardado
          </span>
        )}

        {/* Badge informativo (no bloquea) */}
        {isInicial && planGuardado && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '10px',
            color: '#1e40af',
            background: '#dbeafe',
            border: '1px solid #93c5fd'
          }}>
            <FiCheckCircle size={10} /> Plan existente
          </span>
        )}
      </div>
    </div>
  );
}