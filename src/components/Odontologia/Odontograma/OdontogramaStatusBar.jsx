// components/Odontologia/Odontograma/OdontogramaStatusBar.jsx
import React from 'react';
import { FiLock, FiCheckCircle, FiEdit, FiEdit2, FiTool, FiClock, FiRefreshCw } from 'react-icons/fi';
import { PHASES } from './OdontogramaConstants';

export default function OdontogramaStatusBar({
  activeSubTab,
  currentTeeth,
  isAlta,
  isInicial,
  phaseState,
  isSaving = false,
  planGuardado = false,
  tratamientosPendientes = 0,
}) {
  const dientesCount = Object.keys(currentTeeth).length;

  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '16px', 
      padding: '10px 20px',
      background: '#f8fafc',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '13px',
      color: '#64748b',
      alignItems: 'center'
    }}>
      <span><strong>Fase:</strong> {PHASES.find((p) => p.id === activeSubTab)?.label || activeSubTab}</span>
      <span><strong>Dientes:</strong> {dientesCount}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <strong>Estado:</strong> 
        {isAlta ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
            <FiLock size={14} /> Solo lectura
          </span>
        ) : isSaving ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
            <FiRefreshCw size={14} className="spin" /> Guardando...
          </span>
        ) : phaseState.lastSavedAt ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#22c55e' }}>
            <FiCheckCircle size={14} /> Guardado
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
            <FiEdit size={14} /> Sin guardar
          </span>
        )}
      </span>
      {isAlta && (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px',
          color: '#4ade80',
          background: 'rgba(74, 222, 128, 0.1)',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '12px'
        }}>
          <FiCheckCircle size={14} /> Caso finalizado
        </span>
      )}
      {!isAlta && !isInicial && (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px',
          color: '#facc15',
          background: 'rgba(250, 204, 21, 0.1)',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '12px'
        }}>
          <FiEdit2 size={14} /> Plan de tratamiento
          {tratamientosPendientes > 0 && (
            <span style={{ marginLeft: '4px', color: '#f59e0b' }}>
              ({tratamientosPendientes} pendientes)
            </span>
          )}
        </span>
      )}
      {isInicial && !planGuardado && (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px',
          color: '#3b82f6',
          background: 'rgba(59, 130, 246, 0.1)',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '12px'
        }}>
          <FiTool size={14} /> Solo diagnóstico
        </span>
      )}
      {isInicial && planGuardado && (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px',
          color: '#94a3b8',
          background: 'rgba(148, 163, 184, 0.1)',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '12px'
        }}>
          <FiLock size={14} /> Bloqueado
        </span>
      )}
      {phaseState.lastSavedAt && !isSaving && (
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
          <FiClock size={12} style={{ marginRight: '4px' }} />
          Último guardado: {new Date(phaseState.lastSavedAt).toLocaleTimeString()}
        </span>
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